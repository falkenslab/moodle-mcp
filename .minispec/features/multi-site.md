# Several Moodle sites in one server

Issue: [#16](https://github.com/falkenslab/moodle-mcp/issues/16)

## Goal

One server works with several Moodle sites at once, and moves content between them itself, so an agent can reuse a teacher's courses across campuses without repeating every tool per site.

## Context

- A server is one site today: `MOODLE_URL` (or `configure`), one browser profile (`MOODLE_MCP_PROFILE_DIR`, `~/.moodle-mcp/profile` by default), about 140 tools. One server per site works, but each repeats the tool definitions in the model's context, the model confuses sites, the list is fixed in the client's config, and content between them would pass through the model.
- Aliases are already per site: `src/people.ts` remembers people under the service `moodle@<host>` (`serviceOf`), so the same Moodle user id on two sites gets two aliases.
- moodle-driver has `backupCourse` (to a `.mbz` file, without users' data unless asked) and `restoreCourse` (into a new or an existing course, merged or replacing), and `importActivities` (within one site). It has no backup of a single activity or section: a transfer of less than a course needs one there (an issue in its repository, from its session).
- Clients like agent-kit restart the server when their settings change, and give a plugin `CLAUDE_PLUGIN_DATA`, a folder kept across sessions and removed with the plugin.
- Owner's proposal and comments in #16 (13 October 2026).

## Changes

- An ADR first: sites in one server (a `site` input, optional with one site), where each site's session and the server's state live, transfers through backup and restore, and how the limits (ADR-015, 016, 018, 020) apply to every site alike.
- Sites from configuration (a list of `name=url`, an environment variable or argument; `MOODLE_URL` names the first) and at run time: `list_sites` (read-only: name, URL, logged in or not), `add_site({ name, url })` (opens the browser to log in), `remove_site` (forgets a run-time site and its session; a configured one only goes from the configuration).
- Each site its own browser context and session; two accounts on one host are two sites. To check with moodle-driver how its browser manager and session file hold several sites.
- Every tool that touches Moodle takes `site`; the tool definitions don't grow with the number of sites.
- `copy_activity({ from: { site, course, activity }, to: { site, course, section } })`, and the same for a section, a whole course and a question bank: backup on one site, restore on the other, without users' data, the file never passing through the model. The result names what was created and what to check (dates, groups, grade settings, links between activities).
- Elicitation (`elicitation/create`) when the client supports it: `add_site` asks the person for the URL and name, `login` for a confirmation once they've logged in; without it, today's arguments and wait.
- State that survives a restart: with `CLAUDE_PLUGIN_DATA` and no `MOODLE_MCP_PROFILE_DIR`, profiles and the sites added at run time go under `${CLAUDE_PLUGIN_DATA}`; otherwise next to the profile. `configure` stays in memory and only narrows.
- Docs: the site's settings, limits and a use case moving an activity between two sites; the tools reference.

## Acceptance

- With two sandbox sites (two Docker Moodles, or one with two accounts), `list_courses` gives each site's courses by `site`, and the client's tool list is the same length as with one site.
- An activity and a section copied from a course on one site into a course on the other arrive with their settings and files, and no users' data.
- An alias from one site is unknown on the other.
- `MOODLE_URL` alone works as today, with no `site` input needed.
- Sites added at run time are there after a restart; with `CLAUDE_PLUGIN_DATA`, the profiles live under it.
- Docker tests, `--strict` with no warnings, and a sandbox check.
