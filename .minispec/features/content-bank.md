# The content bank and H5P

Issue: [#38](https://github.com/falkenslab/moodle-mcp/issues/38)

## Goal

A teacher manages a course's content bank: uploads, renames, downloads and deletes H5P content.

## Context

- H5P activities are created from a package; the content bank isn't reachable.
- Waits on moodle-driver [#80](https://github.com/falkenslab/moodle-driver/issues/80): not started in moodle-driver yet. A release, then a version bump here (`upgrade-deps`), then the tools (`add-tool`).

## Changes

- `list_content_bank`, `upload_to_content_bank` (a local `.h5p`), `rename_content`, `download_content`, `delete_content`, once the driver has them.

## Acceptance

- An `.h5p` uploaded to course 3's content bank, listed, renamed, downloaded and deleted.
- Tests in Docker, `--strict` with no warnings, a sandbox check in course 3, the tools reference in both languages and the tool counts.
