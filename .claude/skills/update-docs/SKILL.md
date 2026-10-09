---
name: update-docs
description: Keep moodle-mcp's documentation in step with the code - the README (configuration, tool list, development), the MiniSpec core and decisions, the tool catalog, the driver-tools card and the server's instructions. Use after any change to a tool, a setting, the instructions, the build or the Docker runner, before committing it. A change is not done until its documentation is.
---

# Keep moodle-mcp's docs up to date

Documentation here is for two readers: people installing and using the server (README) and future sessions working on it (`.minispec/`, `CLAUDE.md`). Code that changes what a client sees, can configure or must do, and isn't documented, is unfinished work.

## 1. Find what changed

```
git status --short
git diff --stat
git diff -- src/tools/index.ts src/config.ts src/instructions.ts
```

Counts as visible: a tool added, removed or renamed; a tool's inputs, outputs, annotations or behavior; a setting (variable, argument, `configure`) or its default; the instructions; an error an agent reads; the build, the Docker runner, requirements; a fix that changes what a client could rely on.

## 2. Update the owners

| Change | Where |
| --- | --- |
| A tool added or removed | README's status line (the tool list), `.minispec/core/project.md`'s Status, `docs/tool-catalog.md`'s Status column, the `driver-tools` card's row |
| A tool's behavior or contract | Its description (that's what agents read) and, if the README explains it, the README |
| A new piece of the server (a module, a wrapper) | `.minispec/core/architecture.md` |
| A setting | README's configuration table, `src/config.ts`'s usage text, `configure`'s description, `server_info` |
| Usage rules for agents | `src/instructions.ts` (and its test) |
| Build, Docker runner, sibling repositories | README's Development section, `.minispec/core/stack.md` |
| A rule that applies to all future work | `.minispec/core/conventions.md` or `principles.md` |
| A decision that's hard to reverse | A new ADR with the `minispec-adr` skill (or an existing one updated if it changed) |
| Work done from a card | The card deleted (`minispec-implement`), its permanent lessons promoted first |

Search too: `grep -rn "<tool or setting>" README.md .minispec docs src/instructions.ts` finds every place that names it, so none keeps describing the old behavior.

## 3. Write it

- English; one paragraph or list item per line, no horizontal rules between sections.
- Change the existing explanation rather than appending a note that contradicts it.
- MiniSpec limits: 100 lines per document, `project.md` ≤ 50, `principles.md` ≤ 20.
- What belongs to moodle-driver or pseudonym (how Moodle is read, how aliases work) is documented there, by their sessions; here, only how this server uses them.
- No credentials, ever, sandbox accounts included.

## 4. Commit with the code

The documentation goes in the same commit as the change (or right next to it, `docs: …`). Report which documents you changed, or why none needed to.
