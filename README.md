# moodle-mcp

An [MCP](https://modelcontextprotocol.io) server that works a Moodle site through a real browser. It drives the Edge or Chrome already installed on your machine with Playwright and exposes Moodle tasks as tools (`list_courses`, `list_assignments`, `get_submissions`…), never generic clicks and keystrokes. Any MCP client can use it: Claude Code, Claude Desktop or your own agent.

You log in yourself, in a browser window the server opens: it never sees or stores your password. Your session is kept in a browser profile folder outside the server.

Status: early development. Today it has `configure`, `login`, `logout`, `get_me`, `get_site_info`, `list_courses`, `get_course_structure`, `get_activity_content`, `list_assignments`, `get_submissions`, `list_discussions`, `get_discussion`, `get_my_grades`, `list_pending`, `get_activities_overview`, `list_deadlines`, `get_course_updates`, the quiz attempt tools (`get_quiz_info`, `start_quiz_attempt`, `get_quiz_attempt`, `answer_quiz_questions`, `finish_quiz_attempt`, `get_attempt_review`), `get_assignment`, `save_submission`, `submit_assignment`, `download_file`, `get_survey`, `submit_survey`, `get_choice`, `answer_choice`, `get_lesson_page`, `answer_lesson_page`, `get_h5p_activity`, `set_completion`, `grade_submission`, `list_participants`, `list_groups`, `get_grader_report`, `get_completion_report`, `override_completion`, `get_quiz_results`, `set_quiz_override`, `grant_extension`, `set_discussion_state`, `reply_to_post`, `create_discussion`, `create_activity`, `update_activity`, the course layout tools (`edit_activity`, `duplicate_activity`, `delete_activity`, `add_section`, `edit_section`, `delete_section`), `get_activity_settings`, `update_course`, the question bank tools (`list_question_banks`, `list_questions`, `import_questions`, `create_question`), `get_quiz_structure`, `add_questions_to_quiz`, `get_rubric`, the calendar tools (`list_events`, `create_event`, `delete_event`), the gradebook setup tools (`get_gradebook_setup`, `update_grade_item`, `add_grade_category`), `show_browser`, the browser fallback tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select`, `browser_upload`, `browser_screenshot`, `browser_wait`) and `server_info`; the Moodle tools come one by one.

## Requirements

- Node.js 20 or later.
- Microsoft Edge or Google Chrome installed. Without either, the server downloads Chromium (about 180 MB) the first time it needs a browser, into `PLAYWRIGHT_BROWSERS_PATH` or Playwright's usual cache.

## Configuration

Nothing is required at startup. There are two ways to configure the server, and they can be mixed:

- **At run time, by the client.** The `configure` tool sets the site (`url`: the site or any page of it, such as a course URL), `headless` and `profileDir` for the running server. It checks that the URL is a Moodle site and keeps everything in memory: the server writes no settings. When a tool needs the site and has none, it tells the client to call `configure`, so an agent can pass the values from its own configuration or ask you. This is how a plugin can ship the server with a fixed `.mcp.json`.
- **At startup, the standard way.** Environment variables or command-line arguments (the argument wins) give starting values, which `configure` can still change.

| Variable | Argument | Default | Meaning |
| --- | --- | --- | --- |
| `MOODLE_URL` | `--url` | none | The Moodle site, e.g. `https://campus.example.org` |
| `MOODLE_MCP_PROFILE_DIR` | `--profile-dir` | `~/.moodle-mcp/profile` | Browser profile folder that keeps your session; it can't be inside the server's folder |
| `MOODLE_MCP_CHANNEL` | `--channel` | Edge, then Chrome, then Chromium | Browser to use: `msedge`, `chrome` or `chromium` (the one the server downloads) |
| `MOODLE_MCP_HEADLESS` | `--headless` / `--headed` | `true` | Run the browser without a window (logging in always shows one) |
| `MOODLE_MCP_DOWNLOAD_BROWSER` | `--no-download-browser` | `true` | Download Chromium when no system browser is found |
| `MOODLE_MCP_TRAIL` | `--trail` | `realistic` | How student tools view and do things: `realistic` (real pages, human pace, so Moodle logs views and completion) or `fast` |
| `MOODLE_MCP_SCOPES` | `--scopes` | `all` | The kinds of tools the agent gets: a profile (`all`, `teacher`, `student`, `content`) or a list of scopes (`content`, `student-data`, `grading`, `communication`, `as-student`, `browser`) |
| `MOODLE_MCP_STUDENT_DATA` | `--student-data` | `pseudonymize` | How other people's data reaches the agent: `block` (no tool that reads it or decides about others), `pseudonymize` (as aliases, see below) or `clear` (names as Moodle shows them, for a model that runs on your machine) |

### Limiting what the agent can do

Two settings decide which tools exist for the agent, and only you set them, in the client's configuration of the server: `configure` can narrow them for a session, never widen them.

- **Scopes** choose the kinds of tools. `content` gives an agent that builds and manages courses (activities, sections, content, rubrics' definitions) but never reads students' work, grades or writes to students; `teacher` adds those; `student` is for acting as a student; `all` adds the browser fallback tools. A tool's scope comes from the data moodle-driver says it touches, so new tools are classified on their own.
- **Student data** set to `block` removes every tool that reads others' personal data or decides about others, whatever the scopes, and the browser fallback tools with them. `pseudonymize`, the default, keeps those tools but gives other people as aliases (next section); `clear` gives their names.

Without students' data, `download_file` refuses submitted files and forum attachments, and deleting an activity that may hold students' work (an assignment, a quiz, a forum…) is refused: do that in Moodle yourself. `server_info` shows the limits in force.

### Students as aliases

With `pseudonymize`, the agent never gets another person's name or Moodle user id: each one is an alias such as `A-7KQ2XM`, the same for that person in every course of the site and after a restart, and you can always find out who it is. [@falkenslab/pseudonym](https://www.npmjs.com/package/@falkenslab/pseudonym) makes the aliases from a secret key on your machine and keeps a directory of the people met (alias, name, Moodle user id), never sent anywhere.

- `get_submissions`, `get_discussion`, `list_participants`, `list_groups`, `get_grader_report`, `get_completion_report` and `get_quiz_results` give people as aliases, you with your name. The tools that act on someone (`grade_submission`, `override_completion`, `grant_extension`, `set_quiz_override`) take the alias back (`user`, `users`). `list_discussions` and the quiz review only show names, without ids: a name the directory already knows becomes its alias, any other `[participant]`.
- What others wrote (submissions' text, posts, subjects, file names) goes through pseudonym's redaction: the names of people already met become their aliases, and emails, phone numbers, DNI/NIE and IBANs become placeholders. Street addresses, dates of birth and names of people not met yet stay as written: don't rely on it for free text with sensitive data.
- Text the agent writes to Moodle (feedback, posts) is refused if it holds an alias, since students would read it as is.
- The browser fallback tools, for what no tool covers (a plugin, a rare setting), never open pages about people: participants, profiles, grades, reports, forums, messages, the grader, any page for one user. They're refused, and a click that ends on one says so without reading it. On other pages, the people Moodle links to their profile become aliases, and the rest of the text is redacted as above. A name printed without a link, of someone not met yet, gets through. Screenshots need `clear`, since a picture can't be redacted.
- Others' files (`download_file` on a submission or an attachment) need `clear`: their content can't be pseudonymized.

To see who an alias is, run `npx @falkenslab/pseudonym whois A-7KQ2XM` in your own terminal (`pseudonym reveal` does it for a whole text, such as notes the agent wrote). The key and the directory live in `%APPDATA%\pseudonym` on Windows and `~/.config/pseudonym` elsewhere (`PSEUDONYM_HOME` changes it):

- **Back up the key** (`pseudonym key export`): if it's lost, every alias changes and your notes no longer match anyone.
- **Keep the agent away from them**: in your client's permissions, deny reading that folder and running the `pseudonym` command, or the agent could look the aliases up.

**Before choosing `clear`.** What the model sees with names can stay on the client's side: its memory, its history, a knowledge base. Going back to `pseudonymize` doesn't remove it. The server can't see or clear any of that, and aliases alone won't protect students once their names are there: the agent can match them through what isn't hidden (post ids, dates, content). Use `clear` in a client project or configuration with its own memory, never shared with a model that runs elsewhere. If they were mixed already, delete that memory.

## Logging in

When a tool reports that there is no session, the client calls `login`: a browser window opens at the site's login page and the tool waits (5 minutes by default) until you log in there yourself, SSO included. The session is kept in the profile folder, together with `moodle-mcp-session-cookies.json` (Chromium forgets session cookies on close, so the server saves them), and survives restarts until Moodle ends it.

The profile holds a live Moodle session: treat it like a password and keep it out of shared folders and repositories. Profiles from before moodle-driver 0.2 need to log in once more: the driver renamed the file where it keeps the session.

To watch what the agent does, ask it to show the browser (`show_browser`): a window opens, keeping the session, and each tool brings the Moodle page it works on to the front; ask it to hide the browser, or close the window, to go back to working without one.

Where there's no screen (Linux without `DISPLAY` or `WAYLAND_DISPLAY`: a container, a server), the server never opens a window: `login` and a headed configuration fail with a message instead. Log in where there's a screen and give the server that profile, headless.

## Use from Claude Code

Build it first (see Development), then add it with the CLI:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -- node /path/to/moodle-mcp/dist/server.mjs
```

Or share it with a project in its `.mcp.json`:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "node",
      "args": ["/path/to/moodle-mcp/dist/server.mjs"],
      "env": {
        "MOODLE_URL": "https://campus.example.org",
        "MOODLE_MCP_PROFILE_DIR": "/path/outside/the/project/moodle-profile"
      }
    }
  }
}
```

Without `env`, the client configures it with `configure` the first time a tool needs the site. Claude Desktop takes the same `mcpServers` entry in its `claude_desktop_config.json`. Ask the client to call `server_info` to check the configuration it's running with and where each value came from.

## Development

All the Moodle work is in [@falkenslab/moodle-driver](https://www.npmjs.com/package/@falkenslab/moodle-driver), from npm and bundled into the server. A change to how Moodle is read or written goes there (its own repository); a tool here is a schema, a description and one driver call.

```bash
npm install
npm run build       # bundles src/ into dist/server.mjs
npm run dev         # rebuilds on every change
npm run typecheck
npm run lint
npm test            # opens browsers on your machine
npm run test:docker # the same, in a container with Playwright's Chromium: nothing opens on your desktop
```

`test:docker` runs `scripts/in-docker.mjs`, which wraps any command the same way (`node scripts/in-docker.mjs <command>`): Playwright's image, the repository mounted with Linux `node_modules` of its own, and, when the Moodle sandbox is up, its network, with `localhost:8080` forwarded to it.

To try the server by hand, the MCP Inspector opens a web UI on the built bundle (set `MOODLE_URL` in your shell first):

```bash
npm run inspect
```

Or from the command line, listing the tools (with a schema portability check) and calling one:

```bash
npx @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/list --strict
npx @modelcontextprotocol/inspector --cli node dist/server.mjs -e MOODLE_URL=http://localhost:8080 --method tools/call --tool-name server_info
```

For a real Moodle to test against, [moodle-sandbox](../moodle-sandbox) runs one in Docker with a test course and teacher and student accounts, at `http://localhost:8080`. Log in with its accounts in the browser the server opens; never put credentials in code, tests or docs.

The design and its decisions are in [.minispec/](.minispec/README.md).

## License

[MIT](LICENSE) © Falkenslab
