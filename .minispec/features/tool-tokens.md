# Measure the tools' tokens

Issue: [#45](https://github.com/falkenslab/moodle-mcp/issues/45)

## Goal

The limits page gives how many tokens the tools' descriptions take, per role and profile, measured rather than estimated.

## Context

- The limits page says "about 54,600 tokens" for every tool, "about 52,800" for a teacher's and so on; since 0.3 these figures are scaled in proportion to the characters of `tools/list`, from an earlier figure nobody recorded how it was measured.
- Anthropic's token counting endpoint (`messages/count_tokens`) counts a list of tools exactly, for a given model; it needs an API key, which this repository's sessions don't have.
- Claude Code loads tools as it needs them; Claude Desktop, Codex and most clients load them all, so the figure is what they pay per chat.

## Changes

- A script in `scripts/` that lists the tools for each row of the limits page (all, teacher, student, the content profile, the advanced ones) and counts them with `count_tokens`, `ANTHROPIC_API_KEY` from the environment, never stored.
- The limits page in both languages with the measured figures, and how to measure them again on the developers' page.

## Acceptance

- The script prints each row's tools and tokens; the limits page matches it.
- Run again by any release that changes the tools.
