# ADR-022: Advanced tools, off by default

## Decision

Tools for areas few people use are **advanced**: they exist only with `MOODLE_MCP_ADVANCED=true` (`--advanced`), off by default. The advanced areas are BigBlueButton, competencies, external tools (LTI), the content bank, notes about participants and course blocks; the list is `ADVANCED_TOOLS` in `src/tools/advanced.ts`. It combines with the role (ADR-018), access (ADR-020), scopes (ADR-015) and student data (ADR-016): an advanced tool exists when the setting and all four allow it. Only the person turns it on, at start-up; `configure` can't, since it only narrows. Decided by the owner, 18 October 2026.

## Motivation

moodle-driver 0.10.0 brings eighteen more areas: wiring them all would take the server from 174 tools to about 260, and their descriptions from about 40,000 tokens to about 60,000. Claude Code loads tools as it needs them, but Claude Desktop, Codex and most clients load every tool at the start of each chat, and an agent picks worse among more tools. The roles and scopes cut by who works and on what data, not by how often a tool is needed.

Rejected: letting the count grow (every chat pays for areas most people never touch); one tool per area with an `action` input (against one tool per Moodle task, ADR-004, with schemas full of fields that apply to one action only).

## Consequences

- Without the setting, the default stays near 225 tools; a person who uses one of those areas turns them all on with one setting, and `server_info` says whether they're on.
- An area is advanced by how rarely it's used, decided when it's wired (a card says so); moving one in or out later is a change clients notice, recorded in the release notes.
- The tools reference marks advanced tools, and the limits page explains the setting with its count.
- Tests cover that advanced tools are absent by default, present with the setting, and that `configure` can't turn them on.
