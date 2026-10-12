---
name: release
description: Cut a moodle-mcp release - check its sibling libraries are published first, decide the semver bump from the commits since the last tag, bump the version, commit, tag, push, create the GitHub release and publish to npm. Only when the owner explicitly asks to release or publish.
disable-model-invocation: true
---

# Release moodle-mcp

A release is a version commit, a `vX.Y.Z` tag on `main`, a GitHub release and the same version on npm as `@falkenslab/moodle-mcp` (`moodle-mcp` on npm is someone else's). **Nothing is published or pushed without the owner asking**, and the GitHub repository is created only when they say so.

## 1. Preconditions

Stop and report at the first that fails:

- **No `file:` dependencies.** `@falkenslab/moodle-driver` and `@falkenslab/pseudonym` come from npm (published versions, `^0.x.y`); if a `file:../…` crept back in for a local try, the release waits until it's a published version again.
- On `main`, working tree clean, up to date with `origin/main` (`git fetch && git status -sb`). No remote yet: stop and ask.
- The `verify` skill is green, and a `sandbox-check` of login, a read and a write tool passed on this commit.
- `gh auth status` works; `npm whoami` works (if not, ask the owner to run `npm login` themselves: it's interactive).
- The documentation describes every change since the last tag (`update-docs`): README, tool list, catalog.

## 2. Decide the bump

`git describe --tags --abbrev=0`, then `git log <tag>..HEAD --format=%s`. While `0.x`: **minor** for any `feat` or breaking change (a tool removed or renamed, an input or output changed incompatibly, a setting renamed); **patch** for fixes, docs, refactors, chores only. **major** only when the owner declares `1.0.0`. If nothing but docs or chores changed, say a release may not be worthwhile and confirm first. State the bump and why.

## 3. Bump and notes

`npm version <patch|minor> --no-git-tag-version` (updates `package.json` and the lock; `src/version.ts` reads it at build time). Draft notes in English from the commits: new tools, changed tools (with what a client must change), fixes, internal.

## 4. Commit, tag, push, publish

```
git add package.json package-lock.json
git commit -F -        # "chore(release): vX.Y.Z" plus the session's attribution trailer
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --notes "<notes>"
npm publish
```

The package ships `dist/server.mjs` and `playwright-core` (`bundleDependencies`); check with `npm pack --dry-run` before publishing that nothing else (profiles, scratch, `.env`) is in it. With two-factor authentication, ask the owner for the code (`npm publish --otp=<code>`). A published version can't be reused: fix forward with a patch.

Tags are lightweight; never move or delete one, never force-push. If a step fails half-way, report exactly what is pushed and published and what isn't.

## 5. Verify the release

`git ls-remote --tags origin`, `gh release view vX.Y.Z`, `npm view <name> version`, and in the scratchpad `npx <name>@X.Y.Z --version`. Report the version, tag, release URL, npm page and notes.
