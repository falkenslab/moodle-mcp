# A documentation site

Issue: [#15](https://github.com/falkenslab/moodle-mcp/issues/15)

## Goal

A Docusaurus site in `docs/`, in English and Spanish, published on GitHub Pages, that teaches using moodle-mcp with Claude Code, Claude Desktop and Codex CLI through real use cases with screenshots; the README shrinks to a front door.

## Context

- The README carries everything today (installing, privacy, limits, 137 tools, settings, troubleshooting) and `docs/development.md` the rest; moodle-driver already has a Docusaurus site in `docs/` published by a GitHub Actions workflow, the pattern to follow.
- Decided by the owner (12 October 2026): English and Spanish; Claude Code, Claude Desktop and Codex CLI; screenshots from real sessions (`claude -p`, `codex exec`) with the server running in Docker against the sandbox, plus real Moodle screenshots of the results; npm before the site, so its install instructions work.

## Changes

- `docs/` as a Docusaurus site (`content/`, `i18n/es/`, `static/img/` with the logo), `docs.yml` building it on pull requests and publishing it to GitHub Pages from `main`; Pages enabled for the repository.
- Pages: introduction; getting started per client (Claude Code, Claude Desktop, Codex CLI), the first login, watching the browser; use cases as a teacher and as a student, each with the conversation and Moodle's result; students' privacy; limits (role, read only, scopes, student data); settings; troubleshooting; development.
- A tools reference generated from the server's own `tools/list`, so it can't drift; a script for it, run on build.
- Screenshots: the real Claude Code and Codex interfaces, run interactively in Docker in a web terminal (ttyd) with the server and the sandbox, typed and photographed by Playwright, with temporary copies of the owner's client credentials deleted afterwards (decided 12 October 2026); Moodle's pages photographed the same way; outputs in `docs/static/img/`, sandbox data only, aliases as they come. Commands and their output are HTML terminals (`<Terminal>`), selectable and copyable, not images.
- README: logo, one paragraph, quick install for Claude Code and Codex, a link to the site; `docs/development.md` moves into the site's developers pages, and `docs/tool-catalog.md`, a planning document, to `.minispec/`.
- Versions: each release snapshots the docs (`docs:version`, in the `release` skill), shown in a version menu, the current docs under `/next`.

## Acceptance

- `falkenslab.github.io/moodle-mcp` serves the site in both languages, with search, and builds on every pull request.
- Each use case shows a real session and its result in Moodle; the tools reference lists the server's tools as they are.
- The README fits in one screen and links to the site.
