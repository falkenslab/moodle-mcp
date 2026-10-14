---
title: Several Moodle sites
sidebar_label: Several sites
---

# Several Moodle sites

One moodle-mcp can work with several Moodle sites: your school's and your university's, last year's and this year's, or two accounts on the same site (your teacher account and a test student). It knows them all and works on **one at a time, the active site**; you tell the agent when to switch.

## Setting your sites

Give them in `MOODLE_MCP_SITES`, as a list or as JSON. The first is active when the server starts.

<Terminal>{`
$ claude mcp add moodle -e MOODLE_MCP_SITES=school=https://campus.example.org,uni=https://moodle.uni.example.es -- npx -y @falkenslab/moodle-mcp
`}</Terminal>

- **A list:** sites separated by commas, each `name=url`, or just its URL, which names it after its host (`https://campus.example.org` is the site `campus.example.org`).
- **JSON:** `{"school": "https://campus.example.org", "uni": {"url": "https://moodle.uni.example.es"}}`. Handy in a configuration file; on a command line, the list is easier to type.
- Names are short: letters, digits, dots and hyphens. Two accounts on one site are two sites with different names: `teacher=https://campus.example.org,student=https://campus.example.org`.

`MOODLE_URL` still works, alone or with `MOODLE_MCP_SITES`: its site comes first.

## Switching

Ask in your own words:

> Switch to my university's Moodle.

The agent calls `use_site`, and every tool works on that site from then on. The first time you use a site, a browser window opens for you to log in there, as with the first site. Each site keeps its own session.

To see them all:

> Which Moodle sites do you know?

## Adding a site while you work

You don't need to change your configuration to add a site: ask the agent.

> Add the Moodle site https://moodle.uni.example.es, as "uni".

If you don't say which site, and your AI app can ask you itself (MCP elicitation), a small form opens in the app for its address and name: they go straight to moodle-mcp, not through the AI.

The site is kept for later sessions. To forget it, and delete its session:

> Remove the site "uni".

The agent asks you first. Sites from your configuration can only be removed there.

## Copying between sites

The agent can copy course content from one of your sites to another: some activities, some sections, or a whole course.

> Copy the quiz "Loops: quick check" and the page "How a for loop works" from my course Programming 1 on "school" to my course Python on "uni", into its first section.

moodle-mcp does it through Moodle's own backup on the first site and restore on the second, with the `copy_between_sites` tool:

- **Settings and files travel with the content**: a quiz keeps its questions and options, a page its images, a folder its files.
- **People's data never does**: no submissions, grades, posts or names. The copy names no one, and not even the site it came from.
- **Nothing passes through the AI**: the backup file stays on your computer, and is deleted once restored.
- **You hear what to check**: activities that depended on something not copied (a restriction, a link to another activity) are listed for you to fix.

Both sites need their session: if one has none, the agent tells you to log in there. The site you were working on stays active. Within one site, the agent copies with Moodle's import instead.

## Where sessions are kept

Each site has its own browser profile, so its own session:

- The first site keeps the usual one, `~/.moodle-mcp/profile` (or `MOODLE_MCP_PROFILE_DIR`): if you already used moodle-mcp, you don't log in again.
- Every other site's is in `~/.moodle-mcp/sites/<name>/profile`, and the sites you added while working are listed in `~/.moodle-mcp/sites.json`.
- When moodle-mcp runs inside a Claude Code plugin, all of it goes in the plugin's own data folder instead, and is deleted with the plugin.

## Privacy and limits

- **Students stay anonymous on every site.** Each site has its own aliases: nobody on one site is linked to anyone on another.
- **Your limits apply to every site alike**: the role, read-only access, scopes and student data level are the server's, not a site's. See [Limiting the agent](./limits.md).
