// The pseudonymization net (ADR-019): under `pseudonymize`, every tool's output and error goes through
// redaction on its way to the agent, whatever the tool did itself. Tools still turn people into aliases
// (that needs the names they hold); this catches what slips: a driver's message naming a user by id, a
// free text field nobody expected to hold a name.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { pseudonymizing, redactAll } from "../people.js";
import type { ToolContext } from "./types.js";

/** The person's own session and the server itself: their own email and name stay. */
const EXEMPT = new Set(["configure", "login", "logout", "get_me", "get_site_info", "list_courses", "show_browser", "server_info", "list_sites", "add_site", "use_site", "remove_site"]);

type Handler = (args: unknown, extra: unknown) => Promise<unknown>;
type Result = { content?: { type: string; text?: string }[]; structuredContent?: unknown; isError?: boolean };

/** Every string in a value, at any depth, as a list and a way to put new ones back in the same places. */
function strings(value: unknown): { found: string[]; rebuild: (replaced: string[]) => unknown } {
  const found: string[] = [];
  const collect = (v: unknown): void => {
    if (typeof v === "string") found.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(value);
  const rebuild = (replaced: string[]) => {
    let next = 0;
    const put = (v: unknown): unknown => {
      if (typeof v === "string") return replaced[next++];
      if (Array.isArray(v)) return v.map(put);
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, put(x)]));
      return v;
    };
    return put(value);
  };
  return { found, rebuild };
}

/** A result with its structured content and its text redacted together; the JSON text follows the structured content. */
async function redactResult(context: ToolContext, siteUrl: string, result: Result): Promise<Result> {
  const structured = strings(result.structuredContent);
  const echoes = JSON.stringify(result.structuredContent, null, 2);
  // Text items that aren't the structured content as JSON (an error, a tool's own text) are redacted too.
  const texts = (result.content ?? []).map((c) => (c.type === "text" && c.text !== undefined && c.text !== echoes ? c.text : undefined));
  const own = texts.filter((t): t is string => t !== undefined);
  const redacted = await redactAll(context.config, siteUrl, [...structured.found, ...own]);
  const structuredContent = result.structuredContent === undefined ? undefined : structured.rebuild(redacted.slice(0, structured.found.length));
  let next = structured.found.length;
  const content = (result.content ?? []).map((c, i) => {
    if (c.type !== "text" || c.text === undefined) return c;
    if (texts[i] === undefined) return { ...c, text: JSON.stringify(structuredContent, null, 2) };
    return { ...c, text: redacted[next++] };
  });
  return { ...result, content, ...(structuredContent !== undefined && { structuredContent }) };
}

/**
 * Makes every tool registered on `server` from now on pass its result and its error through the net,
 * while the level is `pseudonymize`. Installed first, so it wraps the others: the agent gets what it sees.
 */
export function pseudonymizeTools(server: McpServer, context: ToolContext): void {
  const register = server.registerTool.bind(server) as (name: string, settings: unknown, handler: Handler) => unknown;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) =>
    register(name, settings, async (args, extra) => {
      if (EXEMPT.has(name)) return handler(args, extra);
      const siteUrl = context.config.moodleUrl;
      const active = () => pseudonymizing(context.config) && siteUrl !== undefined;
      let result: unknown;
      try {
        result = await handler(args, extra);
      } catch (error) {
        if (!active() || !(error instanceof Error)) throw error;
        const [message] = await redactAll(context.config, siteUrl!, [error.message]);
        if (message === error.message) throw error;
        const redacted = new Error(message);
        redacted.name = error.name;
        throw redacted;
      }
      return active() ? redactResult(context, siteUrl!, result as Result) : result;
    });
}
