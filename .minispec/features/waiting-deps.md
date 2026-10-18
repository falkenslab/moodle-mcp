# Dependency upgrades waiting on others

Issue: [#47](https://github.com/falkenslab/moodle-mcp/issues/47)

## Goal

playwright-core and TypeScript move to their newer versions as soon as what blocks them allows it.

## Context

- playwright-core 1.64.1 is out; moodle-driver, whose peer dependency it is, still uses 1.64.0. The `upgrade-deps` skill moves it in moodle-driver first, then here, with the Docker image (`mcr.microsoft.com/playwright:v1.64.1-noble`, already published) in `scripts/in-docker.mjs`.
- TypeScript 7 is out; typescript-eslint 8.71 supports up to `<6.1.0`, so `typescript` stays on `~6.0.x` until a typescript-eslint release supports 7.
- `@types/node` stays on 20, the Node.js version the server supports.

## Changes

- playwright-core and the Docker image, once a moodle-driver release uses 1.64.1 or later.
- TypeScript 7, once typescript-eslint supports it, with what the compiler then asks to change.

## Acceptance

- Each through `upgrade-deps`: the verify gate, and a sandbox check for playwright-core.
