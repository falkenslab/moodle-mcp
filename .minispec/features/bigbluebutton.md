# BigBlueButton

Issue: [#39](https://github.com/falkenslab/moodle-mcp/issues/39)

## Goal

A teacher reads a BigBlueButton activity's state and manages its recordings.

## Context

- A BigBlueButton activity can be created, nothing else.
- Waits on moodle-driver [#81](https://github.com/falkenslab/moodle-driver/issues/81): released in moodle-driver 0.10.0, which moodle-mcp uses; the tools come with `add-tool`.

## Changes

- `get_bigbluebutton` (state, schedule, recordings, the join URL), `set_recording_visibility`, `delete_recording`, once the driver has them; a clear error where the site has no BigBlueButton server.

## Acceptance

- Recordings listed and one published and hidden, or, without a server, the state read and the error clear.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
