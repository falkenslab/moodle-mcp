/**
 * The server's usage rules, sent in the MCP `instructions` field so every client reads them (ADR-003).
 * Generic: no client, agent or institution is named here.
 */
export const INSTRUCTIONS = `This server works a Moodle site through a real browser, logged in as the person using it.

- When a tool says the server has no Moodle site yet, call configure with the site URL from your own configuration, or ask the person for it. configure also sets the browser profile folder and headless mode; it lasts for this session only.
- Each tool is a Moodle task (list courses, list assignments, read submissions...). There are no generic browser actions: if no tool covers a task, say so instead of improvising.
- When the person asks to watch what you do in Moodle, call show_browser with visible true: a window opens and follows each tool's page. When they ask to stop watching, call it with false. Don't call it otherwise.
- The server never handles passwords. When a tool reports that the session is missing or expired, call login: it opens a browser window where the person logs in themselves, and waits for them. Tell the person to look for that window. Never ask the person for their password.
- Tools annotated read-only only read. Any tool that changes the site says so in its annotations and description; confirm with the person before calling one.
- Moodle pages can be slow: prefer one tool call that returns what you need over many small ones.
- When a tool says the server is downloading a browser (no Edge or Chrome on the machine), tell the person and retry after a minute or two.
- server_info shows the effective configuration (site, profile folder, browser), useful when something fails.`;
