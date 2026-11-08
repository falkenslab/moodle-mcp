# Dependency upgrades waiting on others

Issue: [#47](https://github.com/falkenslab/moodle-mcp/issues/47)

## Goal

playwright-core and TypeScript move to their newer versions as soon as what blocks them allows it.

## Context

- TypeScript 7 is out; typescript-eslint (8.72.0, 25 October 2026) supports up to `<6.1.0`, so `typescript` stays on `~6.0.x` until a typescript-eslint release supports 7.
- `@types/node` stays on 20, the Node.js version the server supports.
- playwright-core 1.65.0 is out (5 November 2026), with its Docker image `mcr.microsoft.com/playwright:v1.65.0-noble`; the driver moves first (falkenslab/moodle-driver#96), moodle-driver 0.14.0 still develops on 1.64.
- Done: playwright-core 1.64.1 and the Docker image `mcr.microsoft.com/playwright:v1.64.1-noble`, once moodle-driver 0.13.0 moved to it (falkenslab/moodle-driver#91).

## Changes

- playwright-core 1.65.0 and its Docker image in `scripts/in-docker.mjs` and `scripts/screenshots/run.mjs`, after a moodle-driver release on 1.65.
- TypeScript 7, once typescript-eslint supports it, with what the compiler then asks to change.

## Acceptance

- Through `upgrade-deps`: the verify gate.
