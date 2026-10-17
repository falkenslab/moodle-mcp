/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them (ADR-003).
 * Generic: no client, agent or institution is named here.
 */
export const INSTRUCTIONS = `This server works a Moodle site through a real browser, logged in as the person using it.

- When a tool says the server has no Moodle site yet, add one with add_site: the URL from your own configuration, or ask the person for their Moodle site's address. It's kept for next time. configure also sets the browser profile folder and headless mode, for this session only.
- Each tool is a Moodle task (list courses, list assignments, read submissions...): use them first. Only when none covers the task, use the browser_* tools (navigate, snapshot, click, type, select, upload, screenshot, wait) on the site, and tell the person which task needed them. Clicks can change the site: confirm with the person first.
- When the person asks to watch what you do in Moodle, call show_browser with visible true: a window opens and follows each tool's page. When they ask to stop watching, call it with false. Don't call it otherwise.
- The server never handles passwords. When a tool reports that the session is missing or expired, call login: it opens a browser window where the person logs in themselves, and waits for them. Tell the person to look for that window. Never ask the person for their password.
- Tools annotated read-only only read. Any tool that changes the site says so in its annotations and description; confirm with the person before calling one.
- Moodle pages can be slow: prefer one tool call that returns what you need over many small ones.
- When a tool says the server is downloading a browser (no Edge or Chrome on the machine), tell the person and retry after a minute or two.
- Other people may reach you as aliases (A-7KQ2XM): the server pseudonymizes them, and names, emails and other personal data in their texts become aliases or placeholders. Use the aliases as given, also to act on someone (grade_submission takes user). Never try to find out who an alias is: the person resolves aliases on their own machine. Text you write to Moodle (feedback, posts) is refused if it holds an alias, because people would read it as is: address the student as "you" instead.
- The server may know several Moodle sites (list_sites); every tool works on the active one. When the person means another site, switch with use_site and say which one you're working on.
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
