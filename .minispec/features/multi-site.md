# Several Moodle sites in one server

Issue: [#16](https://github.com/falkenslab/moodle-mcp/issues/16)

## Goal

One server knows several Moodle sites, works on one at a time, and moves content between them itself, so a teacher can reuse their courses across campuses without a server per site.

## Context

- A server is one site today: `MOODLE_URL` (or `configure`), one browser profile (`MOODLE_MCP_PROFILE_DIR`, `~/.moodle-mcp/profile` by default), about 140 tools. One server per site works, but repeats every tool, fixes the list of sites in the client's config, and content between them would pass through the model.
- Aliases are already per site: `src/people.ts` remembers people under the service `moodle@<host>` (`serviceOf`), so the same Moodle user id on two sites gets two aliases.
- moodle-driver has `backupCourse`, `restoreCourse` (into a new or an existing course) and `importActivities` (within one site); nothing backs up less than a course: falkenslab/moodle-driver#57, which also asks how its browser manager holds several sites.
- Clients like agent-kit restart the server when their settings change, and give a plugin `CLAUDE_PLUGIN_DATA`, a folder kept across sessions and removed with the plugin.
- Owner's proposal and comments in #16. Chosen on 13 October 2026, over a `site` input on every tool: an active site, as `configure` sets the URL today. The tools don't change, a single-site setup pays nothing for it, and only transfers name two sites.

## Changes

Phase 1, the active site (no driver work):

- An ADR: a list of sites and one active at a time; where sessions and the server's state live; the limits (ADR-015, 016, 018, 020) the same on every site.
- Sites from configuration (`MOODLE_MCP_SITES` or `--sites`: a JSON object from name to URL or to `{ url, … }`, or a list of URLs and `name=url` items; `MOODLE_URL` alone is a one-site list) and at run time: `list_sites` (read-only: name, URL, active, logged in or not), `add_site({ name, url })`, `use_site(name)` (the active site; the browser opens to log in when it has no session), `remove_site` (a run-time site and its session; a configured one only goes from the configuration).
- Each site its own browser profile and session (two accounts on one host are two sites), each under the data folder by name; the 137 tools work on the active site, unchanged.
- `server_info` and the instructions name the active site; an agent switches with `use_site` and says so.
- State that survives a restart: with `CLAUDE_PLUGIN_DATA` and no `MOODLE_MCP_PROFILE_DIR`, profiles and the run-time sites go under `${CLAUDE_PLUGIN_DATA}`; otherwise in the data folder next to the profile. `configure` stays in memory and only narrows.

Phase 2, transfers (after moodle-driver#57):

- `copy_activity({ from: { site, course, activity }, to: { site, course, section } })`, and the same for a section and a whole course: backup on one site, restore on the other, without users' data, the file never passing through the model. The result names what was created and what to check (dates, groups, grade settings, links between activities). These tools take both sites; they change the target only.

Apart, useful with one site too:

- Elicitation (`elicitation/create`) when the client supports it: `add_site` asks the person for the URL and name, `login` for a confirmation once they've logged in; without it, today's arguments and wait.

Docs in both languages: settings, a page on several sites, a use case moving an activity between two sites, the tools reference.

## Acceptance

- Phase 1: with two sandbox sites (two Docker Moodles, or one with two accounts), `use_site` switches between them, `list_courses` gives the active site's courses, and the tool list has only the new site tools more than with one site; `MOODLE_URL` alone works as today; run-time sites are there after a restart, under `CLAUDE_PLUGIN_DATA` when it's given; an alias from one site is unknown on the other.
- Phase 2: an activity, a section and a course copied from one site to the other arrive with their settings and files, and no users' data.
- Docker tests, `--strict` with no warnings, and a sandbox check.
