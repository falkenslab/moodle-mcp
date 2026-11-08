---
title: Settings
sidebar_label: Settings
---

# Settings

Nothing is required: without a site, the agent asks you for one the first time, and everything else has a sensible default. Each setting is an environment variable of the server, set where you added it ([Claude Code](./getting-started/claude-code.md), [Claude Desktop](./getting-started/claude-desktop.md), [Codex](./getting-started/codex.md), [agent-kit](./getting-started/agent-kit.md)), or a command-line argument after the package name (`npx -y @falkenslab/moodle-mcp --role teacher`); if both are given, the argument wins.

## At a glance

| Setting | Default | For |
| --- | --- | --- |
| [`MOODLE_URL`](#moodle_url) | none: the agent asks | Your Moodle site |
| [`MOODLE_MCP_SITES`](#moodle_mcp_sites) | none | Several sites |
| [`MOODLE_MCP_COURSES`](#moodle_mcp_courses) | every course | Only these courses, your classrooms |
| [`MOODLE_MCP_ROLE`](#moodle_mcp_role) | `all` | A teacher's or a student's tools |
| [`MOODLE_MCP_ACCESS`](#moodle_mcp_access) | `write` | Read only, or read and change |
| [`MOODLE_MCP_SCOPES`](#moodle_mcp_scopes) | `all` | The kinds of data it may touch |
| [`MOODLE_MCP_STUDENT_DATA`](#moodle_mcp_student_data) | `pseudonymize` | What the AI sees of other people |
| [`MOODLE_MCP_ADVANCED`](#moodle_mcp_advanced) | `false` | The advanced tools |
| [`MOODLE_MCP_CONFIRM`](#moodle_mcp_confirm) | `elicit` | Who asks you before what can't be undone |
| [`MOODLE_MCP_CHANNEL`](#moodle_mcp_channel) | Edge, Chrome, Chromium | Which browser |
| [`MOODLE_MCP_HEADLESS`](#moodle_mcp_headless) | `true` | Whether you see the browser |
| [`MOODLE_MCP_PROFILE_DIR`](#moodle_mcp_profile_dir) | `~/.moodle-mcp/profile` | Where your login is kept |
| [`MOODLE_MCP_DOWNLOAD_BROWSER`](#moodle_mcp_download_browser) | `true` | Downloading a browser when there's none |
| [`MOODLE_MCP_TRAIL`](#moodle_mcp_trail) | `realistic` | How activities are done as a student |

Below, each one: its values (the default in bold), an example, and whether the agent can change it during a chat. It can only ever make things stricter, through its `configure` tool, never looser than what you set; ask it in your own words, such as "for this chat, only read".

## Your site and your courses

### `MOODLE_URL` {#moodle_url}

Your Moodle site, `--url`. Any page of it works: the site's address, a course's, the login page.

- Its address, such as `https://campus.example.org`.
- **Not set**: the agent asks you for it the first time, and keeps it among the server's sites.

`MOODLE_URL=https://campus.example.org`. **In a chat**: the agent can switch to another of your sites (`use_site`), or add one if you have no [classrooms](#moodle_mcp_courses).

### `MOODLE_MCP_SITES` {#moodle_mcp_sites}

Several sites, each with a name, `--sites`; the first is where it starts, and each keeps its own login. See [Several sites](./several-sites.md).

- `name=address`, separated by commas: `school=https://campus.myschool.org,uni=https://moodle.myuni.edu`.
- Or JSON: `{"school": "https://campus.myschool.org"}`.
- **Not set**: only `MOODLE_URL`'s site, or the ones the agent adds when you ask.

**In a chat**: switching between them (`use_site`), adding one ("add my university's Moodle").

### `MOODLE_MCP_COURSES` {#moodle_mcp_courses}

The only courses the agent works in, your classrooms, `--courses`; their sites are added, so you need neither `MOODLE_URL` nor `MOODLE_MCP_SITES`. See [Classrooms](./limits.md#classrooms).

- Their URLs, separated by commas: `https://campus.myschool.org/course/view.php?id=12,https://moodle.myuni.edu/course/view.php?id=7`.
- **Not set**: every course of yours.

With classrooms, another course, and anything not read in a classroom, is refused; the browser tools, messages and notifications are off. **In a chat**: fewer of them, never more.

## What the agent may do

### `MOODLE_MCP_ROLE` {#moodle_mcp_role}

Which tools the agent gets, by what you do in Moodle, `--role`. Fewer tools, better choices. See [Your role](./limits.md#your-role).

- **`all`**: every tool, for teaching and for studying.
- `teacher`: building and running courses, grading, people, reports, forums and messages.
- `student`: reading courses, doing activities, your grades and to-dos, forums and messages.

`MOODLE_MCP_ROLE=teacher`. **In a chat**: from `all` to one role, never back.

### `MOODLE_MCP_ACCESS` {#moodle_mcp_access}

Whether the agent may change Moodle, `--access`. See [Read only](./limits.md#read-only).

- **`write`**: it reads and changes: grades, posts, creates.
- `read`: it only looks; the tools that change something aren't there.

`MOODLE_MCP_ACCESS=read`. **In a chat**: from `write` to `read`, never back.

### `MOODLE_MCP_SCOPES` {#moodle_mcp_scopes}

The kinds of data its tools may touch, `--scopes`: a profile, or a list of scopes. See [Scopes](./limits.md#scopes).

- **`all`**: everything.
- `content`: building courses only (activities, sections, question banks, rubrics, the calendar, the gradebook's setup), never students' work or grades.
- `teacher`, `student`: the kinds a role needs.
- A list, such as `content,communication`, from: `content`, `student-data`, `grading`, `communication`, `as-student`, `browser`.

`MOODLE_MCP_SCOPES=content`. **In a chat**: fewer, never more.

### `MOODLE_MCP_STUDENT_DATA` {#moodle_mcp_student_data}

What the AI sees of other people, `--student-data`. See [Students' privacy](./privacy.md).

- **`pseudonymize`**: aliases such as `A-7KQ2XM`, never their names or Moodle ids; names, emails and the like in what they wrote are replaced.
- `block`: nothing about them: the tools on other people's data aren't there.
- `clear`: their names, as Moodle shows them. Only for an AI on your own computer.

**In a chat**: stricter only (`clear`, then `pseudonymize`, then `block`).

### `MOODLE_MCP_ADVANCED` {#moodle_mcp_advanced}

The advanced tools, `--advanced`: areas few people use, off so every chat doesn't pay for their descriptions. See [Advanced tools](./limits.md#advanced-tools).

- **`false`**: left out.
- `true`: added: course blocks, the content bank, BigBlueButton, competencies, notes about participants and external tools (LTI).

**In a chat**: no; only you turn them on.

### `MOODLE_MCP_CONFIRM` {#moodle_mcp_confirm}

Who asks you before what can't be undone (deleting, unenrolling, resetting a course, restoring over one), `--confirm`. See [Confirming what can't be undone](./limits.md#confirming-what-cant-be-undone).

- **`elicit`**: moodle-mcp asks you itself, in your app, with ten minutes to answer. In an app that can't ask (no MCP elicitation), those tools are refused.
- `client`: your app already asks you before every tool, so moodle-mcp doesn't; for such an app without elicitation.

**In a chat**: no; only you set it.

## The browser

### `MOODLE_MCP_CHANNEL` {#moodle_mcp_channel}

Which browser moodle-mcp works in, `--channel`.

- **Not set**: Edge, then Chrome, then Chromium, the first it finds.
- `msedge`: Microsoft Edge. `chrome`: Google Chrome.
- `chromium`: Chromium, downloaded the first time if needed.
- `firefox`: Playwright's own Firefox, downloaded the first time, never the one you have installed.

`MOODLE_MCP_CHANNEL=firefox`. **In a chat**: no.

### `MOODLE_MCP_HEADLESS` {#moodle_mcp_headless}

Whether you see the browser, `--headless` or `--headed`.

- **`true`**: it works out of sight; a window opens only to log in, or when you ask to watch ([Watching the agent](./getting-started/watching.md)).
- `false`: a visible window all the time.

**In a chat**: yes, either way.

### `MOODLE_MCP_PROFILE_DIR` {#moodle_mcp_profile_dir}

The folder that keeps your login on the first site, `--profile-dir`; other sites keep theirs in the server's data folder. A profile can be open in one browser at a time: two sessions using moodle-mcp at once on one site need a folder each.

- A folder; **`~/.moodle-mcp/profile`** by default. Inside a Claude Code plugin, the plugin's data folder.

**In a chat**: yes, for that session.

### `MOODLE_MCP_DOWNLOAD_BROWSER` {#moodle_mcp_download_browser}

What to do when there's no Edge or Chrome, `--no-download-browser`.

- **`true`**: download Chromium, once.
- `false`: never download a browser; without one, it says so.

**In a chat**: no.

### `MOODLE_MCP_TRAIL` {#moodle_mcp_trail}

How activities are done as a student, `--trail`.

- **`realistic`**: through the real pages, at a reader's pace, so Moodle records views and completion as for a person.
- `fast`: straight to the result.

**In a chat**: yes.

A setting left empty, or that your app passes as an unexpanded `${…}`, counts as not set: its default applies, and `server_info` lists the ones that came so.

## Changing them later

| Where you added it | How |
| --- | --- |
| Claude Code | `claude mcp remove moodle` and add it again, with the same scope; or edit its `env` and reconnect it in `/mcp` |
| Claude Desktop | Edit `claude_desktop_config.json`, then quit and open Claude Desktop |
| Codex | Edit `[mcp_servers.moodle.env]` where you set it up; a new session takes it |
| agent-kit | `/extensions config moodle-teacher access=read` in the chat, or `<agent> extension config …` in a terminal |
| Any of them, during a chat | Ask the agent, within what each setting above allows |

## Sharing the session with moodle-driver

If you also use the `moodle` command line from [moodle-driver](https://falkenslab.github.io/moodle-driver/), both can share one login: point `MOODLE_MCP_PROFILE_DIR` at the command line's profile for your site, `~/.moodle-driver/sites/<host>/profiles/<account>`. A profile can only be open in one browser at a time, so the two can't use it at the same moment.
