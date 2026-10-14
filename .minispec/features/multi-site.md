# Several Moodle sites in one server

Issue: [#16](https://github.com/falkenslab/moodle-mcp/issues/16)

## Goal

One server knows several Moodle sites, works on one at a time, and moves content between them itself, so a teacher can reuse their courses across campuses without a server per site.

## Context

- A server is one site today: `MOODLE_URL` (or `configure`), one browser profile (`MOODLE_MCP_PROFILE_DIR`, `~/.moodle-mcp/profile` by default), about 140 tools. One server per site works, but repeats every tool, fixes the list of sites in the client's config, and content between them would pass through the model.
- Aliases are already per site: `src/people.ts` remembers people under the service `moodle@<host>` (`serviceOf`), so the same Moodle user id on two sites gets two aliases.
- moodle-driver 0.8 (falkenslab/moodle-driver#57) backs up part of a course (`backupCourse` with `sections` and `activities`, without people's data, anonymous by default) and restores it at a chosen place (`restoreCourse` with `sectionId` or `afterSectionId`, returning what it created and `warnings` for what it left broken); `backup_course` and `restore_course` already take those options. It also reads a backup without a browser (`backupContents`) and anonymizes one (`anonymizeBackup`). One browser profile can hold sessions for several sites; two accounts on one site need two profiles.
- Clients like agent-kit restart the server when their settings change, and give a plugin `CLAUDE_PLUGIN_DATA`, a folder kept across sessions and removed with the plugin.
- Owner's proposal and comments in #16. Chosen on 13 October 2026, over a `site` input on every tool: an active site, as `configure` sets the URL today. The tools don't change, a single-site setup pays nothing for it, and only transfers name two sites.

## Changes

Phase 1, the active site: done (ADR-021, `src/sites.ts`, `src/tools/sites.ts`, the site's several-sites page).

Phase 2, transfers (the driver's part is in 0.8):

- `copy_activity({ from: { site, course, activity }, to: { site, course, section } })`, and the same for a section and a whole course: backup on one site, restore on the other, without users' data, the file never passing through the model. The result names what was created and what to check (dates, groups, grade settings, links between activities). These tools take both sites; they change the target only.

Apart, useful with one site too:

- Elicitation (`elicitation/create`) when the client supports it: `add_site` asks the person for the URL and name, `login` for a confirmation once they've logged in; without it, today's arguments and wait.

Docs in both languages: settings, a page on several sites, a use case moving an activity between two sites, the tools reference.

## Acceptance

- Phase 1: done; checked with two accounts of the sandbox as two sites.
- Phase 2: an activity, a section and a course copied from one site to the other arrive with their settings and files, and no users' data.
- Docker tests, `--strict` with no warnings, and a sandbox check.
