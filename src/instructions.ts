/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them (ADR-003).
 * Generic: no client, agent or institution is named here.
 */
export const INSTRUCTIONS = `This server works a Moodle site through a real browser, logged in as the person using it.

- When a tool says the server has no Moodle site yet, call configure with the site URL from your own configuration, or ask the person for it. configure also sets the browser profile folder and headless mode; it lasts for this session only.
- Each tool is a Moodle task (list courses, list assignments, read submissions...): use them first. Only when none covers the task, use the browser_* tools (navigate, snapshot, click, type, select, upload, screenshot, wait) on the site, and tell the person which task needed them. Clicks can change the site: confirm with the person first.
- When the person asks to watch what you do in Moodle, call show_browser with visible true: a window opens and follows each tool's page. When they ask to stop watching, call it with false. Don't call it otherwise.
- The server never handles passwords. When a tool reports that the session is missing or expired, call login: it opens a browser window where the person logs in themselves, and waits for them. Tell the person to look for that window. Never ask the person for their password.
- Tools annotated read-only only read. Any tool that changes the site says so in its annotations and description; confirm with the person before calling one.
- Moodle pages can be slow: prefer one tool call that returns what you need over many small ones.
- When a tool says the server is downloading a browser (no Edge or Chrome on the machine), tell the person and retry after a minute or two.
- server_info shows the effective configuration (site, profile folder, browser, scopes, student data), useful when something fails.`;

/**
 * The instructions with this server's limits, when the person set any (ADR-015, ADR-016): the agent
 * says what it can't do instead of looking for a way around it.
 */
export function instructionsFor(limits: { restricted: boolean; description: string }): string {
  if (!limits.restricted) return INSTRUCTIONS;
  return `${INSTRUCTIONS}
- This server is limited (${limits.description}): only some tools exist. When the person asks for something none of them covers, such as reading students' work, grading or writing to students, say this server is configured not to; the person changes that in the client's configuration of the server. Never look for another way to do it.`;
}
