import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CHANNELS, MoodleUrlError, TRAILS, parseSiteUrl, type Channel, type Trail } from "@falkenslab/moodle-driver";
import { z } from "zod";
import { ROLES, type Role } from "./tools/roles.js";
import { ACCESS_LEVELS, PROFILES, STUDENT_DATA_LEVELS, parseScopes, type AccessLevel, type Scope, type StudentDataLevel } from "./tools/scopes.js";

// Channels and trails are the driver's (its ADR-001 and ADR-005); the server only picks among them.
export { CHANNELS, SYSTEM_CHANNELS, TRAILS, type Channel, type Trail } from "@falkenslab/moodle-driver";

/** A Moodle site the server knows (ADR-021): its name, URL and browser profile, and where it came from. */
export interface Site {
  name: string;
  /** Its base URL, as `moodleUrl` keeps it. */
  url: string;
  /** Its own browser profile, absolute. */
  profileDir: string;
  /** From the person's configuration, or added at run time (`add_site`, `configure`) and saved in the data folder. */
  origin: "configuration" | "run-time";
}

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
  /** The role whose tools the agent gets (ADR-018). */
  role: Role;
  /** Whether the agent may change Moodle, or only read it (ADR-020). */
  access: AccessLevel;
  /** Whether the advanced tools exist (ADR-022); off unless the person turns them on. */
  advanced?: boolean;
  /** Who confirms what can't be undone (ADR-023): the person through elicitation (default), or the client, trusted to have asked. */
  confirm?: ConfirmMode;
  /** The server's own folder: the plugin's data folder (CLAUDE_PLUGIN_DATA) or ~/.moodle-mcp (ADR-021). */
  dataDir: string;
  /** The sites it knows; the active one's URL and profile are `moodleUrl` and `profileDir` (ADR-021). */
  sites: Site[];
  /** The active site's name; none until there's a site. */
  activeSite: string | undefined;
  /** What the person set at start-up: configure can narrow below it, never go past it. */
  limits: { scopes: Scope[]; studentData: StudentDataLevel; role: Role; access: AccessLevel };
  sources: {
    moodleUrl?: SettingSource;
    profileDir: SettingSource;
    channel: SettingSource;
    headless: SettingSource;
    downloadBrowser: SettingSource;
    trail: SettingSource;
    scopes: SettingSource;
    studentData: SettingSource;
    role: SettingSource;
    access: SettingSource;
    advanced?: SettingSource;
    confirm?: SettingSource;
  };
  /** Settings the client passed as an unexpanded `${…}` placeholder, taken as not set (a client without the plugin's settings). */
  unexpanded?: string[];
}

/** A setting invalid at startup (the server stops with this message) or in `configure`. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/** A tool needs the site and nobody has given it. */
export class NotConfiguredError extends Error {
  override name = "NotConfiguredError";
  constructor() {
    super("The server has no Moodle site yet. Add it with add_site, the URL from your own configuration or the address the person gives you, then retry.");
  }
}

export const USAGE = `Usage: moodle-mcp [options]

Every setting is optional here: a client can also give them with the configure tool.
Options (each overrides its environment variable):
  --url <url>           Moodle site URL                      MOODLE_URL
  --sites <list>        Several sites: name=url,url,… or JSON MOODLE_MCP_SITES
                        {"name": "url" | {"url": "…"}}; the first is active
  --profile-dir <dir>   Browser profile folder (first site)  MOODLE_MCP_PROFILE_DIR (default: profile in the data folder,
                        CLAUDE_PLUGIN_DATA or ~/.moodle-mcp)
  --channel <name>      Browser: msedge, chrome, chromium    MOODLE_MCP_CHANNEL (default: msedge, then chrome, then chromium)
                        or firefox (Playwright's, downloaded)
  --headless / --headed Run the browser without a window     MOODLE_MCP_HEADLESS (default: true)
  --no-download-browser Never download Chromium              MOODLE_MCP_DOWNLOAD_BROWSER (default: true)
  --trail <mode>        Student tools: realistic or fast     MOODLE_MCP_TRAIL (default: realistic)
  --scopes <list>       Kinds of tools: a profile (all, teacher, student, content) or scopes
                        (content, student-data, grading, communication, as-student, browser)
                                                             MOODLE_MCP_SCOPES (default: all)
  --student-data <lvl>  Others' data: block, pseudonymize or MOODLE_MCP_STUDENT_DATA (default: pseudonymize)
                        clear (names, for a local model)
  --role <role>         Tools for a role: teacher, student or   MOODLE_MCP_ROLE (default: all)
                        all (every tool)
  --access <level>      read (only tools that change nothing)   MOODLE_MCP_ACCESS (default: write)
                        or write
  --advanced            Also the advanced tools (BigBlueButton,  MOODLE_MCP_ADVANCED (default: false)
                        competencies, LTI, content bank, notes, blocks)
  --confirm <who>       Who confirms what can't be undone: elicit MOODLE_MCP_CONFIRM (default: elicit)
                        (the person, in their app) or client (the
                        app asked them already)
  --help                Show this help
  --version             Show the version`;

/** The package's root folder: the parent of `dist/` in the bundle, of `src/` in development. */
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");


const booleanText = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(["true", "false", "1", "0", "yes", "no"]))
  .transform((value) => ["true", "1", "yes"].includes(value));

/** What `--help` and `--version` ask for instead of running the server. */
export type CliRequest = "help" | "version";

/** A whole `${…}` a client left as it was: Codex, for one, passes a plugin's `${user_config.*}` unexpanded. */
const UNEXPANDED = /^\s*\$\{[^}]*\}\s*$/;

/**
 * A value that counts as set: not empty (a client may expand `${VAR}` to nothing for a variable that
 * doesn't exist) and not an unexpanded placeholder, which goes in `unexpanded` under `name`.
 */
function given(value: string | undefined, name: string, unexpanded: string[]): string | undefined {
  if (!value?.trim()) return undefined;
  if (UNEXPANDED.test(value)) {
    unexpanded.push(name);
    return undefined;
  }
  return value;
}

/** The first of `[argument, environment]` that has a value, and its source. */
function pick(argument: string | undefined, variable: string, env: NodeJS.ProcessEnv, unexpanded: string[]): { value: string; source: SettingSource } | undefined {
  const fromArgument = given(argument, variable, unexpanded);
  if (fromArgument) return { value: fromArgument, source: "argument" };
  const fromEnvironment = given(env[variable], variable, unexpanded);
  if (fromEnvironment) return { value: fromEnvironment, source: "environment" };
  return undefined;
}

/** A boolean setting, true by default: the argument's value, else the variable's. */
function pickBoolean(argument: boolean | undefined, variable: string, env: NodeJS.ProcessEnv, unexpanded: string[], byDefault = true): { value: boolean; source: SettingSource } {
  if (argument !== undefined) return { value: argument, source: "argument" };
  const text = given(env[variable], variable, unexpanded);
  if (!text) return { value: byDefault, source: "default" };
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
        sites: { type: "string" },
        "profile-dir": { type: "string" },
        channel: { type: "string" },
        headless: { type: "boolean" },
        headed: { type: "boolean" },
        "no-download-browser": { type: "boolean" },
        trail: { type: "string" },
        scopes: { type: "string" },
        "student-data": { type: "string" },
        role: { type: "string" },
        access: { type: "string" },
        advanced: { type: "boolean" },
        confirm: { type: "string" },
        help: { type: "boolean" },
        version: { type: "boolean" },
      },
    }));
  } catch (error) {
    throw new ConfigError(`${(error as Error).message}\n\n${USAGE}`);
  }
  if (values.help) return "help";
  if (values.version) return "version";

  const unexpanded: string[] = [];
  const url = pick(values.url, "MOODLE_URL", env, unexpanded);
  const sitesSetting = pick(values.sites, "MOODLE_MCP_SITES", env, unexpanded);
  const profile = pick(values["profile-dir"], "MOODLE_MCP_PROFILE_DIR", env, unexpanded);
  const channel = pick(values.channel, "MOODLE_MCP_CHANNEL", env, unexpanded);
  const trail = pick(values.trail, "MOODLE_MCP_TRAIL", env, unexpanded);
  const scopes = pick(values.scopes, "MOODLE_MCP_SCOPES", env, unexpanded);
  const studentData = pick(values["student-data"], "MOODLE_MCP_STUDENT_DATA", env, unexpanded);
  const scopeList = scopes ? parseScopeSetting(scopes.value) : [...PROFILES.all!];
  const level = studentData ? parseStudentData(studentData.value) : DEFAULT_STUDENT_DATA;
  const roleSetting = pick(values.role, "MOODLE_MCP_ROLE", env, unexpanded);
  const role = roleSetting ? parseRole(roleSetting.value) : "all";
  const accessSetting = pick(values.access, "MOODLE_MCP_ACCESS", env, unexpanded);
  const access = accessSetting ? parseAccess(accessSetting.value) : "write";

  const headless = pickBoolean(values.headed || values.headless ? !values.headed : undefined, "MOODLE_MCP_HEADLESS", env, unexpanded);
  const downloadBrowser = pickBoolean(values["no-download-browser"] ? false : undefined, "MOODLE_MCP_DOWNLOAD_BROWSER", env, unexpanded);
  const advanced = pickBoolean(values.advanced ? true : undefined, "MOODLE_MCP_ADVANCED", env, unexpanded, false);
  const confirmSetting = pick(values.confirm, "MOODLE_MCP_CONFIRM", env, unexpanded);
  const confirm = confirmSetting ? parseConfirm(confirmSetting.value) : "elicit";

  // The data folder is the plugin's when the server runs as one: each plugin its own sessions, gone with it (ADR-021).
  const dataDir = path.resolve(given(env.CLAUDE_PLUGIN_DATA, "CLAUDE_PLUGIN_DATA", unexpanded)?.trim() || path.join(homedir(), ".moodle-mcp"));
  const mainProfile = parseProfileDir(profile?.value ?? path.join(dataDir, "profile"), packageRoot);
  const sites = configuredSites(url ? parseMoodleUrl(url.value) : undefined, sitesSetting ? parseSitesSetting(sitesSetting.value) : [], mainProfile, dataDir);
  const urlSource = url ? url.source : sitesSetting?.source;

  return {
    moodleUrl: sites[0]?.url,
    profileDir: sites[0]?.profileDir ?? mainProfile,
    channel: channel ? parseChannel(channel.value) : undefined,
    headless: headless.value,
    downloadBrowser: downloadBrowser.value,
    trail: trail ? parseTrail(trail.value) : "realistic",
    scopes: scopeList,
    studentData: level,
    role,
    access,
    advanced: advanced.value,
    confirm,
    dataDir,
    sites,
    activeSite: sites[0]?.name,
    limits: { scopes: scopeList, studentData: level, role, access },
    sources: {
      ...(urlSource ? { moodleUrl: urlSource } : {}),
      profileDir: profile?.source ?? "default",
      channel: channel?.source ?? "default",
      headless: headless.source,
      downloadBrowser: downloadBrowser.source,
      trail: trail?.source ?? "default",
      scopes: scopes?.source ?? "default",
      studentData: studentData?.source ?? "default",
      role: roleSetting?.source ?? "default",
      access: accessSetting?.source ?? "default",
      advanced: advanced.source,
      confirm: confirmSetting?.source ?? "default",
    },
    ...(unexpanded.length > 0 && { unexpanded: [...new Set(unexpanded)] }),
  };
}

/**
 * The configured sites, in order: MOODLE_URL first unless MOODLE_MCP_SITES already has its URL, so a
 * 0.2 configuration that adds sites keeps its active site; the first site keeps the main profile, so
 * no one logs in again, and every other gets its own in the data folder (ADR-021).
 */
function configuredSites(url: string | undefined, listed: { name: string; url: string }[], mainProfile: string, dataDir: string): Site[] {
  const all = url && !listed.some((site) => site.url === url) ? [{ name: siteNameOf(url), url }, ...listed] : listed;
  const seen = new Set<string>();
  for (const { name } of all) {
    if (seen.has(name)) throw new ConfigError(`Two sites are named "${name}": name them in MOODLE_MCP_SITES (name=url), such as two accounts on one site.`);
    seen.add(name);
  }
  return all.map((site, i) => ({ ...site, origin: "configuration", profileDir: i === 0 ? mainProfile : siteProfileDir(dataDir, site.name) }));
}

/** A site's own profile in the data folder, for every site but the first. */
export function siteProfileDir(dataDir: string, name: string): string {
  return path.join(dataDir, "sites", name, "profile");
}

/**
 * MOODLE_MCP_SITES (ADR-021): JSON when it starts with `{` (name to URL, or to `{ url }`), else a
 * comma-separated list of URLs (each named after its host) and `name=url` items.
 */
export function parseSitesSetting(value: string): { name: string; url: string }[] {
  const text = value.trim();
  let entries: [string | undefined, string][];
  if (text.startsWith("{")) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new ConfigError(`MOODLE_MCP_SITES starts with "{" but isn't valid JSON (${(error as Error).message}).`);
    }
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new ConfigError('MOODLE_MCP_SITES as JSON must be an object: {"name": "https://…"}.');
    entries = Object.entries(json).map(([name, site]): [string, string] => {
      const siteUrl = typeof site === "string" ? site : site && typeof site === "object" && typeof (site as { url?: unknown }).url === "string" ? (site as { url: string }).url : undefined;
      if (!siteUrl) throw new ConfigError(`MOODLE_MCP_SITES: the site "${name}" needs a URL, as a string or {"url": "…"}.`);
      return [name, siteUrl];
    });
  } else {
    entries = text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item): [string | undefined, string] => {
        // A URL may hold "=" in its query: only an item that isn't a URL is name=url.
        if (/^https?:\/\//i.test(item)) return [undefined, item];
        const at = item.indexOf("=");
        if (at < 1) throw new ConfigError(`MOODLE_MCP_SITES: "${item}" is neither a URL nor name=url.`);
        return [item.slice(0, at).trim(), item.slice(at + 1).trim()];
      });
  }
  if (entries.length === 0) throw new ConfigError("MOODLE_MCP_SITES has no site.");
  return entries.map(([name, siteUrl]) => {
    const parsed = parseMoodleUrl(siteUrl);
    return { name: name === undefined ? siteNameOf(parsed) : parseSiteName(name), url: parsed };
  });
}

/** A site's name: letters, digits, dots and hyphens, as its folder in the data folder is named. */
export function parseSiteName(value: string): string {
  const name = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,62}$/.test(name)) throw new ConfigError(`A site's name is letters, digits, dots and hyphens (up to 63), starting with a letter or digit, not "${value}".`);
  return name;
}

/** The name of a site given without one: its host, with its port (campus.example.org, localhost-8080). */
export function siteNameOf(siteUrl: string): string {
  return new URL(siteUrl).host.replace(/[^A-Za-z0-9.]+/g, "-").slice(0, 63);
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

/** Who confirms what can't be undone (ADR-023). */
export const CONFIRM_MODES = ["elicit", "client"] as const;
export type ConfirmMode = (typeof CONFIRM_MODES)[number];

export function parseConfirm(value: string): ConfirmMode {
  const mode = value.trim().toLowerCase();
  if (!(CONFIRM_MODES as readonly string[]).includes(mode)) throw new ConfigError(`MOODLE_MCP_CONFIRM must be one of ${CONFIRM_MODES.join(", ")}, not "${value}".`);
  return mode as ConfirmMode;
}

export function parseAccess(value: string): AccessLevel {
  const access = value.trim().toLowerCase();
  if (!(ACCESS_LEVELS as readonly string[]).includes(access)) throw new ConfigError(`Access must be one of ${ACCESS_LEVELS.join(", ")}, not "${value}".`);
  return access as AccessLevel;
}

export function parseRole(value: string): Role {
  const role = value.trim().toLowerCase();
  if (!(ROLES as readonly string[]).includes(role)) throw new ConfigError(`The role must be one of ${ROLES.join(", ")}, not "${value}".`);
  return role as Role;
}

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
