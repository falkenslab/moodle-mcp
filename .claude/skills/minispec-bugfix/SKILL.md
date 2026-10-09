---
name: minispec-bugfix
description: Document a bug and its fix as a MiniSpec bugfix note under .minispec/features/ from the bugfix template. Use when fixing a non-trivial bug worth recording.
---

# MiniSpec: new bugfix

Document a bug and its fix using the bugfix format. It is temporal knowledge, so
it lives under `.minispec/features/`.

## Steps

1. Read `.minispec/README.md` for the standard.
2. Read the template `.minispec/templates/bugfix.md`.
3. Decide where the bug is: in how Moodle is read or written (moodle-driver), in
   aliases or redaction (pseudonym), or in this server (tools, settings, wrappers).
   A sibling's bug gets its note in that repository, from its session: say so here.
4. Create `.minispec/features/fix-<slug>.md` with `<slug>` in kebab-case.
5. Fill the four sections:
   - **Problem** — observable symptom (as an agent or the person sees it).
   - **Cause** — root cause.
   - **Solution** — what was changed.
   - **Verification** — how the fix was confirmed (a regression test in Docker, the
     sandbox when it took a real Moodle, with its Moodle version).
6. Once the repository has a GitHub remote (`git remote get-url origin`), open its
   issue, one per note: title and body in English (the symptom and the cause), label
   `fix` (`gh label create fix` if missing), and a last line pointing to
   `.minispec/features/fix-<slug>.md`. Then link the note: a line
   `Issue: [#N](<issue URL>)` right under its title. When the fix is committed, close
   it as `minispec-implement` says. No remote: skip it.

## Rules

- Max 100 lines. Short and factual. Base it on the real diff. English.
- A bug fixed gets a regression test (a convention).
- Temporal: once the fix is merged and verified, delete this file. If the fix
  revealed a permanent lesson (a rule, a decision), promote it to `core/` or an
  ADR first. Mention this; do not delete now.
