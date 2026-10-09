---
name: sync-issues
description: Keep moodle-mcp's MiniSpec feature and fix notes (.minispec/features/) and its GitHub issues in sync, in English - open and link the issue a note lacks, close with a solution summary the issue whose note is done. Use when the user asks to sync issues and features, after creating or finishing a note by hand, or when asked what's pending. Only once the repository has a GitHub remote.
---

# Sync features and issues

## 0. Is there a repository?

`git remote get-url origin`. moodle-mcp had no remote when this skill was written: if there's none, stop and say so. **Never create the GitHub repository yourself**; the owner decides when (and whether it's public).

## 1. Collect both sides

```
ls .minispec/features/
gh issue list --state all --label feature --limit 100 --json number,title,state,body
gh issue list --state all --label fix --limit 100 --json number,title,state,body
```

A note is linked when it has an `Issue: [#N](<issue URL>)` line right under its title. An issue is linked when its body's last line points to `.minispec/features/<file>.md`.

Cards that track work in sibling repositories (`driver-tools` for moodle-driver, `pseudonymous-mode` waiting on pseudonym) get their issue here like any other; the siblings' own cards get theirs in their repositories, from their sessions.

## 2. Fix each mismatch

- **Note without an issue:** open one (`gh issue create --label feature` or `--label fix`; `gh label create` if missing). Title: what it achieves for someone who uses the server. Body: the problem and the proposal in a few sentences (not the note's wording), and a last line `Feature: \`.minispec/features/<slug>.md\`` (`Fix:` for a fix). Then add the `Issue:` line under the note's title, with a blank line before and after.
- **Note with an issue that isn't linked from it:** add the `Issue:` line.
- **Issue not in English:** translate its title and body with `gh issue edit`; don't open a duplicate.
- **Open issue whose note no longer exists:** the work is done or dropped. Find the commits (`git log --oneline -- .minispec/features/<file>.md` and after), then close it with a comment on the solution: what changed for clients, the design choices, how it was verified (Docker tests, `--strict`, the sandbox), the commits (`gh issue close N --comment "…"`). If dropped, say why. Ask when you can't tell.
- **Closed issue whose note still exists:** ask whether to reopen the issue or delete the note.

## 3. Commit

Commit the notes you linked (`docs: link <slug> to its issue`, with the session's attribution trailer); push only if asked. Report a table of notes and issues, and what you opened, edited or closed.

## Rules

- One issue per note; search before creating.
- Never close an issue for work that isn't pushed.
- The notes' lifecycle belongs to `minispec-feature`, `minispec-bugfix` and `minispec-implement`; this skill repairs drift.
