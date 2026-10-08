import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";

/** Installed browsers Playwright can launch without downloading one (ADR-001). */
export const CHANNELS = ["msedge", "chrome"] as const;
export type Channel = (typeof CHANNELS)[number];

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
  /** The browser to launch; `undefined` tries each of `CHANNELS` in order. */
  channel: Channel | undefined;
  /** Whether the browser runs without a window (the login tool always shows one). */
  headless: boolean;
  sources: { moodleUrl?: SettingSource; profileDir: SettingSource; channel: SettingSource; headless: SettingSource };
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
  --channel <name>      Browser: msedge or chrome            MOODLE_MCP_CHANNEL (default: msedge, then chrome)
  --headless / --headed Run the browser without a window     MOODLE_MCP_HEADLESS (default: true)
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

  let headless = true;
  let headlessSource: SettingSource = "default";
  if (values.headed || values.headless) {
    headless = !values.headed;
    headlessSource = "argument";
  } else if (env.MOODLE_MCP_HEADLESS?.trim()) {
    const parsed = booleanText.safeParse(env.MOODLE_MCP_HEADLESS);
    if (!parsed.success) throw new ConfigError(`MOODLE_MCP_HEADLESS must be true or false, not "${env.MOODLE_MCP_HEADLESS}".`);
    headless = parsed.data;
    headlessSource = "environment";
  }

  return {
    moodleUrl: url ? parseMoodleUrl(url.value) : undefined,
    profileDir: parseProfileDir(profile?.value ?? DEFAULT_PROFILE_DIR, packageRoot),
    channel: channel ? parseChannel(channel.value) : undefined,
    headless,
    sources: {
      ...(url ? { moodleUrl: url.source } : {}),
      profileDir: profile?.source ?? "default",
      channel: channel?.source ?? "default",
      headless: headlessSource,
    },
  };
}

/** A site URL as the server keeps it: http(s), no query or fragment, ending in `/`. */
export function parseMoodleUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConfigError(`The Moodle URL isn't a valid URL: "${value}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConfigError(`The Moodle URL must be http or https, not "${value}".`);
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.href;
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
