// The driver's errors speak of Moodle and the browser; a client needs to hear which tool or setting
// fixes them. Applied to every tool as createServer registers them, like following (ADR-014).
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BrowserDownloadingError, BrowserNotFoundError, LoginTimeoutError, LoginWindowClosedError, NoDisplayError, NotLoggedInError } from "@falkenslab/moodle-driver";

/** The same error, told in this server's terms: its tools, its settings. */
export function explain(error: unknown): unknown {
  if (error instanceof NotLoggedInError) {
    return new Error("There is no Moodle session, or it expired. Call the login tool so the person can log in in the browser window it opens, then retry.");
  }
  if (error instanceof LoginTimeoutError || error instanceof LoginWindowClosedError) {
    return new Error(`${error.message} Call login again when the person is ready.`);
  }
  if (error instanceof BrowserDownloadingError) {
    return new Error(`${error.message} Tell the person: the server needs a browser first.`);
  }
  if (error instanceof NoDisplayError) {
    return new Error(`${error.message} For this server: MOODLE_MCP_HEADLESS=true, or show_browser only where there's a screen.`);
  }
  if (error instanceof BrowserNotFoundError) {
    return new Error(`${error.message} For this server: MOODLE_MCP_CHANNEL chooses the browser, MOODLE_MCP_DOWNLOAD_BROWSER=true lets it download Chromium.`);
  }
  return error;
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
