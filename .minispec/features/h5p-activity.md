# H5P activity

## Goal

`get_h5p_activity`: an H5P activity's content type, attempts and score.

## Context

- 93 H5P pages in student runs. Solving H5P happens inside iframes and stays with the browser fallback tools (ADR-010).
- AJAX: `mod_h5pactivity_get_h5pactivity_access_information`, `mod_h5pactivity_get_attempts`; the content type from the embed's `h5p.json` or the iframe.

## Changes

- `tools/getH5pActivity.ts`: content type, whether attempts are tracked, my attempts with their score, max score. Read-only.

## Acceptance

- In course 3, a seeded H5P activity shows its content type and, after an attempt through the browser, its score.
