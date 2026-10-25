# Dependency upgrades waiting on others

Issue: [#47](https://github.com/falkenslab/moodle-mcp/issues/47)

## Goal

TypeScript moves to its newer version as soon as what blocks it allows it.

## Context

- TypeScript 7 is out; typescript-eslint (8.72.0, 25 October 2026) supports up to `<6.1.0`, so `typescript` stays on `~6.0.x` until a typescript-eslint release supports 7.
- `@types/node` stays on 20, the Node.js version the server supports.
- Done: playwright-core 1.64.1 and the Docker image `mcr.microsoft.com/playwright:v1.64.1-noble`, once moodle-driver 0.13.0 moved to it (falkenslab/moodle-driver#91).

## Changes

- TypeScript 7, once typescript-eslint supports it, with what the compiler then asks to change.

## Acceptance

- Through `upgrade-deps`: the verify gate.
