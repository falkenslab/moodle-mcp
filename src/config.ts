import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";

/** Installed browsers Playwright can launch without downloading one (ADR-001). */
export const CHANNELS = ["msedge", "chrome"] as const;
export type Channel = (typeof CHANNELS)[number];

export interface Config {
  /** The site's base URL, always ending in `/` so relative paths resolve under it. */
  moodleUrl: string;
  /** The browser's persistent profile, absolute (ADR-002). */
  profileDir: string;
  /** The browser to launch; `undefined` tries each of `CHANNELS` in order. */
  channel: Channel | undefined;
  /** Whether the browser runs without a window (the login tool always shows one). */
  headless: boolean;
}

/** A setting missing or invalid: the server stops at startup with this message. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

export const USAGE = `Usage: moodle-mcp [options]

Options (each overrides its environment variable):
  --url <url>           Moodle site URL                      MOODLE_URL (required)
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

/**
 * Reads the configuration from command-line arguments and environment variables (ADR-003).
 * Returns `"help"` or `"version"` when asked for them; throws `ConfigError` on a bad setting.
 */
export function loadConfig(
  argv: string[],
  env: NodeJS.ProcessEnv,
  packageRoot: string = PACKAGE_ROOT,
): Config | CliRequest {
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

  const moodleUrl = parseMoodleUrl(values.url ?? env.MOODLE_URL);
  const profileDir = parseProfileDir(values["profile-dir"] ?? env.MOODLE_MCP_PROFILE_DIR, packageRoot);
  const channel = parseChannel(values.channel ?? env.MOODLE_MCP_CHANNEL);

  let headless = true;
  if (values.headed) headless = false;
  else if (values.headless) headless = true;
  else if (env.MOODLE_MCP_HEADLESS?.trim()) {
    const parsed = booleanText.safeParse(env.MOODLE_MCP_HEADLESS);
    if (!parsed.success) throw new ConfigError(`MOODLE_MCP_HEADLESS must be true or false, not "${env.MOODLE_MCP_HEADLESS}".`);
    headless = parsed.data;
  }

  return { moodleUrl, profileDir, channel, headless };
}

function parseMoodleUrl(value: string | undefined): string {
  if (!value?.trim()) throw new ConfigError(`The Moodle site's URL is missing: set MOODLE_URL or pass --url.\n\n${USAGE}`);
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConfigError(`MOODLE_URL is not a valid URL: "${value}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConfigError(`MOODLE_URL must be an http or https URL, not "${value}".`);
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.href;
}

function parseProfileDir(value: string | undefined, packageRoot: string): string {
  let dir = value?.trim() || DEFAULT_PROFILE_DIR;
  if (dir === "~" || dir.startsWith("~/") || dir.startsWith("~\\")) dir = path.join(homedir(), dir.slice(1));
  dir = path.resolve(dir);
  // A live session must never end up in the server's folder, its package or a repo (ADR-002).
  if (isInside(dir, packageRoot)) {
    throw new ConfigError(`The browser profile can't be inside the server's folder (${packageRoot}): choose another MOODLE_MCP_PROFILE_DIR.`);
  }
  return dir;
}

function parseChannel(value: string | undefined): Channel | undefined {
  const channel = value?.trim().toLowerCase();
  if (!channel) return undefined;
  if (!(CHANNELS as readonly string[]).includes(channel)) {
    throw new ConfigError(`MOODLE_MCP_CHANNEL must be one of ${CHANNELS.join(", ")}, not "${value}".`);
  }
  return channel as Channel;
}

function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** The URL as it's safe to show: without a user or password. */
export function redactUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = "";
  parsed.password = "";
  return parsed.href;
}
