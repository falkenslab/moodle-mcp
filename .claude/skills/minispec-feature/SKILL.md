---
name: minispec-feature
description: Create a new MiniSpec feature document under .minispec/features/ from the feature template. Use when starting work on a feature, refactor, or migration that needs a short spec.
---

# MiniSpec: new feature

Create a temporal feature document under `.minispec/features/`.

## Steps

1. Read `.minispec/README.md` to honor the standard (writing rules, formats).
2. Read the template `.minispec/templates/feature.md`.
3. Decide where it belongs: Moodle work (reading or writing something in Moodle)
   is a card in `../moodle-driver`, written from its own session; here go cards for
   what the MCP server adds (tools, settings, instructions, wrappers) and a row in
   `driver-tools` for the tools a driver card will need. Personal data: see
   `pseudonymous-mode` and ADR-013.
4. Derive a kebab-case slug for the feature (e.g. `github-sync`). The file is
   `.minispec/features/<slug>.md`. If it already exists, update it instead of
   overwriting blindly.
5. Fill the four sections (Goal / Context / Changes / Acceptance):
   - **Goal** — one sentence.
   - **Context** — current state: what exists, what's missing, why now.
   - **Changes** — short bullet list of the work.
   - **Acceptance** — observable done conditions (the Docker tests, `--strict`,
     and the sandbox's course 3 when it needs a real Moodle).
6. Base content on the real code and the user's description. Don't invent.
7. Once the repository has a GitHub remote (`git remote get-url origin`), open its
   issue, one per feature (`gh issue create -R <owner>/<repo>`): title and body in
   English, for someone who uses the server (what and why, not the file's wording),
   label `feature` (`gh label create feature` if missing), and a last line pointing
   to `.minispec/features/<slug>.md`. Then link the file: a line
   `Issue: [#N](<issue URL>)` right under its title. Give the user the URL. No remote:
   skip it, and never create one yourself.

## Rules

- Max 100 lines. Short sentences and lists. No filler. English.
- This is TEMPORAL knowledge: describe work in progress only.
- Reminder for later: when the feature is done, promote anything permanent it
  revealed (a decision → ADR, a rule → conventions, a term → glossary) and then
  DELETE the feature file. Mention this to the user; do not delete now.
- Its issue, if any, is closed when the feature is implemented (see `minispec-implement`).
