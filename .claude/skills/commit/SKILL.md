---
name: commit
description: Create smart, atomic commits for moodle-mcp following the repo's conventions (Conventional Commits, English messages, grouped by logical change, staged by path). Use whenever the user asks to commit, or when finishing a piece of work that should be committed.
---

# Smart commits for moodle-mcp

Commit each logical step as you finish it (the owner asked for one commit per logical step). Never push, and never create a remote, unless the owner asks.

## 1. Understand what changed

Run `git status --short` and `git diff --stat`, then read the diffs. Other sessions work on sibling repositories (`../moodle-driver`, `../pseudonym`) and may touch files here too: commit only what belongs to the work at hand, and mention anything unrelated instead of sweeping it in. Never commit `dist/`, `node_modules/`, browser profiles, scratch scripts or anything with credentials (the sandbox's accounts included).

## 2. Verify

Run the `update-docs` skill when the change adds, removes or changes a tool, a setting, the instructions or how the server is built; then the `verify` skill. Do not commit a tree that fails typecheck, lint, the Docker tests or `--strict`, nor a visible change without its documentation.

## 3. Group into atomic commits

One logical change per commit, ordered so each builds on the previous ones. Typical groups: a tool with its tests and docs, a refactor on its own, `.minispec/` decisions or cards on their own, dependency or Docker tooling on their own.

- Stage by path (`git add <paths>`), never `git add -A` blindly; check `git status --short` after staging.
- When one file mixes two concerns, split the hunks: `printf 'y\nn\n' | git add -p <file>`, then check `git diff --cached`.
- `git mv` for moves, and keep pure renames free of content changes.
- A change that spans this repository and `../moodle-driver` is two commits, one per repository, each describing its side; commit the driver's only when the owner asked for that work here (normally it has its own session).

## 4. Write the message

Format: `type(scope): description`, lowercase type, no trailing period. Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `build`, `test`. Scopes when useful: `tools`, `config`, `browser`, `docker`, `deps`, `readme`, `minispec`.

- English, subject and body.
- The body explains *why* (the problem, the constraint, the behavior confirmed against the sandbox and its Moodle version), not a line-by-line list.
- End with the attribution trailer the session's instructions require (do not invent one).
- Pass the message through a HEREDOC (`git commit -q -F - <<'EOF'`).

## 5. Finish

`git status --short` (clean, unless you deliberately left unrelated changes) and `git log --oneline -n <commits made>`. Report the commits. Never use `--no-verify`, `--amend` on shared commits, or force-push.
