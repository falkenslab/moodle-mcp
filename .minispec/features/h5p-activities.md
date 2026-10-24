# H5P activities from a package

Issue: [#52](https://github.com/falkenslab/moodle-mcp/issues/52)

## Goal

An agent knows it can create an H5P activity from a `.h5p` package, and which H5P content types the site can run before it builds one.

## Context

- `create_activity` with `type: "h5pactivity"` and `files: ["<path>.h5p"]` already works on moodle-mcp 0.5.0 (tried on the sandbox 5.2: the package went into the activity, it deployed, `get_h5p_activity` reads it back), but the tools reference documents `files` only for a file resource, a folder and a SCORM package.
- A content-only package (without libraries), as falkenslab/agent-extensions#10 builds them for moodle-teacher, plays only where its main library is installed. No tool says which are: `list_content_bank` is advanced and lists content, not types.
- Reading the site's runnable H5P libraries is Moodle logic, so moodle-driver's: it has `h5pActivity` (one activity) but nothing for the site's content types, and no issue for it yet.
- Checking it on the sandbox needs the usual types seeded there: falkenslab/moodle-sandbox#6.

## Changes

- `create_activity`'s description and the tools reference: `files` also takes an H5P activity's package (`type: "h5pactivity"`, one `.h5p`), with the settings worth naming (attempts tracked, grade, which attempt counts); a test with a package.
- After a moodle-driver release with it: `list_h5p_content_types`, read-only, a teacher's tool, not advanced: each runnable library's machine name, version and title, and whether the person may install new ones (`moodle/h5p:updatelibraries`).

## Acceptance

- The tools reference says it, and `create_activity` with a `.h5p` has a test.
- `list_h5p_content_types` on the sandbox lists what `mdl_h5p_libraries` has runnable (after moodle-sandbox#6).
- moodle-teacher names it in its skill before building a package (agent-extensions, its own session).
