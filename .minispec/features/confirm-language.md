# Confirmations in the person's language

Issue: [#53](https://github.com/falkenslab/moodle-mcp/issues/53)

## Goal

The question moodle-mcp asks before what can't be undone is in the person's language, at least Spanish, and English otherwise.

## Context

- `src/tools/confirm.ts` asks through MCP elicitation (ADR-023): a message built from `CONFIRMED[tool].what(args)`, "This can't be undone. Go ahead?", and a field "Yes, do it" / "Leave it unticked, or decline, to change nothing". All in English, also inside a Spanish chat.
- agent-kit (falkenslab/agent-kit#86, closed) settled on the standard way to tell a server the language: an extension's local servers get the session's locale, `LANG` and `LC_MESSAGES` (`es_ES.UTF-8`), and `LC_ALL` when the system sets one. Any other client or terminal sets the same variables, so reading them works everywhere, not only under agent-kit.
- The tools' own texts (descriptions, errors) stay in English: they're for the AI, which translates; the confirmation is the one text the person reads straight from the server.

## Changes

- The language from the locale, as programs read it: `LC_ALL`, else `LC_MESSAGES`, else `LANG`; `es` (any `es_*`) gives Spanish, anything else or nothing gives English.
- `CONFIRMED`'s `what` and the question's fixed texts in English and Spanish, chosen once at startup.
- `server_info` says the confirmations' language; the docs (limits or settings, English and Spanish) say how it's chosen.

## Acceptance

- Tests: with `LANG=es_ES.UTF-8` the elicitation's message and field are in Spanish, with `LC_ALL=C` or no locale in English, for every tool in `CONFIRMED` (none left untranslated).
- In agent-kit with a Spanish session, deleting a label in the sandbox's course 3 asks in Spanish.
