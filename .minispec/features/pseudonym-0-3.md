# Use pseudonym 0.3.0

Issue: [#54](https://github.com/falkenslab/moodle-mcp/issues/54)

## Goal

moodle-mcp runs on `@falkenslab/pseudonym` 0.3.0, and its docs say when the new plain storage fits.

## Context

- `package.json` depends on `@falkenslab/pseudonym@^0.2.1`; `src/people.ts` uses `remember`, `resolve` and `redact`.
- pseudonym 0.3.0 adds an opt-in plain storage (`PSEUDONYM_STORAGE=plain`): a readable `directory.json`, no key, random aliases, protected only by the folder's permissions. Encrypted stays the default; aliases and existing directories don't change. A folder never switches mode by itself, and `pseudonym migrate` converts one.
- The privacy page (`docs/content/privacy.md`, "Where aliases come from") describes only the key and the encrypted directory.

## Changes

- Bump `@falkenslab/pseudonym` to `^0.3.0`.
- Privacy page, in English and Spanish: the plain storage as an option for a folder the system already protects (what it gives up: anyone who can read the folder can undo every alias), with `PSEUDONYM_STORAGE` set in the server's environment and in the terminal where `pseudonym` runs, and a link to https://falkenslab.github.io/pseudonym/docs/guides/storage.

## Acceptance

- The verify gate passes on the new version, with the default storage.
- The privacy page in both languages describes both storage modes.
