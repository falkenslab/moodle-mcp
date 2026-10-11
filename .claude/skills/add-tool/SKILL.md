---
name: add-tool
description: Checklist for adding or changing a moodle-mcp tool - what goes in moodle-driver first, how the tool file is written (schema, annotations, description, one driver call), the wiring (follow page, error explanations, registration), tests, the --strict check and the docs to update. Use when adding a tool, changing one's inputs or outputs, or exposing a new moodle-driver area.
---

# Adding a moodle-mcp tool

## 1. The Moodle work is the driver's

A tool is a schema, a description, annotations and one call to `@falkenslab/moodle-driver` (ADR-014): the main entry for operations, `/internals` only for primitives (and then the tool is `any`, see ADR-015). If the tool needs Moodle logic the driver doesn't have (a service call, a page read, a form), that's a driver change first, in its own repository and normally in its own session (see moodle-driver's feature cards; this repo's `driver-tools` card maps them to tools while there are areas left to expose). Don't put selectors, service names or `page.evaluate` in a tool. A new driver export reaches this server through a driver release and a version bump here.

## 2. Write the tool

- One file in `src/tools/` (a small family sharing schemas may share one: `courseLayout.ts`, `quizAttempts.ts`). Names are snake_case Moodle verbs and nouns (`list_courses`), never browser actions (ADR-004).
- Schemas with zod: inputs described for an agent (where each id comes from: "as get_course_structure gives it"); an `outputSchema` matching what the driver returns. No nullable types and no unions of types (an optional field, or a string), which some clients reject.
- Annotations, always: `readOnlyHint: true` for reads; for writes `readOnlyHint: false` plus `destructiveHint` and `idempotentHint`; `openWorldHint: true` when it talks to the site.
- Description: what it does in Moodle's terms, what it returns, which tool gives its inputs; for writes, "confirm with the person first"; anything an agent must not guess (personal data, statements to accept).
- Handler: `async (input) => reply(await driverFunction(...(await onSite(config, browser)), …))`. `onSite()` checks the site before opening the browser; `reply()` gives structured content and the JSON text. Settings the driver takes (the trail) come from `config`; progress notifications from `extra._meta.progressToken` through the driver's `onProgress`.
- Other people's data: when the tool shows students or colleagues, it goes through `src/people.ts` (ADR-013, ADR-016): aliases for people, `text()` for what they wrote, `refuseAliases()` for what the agent writes to Moodle; a test in pseudonymous mode checks no name or id leaks. Never emails, phones or profile fields.

## 3. Wire it

- Register it in `src/tools/index.ts`, in the order clients should see it, and list its driver functions in `TOOL_FUNCTIONS` (`src/tools/scopes.ts`): its scope comes from their data categories (a test fails on an unlisted tool).
- An AJAX-only tool names its Moodle page in `src/tools/follow.ts` (what `show_browser` shows, ADR-011); tools that open a page are followed already.
- A driver error class that needs this server's words (a tool's name, a `MOODLE_MCP_*` setting) gets a line in `src/tools/errors.ts`.
- `src/instructions.ts` only when agents need a usage rule the description can't carry.

## 4. Test

- `test/tools/<tool>.test.ts`: the tool through an in-memory MCP client against the driver's fake Moodle (`@falkenslab/moodle-driver/testing`), made-up data only. Cover the main path, the main error (as the agent reads it), and the annotations. What the driver itself does belongs in the driver's tests.
- Run the `verify` skill (tests in Docker, `--strict`).
- A check against the real sandbox with the `sandbox-check` skill when the tool writes, or reads something the fake can't stand for.

## 5. Docs

Run the `update-docs` skill: the README's tool list, `.minispec/core/project.md`'s status, `.minispec/core/architecture.md` if a new piece appeared, the catalog's status (`docs/tool-catalog.md`), and the `driver-tools` card's row (done rows go away; the card goes when it's empty).

## 6. Finish

Commit with the `commit` skill (`feat(tools): …`). If an input or output changed in a way existing clients would notice, say so in the body.
