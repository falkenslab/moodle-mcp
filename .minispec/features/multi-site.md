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

Phase 2, transfers: done (`copy_between_sites`, `src/tools/siteTransfer.ts`).

Apart: elicitation done for `add_site`; not for `login`, which sees the login by itself (ADR-021).

Docs in both languages: done, with the copy-between-sites use case and its screenshots.

## Acceptance

- Phase 1: done; checked with two accounts of the sandbox as two sites.
- Phase 2: done; checked on the sandbox, an activity copied between two sites into a section.
- Docker tests, `--strict` with no warnings, and a sandbox check.
