import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CHANNELS, MoodleUrlError, TRAILS, parseSiteUrl, type Channel, type Trail } from "@falkenslab/moodle-driver";
import { z } from "zod";
import { PROFILES, STUDENT_DATA_LEVELS, parseScopes, type Scope, type StudentDataLevel } from "./tools/scopes.js";

// Channels and trails are the driver's (its ADR-001 and ADR-005); the server only picks among them.
export { CHANNELS, SYSTEM_CHANNELS, TRAILS, type Channel, type Trail } from "@falkenslab/moodle-driver";

/** Where a setting's value came from: the `configure` tool wins over arguments, which win over the environment (ADR-009). */
export type SettingSource = "configure" | "argument" | "environment" | "default";

/**
 * The server's settings, one object shared by every tool and the browser: `configure` changes it
 * in place, in memory only (ADR-009).
 */
export interface Config {
  /** The site's base URL, ending in `/` so relative paths resolve under it; `undefined` until configured. */
  moodleUrl: string | undefined;
  /** The browser's persistent profile, absolute (ADR-002). */
  profileDir: string;
  /** The browser to launch; `undefined` tries the system's, then the downloaded Chromium. */
  channel: Channel | undefined;
  /** Whether Chromium may be downloaded when no system browser is found (ADR-001). */
  downloadBrowser: boolean;
  /** Whether the browser runs without a window (the login tool always shows one). */
  headless: boolean;
  /** How student tools leave their trail (ADR-012). */
  trail: Trail;
  /** The kinds of tools the agent gets (ADR-015). */
  scopes: Scope[];
  /** How others' data reaches the agent (ADR-016). */
  studentData: StudentDataLevel;
  /** What the person set at start-up: configure can narrow below it, never go past it. */
  limits: { scopes: Scope[]; studentData: StudentDataLevel };
  sources: {
    moodleUrl?: SettingSource;
    profileDir: SettingSource;
    channel: SettingSource;
    headless: SettingSource;
    downloadBrowser: SettingSource;
    trail: SettingSource;
    scopes: SettingSource;
    studentData: SettingSource;
  };
}

/** A setting invalid at startup (the server stops with this message) or in `configure`. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/** A tool needs the site and nobody has given it. */
export class NotConfiguredError extends Error {
  override name = "NotConfiguredError";
  constructor() {
    super("The server has no Moodle site yet. Call configure with the site's URL (from your own configuration, or ask the person), then retry.");
  }
}

export const USAGE = `Usage: moodle-mcp [options]

Every setting is optional here: a client can also give them with the configure tool.
Options (each overrides its environment variable):
  --url <url>           Moodle site URL                      MOODLE_URL
  --profile-dir <dir>   Browser profile folder               MOODLE_MCP_PROFILE_DIR (default: ~/.moodle-mcp/profile)
  --channel <name>      Browser: msedge, chrome or chromium  MOODLE_MCP_CHANNEL (default: msedge, then chrome, then chromium)
  --headless / --headed Run the browser without a window     MOODLE_MCP_HEADLESS (default: true)
  --no-download-browser Never download Chromium              MOODLE_MCP_DOWNLOAD_BROWSER (default: true)
  --trail <mode>        Student tools: realistic or fast     MOODLE_MCP_TRAIL (default: realistic)
  --scopes <list>       Kinds of tools: a profile (all, teacher, student, content) or scopes
                        (content, student-data, grading, communication, as-student, browser)
                                                             MOODLE_MCP_SCOPES (default: all)
  --student-data <lvl>  Others' data: block, pseudonymize or MOODLE_MCP_STUDENT_DATA (default: pseudonymize)
                        clear (names, for a local model)
  --help                Show this help
  --version             Show the version`;

/** The package's root folder: the parent of `dist/` in the bundle, of `src/` in development. */
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_PROFILE_DIR = path.join(homedir(), ".moodle-mcp", "profile");

const booleanText = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(["true", "false", "1", "0", "yes", "no"]))
  .transform((value) => ["true", "1", "yes"].includes(value));

/** What `--help` and `--version` ask for instead of running the server. */
export type CliRequest = "help" | "version";

/** The first of `[argument, environment]` that has a value, and its source. */
function pick(argument: string | undefined, environment: string | undefined): { value: string; source: SettingSource } | undefined {
  if (argument?.trim()) return { value: argument, source: "argument" };
  // An empty variable counts as unset: a client may pass `${VAR}` for a variable that doesn't exist.
  if (environment?.trim()) return { value: environment, source: "environment" };
  return undefined;
}

/** A boolean setting, true by default: the argument's value, else the variable's. */
function pickBoolean(argument: boolean | undefined, variable: string, env: NodeJS.ProcessEnv): { value: boolean; source: SettingSource } {
  if (argument !== undefined) return { value: argument, source: "argument" };
  const text = env[variable];
  if (!text?.trim()) return { value: true, source: "default" };
  const parsed = booleanText.safeParse(text);
  if (!parsed.success) throw new ConfigError(`${variable} must be true or false, not "${text}".`);
  return { value: parsed.data, source: "environment" };
}

/**
 * Reads the starting configuration from command-line arguments and environment variables, all
 * optional (ADR-003, ADR-009). Returns `"help"` or `"version"` when asked for them; throws
 * `ConfigError` on an invalid setting.
 */
export function loadConfig(argv: string[], env: NodeJS.ProcessEnv, packageRoot: string = PACKAGE_ROOT): Config | CliRequest {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        url: { type: "string" },
        "profile-dir": { type: "string" },
        channel: { type: "string" },
        headless: { type: "boolean" },
        headed: { type: "boolean" },
        "no-download-browser": { type: "boolean" },
        trail: { type: "string" },
        scopes: { type: "string" },
        "student-data": { type: "string" },
        help: { type: "boolean" },
        version: { type: "boolean" },
      },
    }));
  } catch (error) {
    throw new ConfigError(`${(error as Error).message}\n\n${USAGE}`);
  }
  if (values.help) return "help";
  if (values.version) return "version";

  const url = pick(values.url, env.MOODLE_URL);
  const profile = pick(values["profile-dir"], env.MOODLE_MCP_PROFILE_DIR);
  const channel = pick(values.channel, env.MOODLE_MCP_CHANNEL);
  const trail = pick(values.trail, env.MOODLE_MCP_TRAIL);
  const scopes = pick(values.scopes, env.MOODLE_MCP_SCOPES);
  const studentData = pick(values["student-data"], env.MOODLE_MCP_STUDENT_DATA);
  const scopeList = scopes ? parseScopeSetting(scopes.value) : [...PROFILES.all!];
  const level = studentData ? parseStudentData(studentData.value) : DEFAULT_STUDENT_DATA;

  const headless = pickBoolean(values.headed || values.headless ? !values.headed : undefined, "MOODLE_MCP_HEADLESS", env);
  const downloadBrowser = pickBoolean(values["no-download-browser"] ? false : undefined, "MOODLE_MCP_DOWNLOAD_BROWSER", env);

  return {
    moodleUrl: url ? parseMoodleUrl(url.value) : undefined,
    profileDir: parseProfileDir(profile?.value ?? DEFAULT_PROFILE_DIR, packageRoot),
    channel: channel ? parseChannel(channel.value) : undefined,
    headless: headless.value,
    downloadBrowser: downloadBrowser.value,
    trail: trail ? parseTrail(trail.value) : "realistic",
    scopes: scopeList,
    studentData: level,
    limits: { scopes: scopeList, studentData: level },
    sources: {
      ...(url ? { moodleUrl: url.source } : {}),
      profileDir: profile?.source ?? "default",
      channel: channel?.source ?? "default",
      headless: headless.source,
      downloadBrowser: downloadBrowser.source,
      trail: trail?.source ?? "default",
      scopes: scopes?.source ?? "default",
      studentData: studentData?.source ?? "default",
    },
  };
}

/** A site URL as the server keeps it: http(s), no query or fragment, ending in `/`. */
export function parseMoodleUrl(value: string): string {
  try {
    return parseSiteUrl(value);
  } catch (error) {
    throw error instanceof MoodleUrlError ? new ConfigError(error.message) : error;
  }
}

/** A profile folder, absolute; never inside the server's own folder (ADR-002). */
export function parseProfileDir(value: string, packageRoot: string = PACKAGE_ROOT): string {
  let dir = value.trim();
  if (dir === "~" || dir.startsWith("~/") || dir.startsWith("~\\")) dir = path.join(homedir(), dir.slice(1));
  dir = path.resolve(dir);
  // A live session must never end up in the server's folder, its package or a repo (ADR-002).
  if (isInside(dir, packageRoot)) {
    throw new ConfigError(`The browser profile can't be inside the server's folder (${packageRoot}): choose another folder.`);
  }
  return dir;
}

// Others reach the agent as aliases unless the person chooses otherwise (ADR-016).
const DEFAULT_STUDENT_DATA: StudentDataLevel = "pseudonymize";

export function parseScopeSetting(value: string): Scope[] {
  try {
    return parseScopes(value);
  } catch (error) {
    throw new ConfigError((error as Error).message);
  }
}

export function parseStudentData(value: string): StudentDataLevel {
  const level = value.trim().toLowerCase();
  if (!(STUDENT_DATA_LEVELS as readonly string[]).includes(level)) throw new ConfigError(`Student data must be one of ${STUDENT_DATA_LEVELS.join(", ")}, not "${value}".`);
  return level as StudentDataLevel;
}

/** Whether a student data level is at least as strict as another (block, then pseudonymize, then clear). */
export function atLeastAsStrict(level: StudentDataLevel, than: StudentDataLevel): boolean {
  return STUDENT_DATA_LEVELS.indexOf(level) <= STUDENT_DATA_LEVELS.indexOf(than);
}

export function parseTrail(value: string): Trail {
  const trail = value.trim().toLowerCase();
  if (!(TRAILS as readonly string[]).includes(trail)) throw new ConfigError(`The trail must be one of ${TRAILS.join(", ")}, not "${value}".`);
  return trail as Trail;
}

function parseChannel(value: string): Channel {
  const channel = value.trim().toLowerCase();
  if (!(CHANNELS as readonly string[]).includes(channel)) {
    throw new ConfigError(`MOODLE_MCP_CHANNEL must be one of ${CHANNELS.join(", ")}, not "${value}".`);
  }
  return channel as Channel;
}

function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** The site's URL, or `NotConfiguredError` for the client to call `configure`. */
export function requireSiteUrl(config: Config): string {
  if (!config.moodleUrl) throw new NotConfiguredError();
  return config.moodleUrl;
}

/** The URL as it's safe to show: without a user or password. */
export function redactUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = "";
  parsed.password = "";
  return parsed.href;
}
