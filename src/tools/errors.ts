// The driver's errors speak of Moodle and the browser; a client needs to hear which tool or setting
// fixes them. Applied to every tool as createServer registers them, like following (ADR-014).
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MoodleError } from "@falkenslab/moodle-driver";

/** What this server adds to a driver error, by its stable code: the tool or setting that fixes it. */
const HINTS: Partial<Record<MoodleError["code"], (message: string) => string>> = {
  "not-logged-in": () => "There is no Moodle session, or it expired. Call the login tool so the person can log in in the browser window it opens, then retry.",
  "login-timeout": (message) => `${message} Call login again when the person is ready.`,
  "login-window-closed": (message) => `${message} Call login again when the person is ready.`,
  "browser-downloading": (message) => `${message} Tell the person: the server needs a browser first.`,
  "no-display": (message) => `${message} For this server: MOODLE_MCP_HEADLESS=true, or show_browser only where there's a screen.`,
  "browser-not-found": (message) => `${message} For this server: MOODLE_MCP_CHANNEL chooses the browser, MOODLE_MCP_DOWNLOAD_BROWSER=true lets it download Chromium.`,
  // The site's Moodle is too old for this, or an administrator turned the feature off: nothing the agent can work around.
  "not-available": (message) => `${message} Tell the person this site can't do it; don't try another way.`,
  "badges-disabled": (message) => `${message} Tell the person: a site administrator turns it on.`,
  "notes-disabled": (message) => `${message} Tell the person: a site administrator turns it on.`,
  "competencies-disabled": (message) => `${message} Tell the person: a site administrator turns it on.`,
};

/** The same error, told in this server's terms: its tools, its settings. */
export function explain(error: unknown): unknown {
  // By the driver's stable code, not its classes: the same code whichever copy of the package made it.
  const hint = error instanceof MoodleError ? HINTS[error.code] : undefined;
  return hint ? new Error(hint((error as Error).message)) : error;
}

type Handler = (args: unknown, extra: unknown) => Promise<unknown>;

/** Makes every tool registered on `server` from now on report the driver's errors in this server's terms. */
export function explainErrors(server: McpServer): void {
  const register = server.registerTool.bind(server) as (name: string, settings: unknown, handler: Handler) => unknown;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) =>
    register(name, settings, async (args, extra) => {
      try {
        return await handler(args, extra);
      } catch (error) {
        throw explain(error);
      }
    });
}
