// Each tool's page (ADR-011): the Moodle page that shows its work, from the driver's map
// (`FOLLOWED_PAGES`) for the calls the tool made. It goes in the result's `_meta.page`, for a client to
// link the action to it, and, while the person watches, it's shown in the browser.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { pageOf, recordingCalls, type DriverCall } from "../driver.js";
import type { ToolContext } from "./types.js";

type Handler = (args: unknown, extra: unknown) => Promise<{ isError?: boolean; _meta?: Record<string, unknown> }>;

// Pages that name a person by their Moodle id: a profile, a conversation, a user's grades, notes or logs.
const NAMES_A_PERSON = [/[?&](userid|user|relateduser)=\d/i, /[?&]item=user&itemid=\d/, /^(user\/(profile|view)\.php|message\/index\.php)\?id=\d/];

/**
 * The page of the last call that has one, as an absolute URL; none for a tool that made no such call.
 * While others' data is pseudonymized or blocked, a page that names a person isn't given: ids are
 * what the aliases hide (ADR-019), and nothing guarantees a client keeps `_meta` from the model.
 */
export function pageFor(calls: readonly DriverCall[], config: Config): string | undefined {
  if (!config.moodleUrl) return undefined;
  for (const call of [...calls].reverse()) {
    const page = pageOf(call);
    if (page === undefined) continue;
    if (config.studentData !== "clear" && NAMES_A_PERSON.some((pattern) => pattern.test(page))) return undefined;
    return new URL(page, config.moodleUrl).href;
  }
  return undefined;
}

/**
 * Makes every tool registered on `server` from now on give its page in `_meta.page` when it succeeds,
 * and show it while the person watches. Showing is best effort (`BrowserManager.show`); the content
 * the agent reads doesn't change.
 */
export function followTools(server: McpServer, { config, browser }: ToolContext): void {
  const register = server.registerTool.bind(server) as (name: string, settings: unknown, handler: Handler) => unknown;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) =>
    register(name, settings, async (args, extra) => {
      const { value: result, calls } = await recordingCalls(() => handler(args, extra));
      const page = result.isError ? undefined : pageFor(calls, config);
      if (page === undefined) return result;
      if (browser.visible()) await browser.show(page);
      return { ...result, _meta: { ...result._meta, page } };
    });
}
