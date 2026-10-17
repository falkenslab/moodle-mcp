# Validate GIFT and HTML before uploading them

Issue: [#24](https://github.com/falkenslab/moodle-mcp/issues/24)

## Goal

An agent checks GIFT questions and HTML content before sending them to Moodle, so a typo doesn't import fewer questions than meant and Moodle's cleaning doesn't silently drop what the author wanted.

## Context

- `import_questions` imports GIFT as given: Moodle skips a question it can't read, found only afterwards. The content tools send HTML that Moodle cleans (HTMLPurifier, for anyone without trusted text).
- miyagi validates both itself before calling moodle-mcp (falkenslab/miyagi#2); every client would have to repeat it.
- Chosen by the owner on 17 October 2026: GIFT parsed with `gift-pegjs` (MIT; porting Moodle's GPL importer would make that part GPL), and HTML checked offline and approximately: nothing outside Moodle knows exactly what its cleaning removes.

## Changes

- `validate_gift` (read-only, no Moodle): the questions split at blank lines, as Moodle's importer does, each parsed alone so every problem gets its line; Moodle's own refusals checked too (weights it doesn't take, a multiple choice without a right answer, a matching question with fewer than two pairs). Returns each question (type in Moodle's names, title, text, answers) and the problems.
- `validate_html` (read-only, no Moodle): parse errors with their line, what Moodle's cleaning removes (scripts, frames, forms, event attributes, `javascript:` links), and `embed` files missing or not named in the HTML.
- `src/validation.ts` for both, so tests check them without a server.

## Acceptance

- A GIFT file with a broken question, an invalid weight and good questions: each problem with its line, the good ones listed.
- HTML with a script, an `onclick`, an unclosed tag and an image not in `embed`: each reported.
- Tests, `--strict`, the tools reference in both languages.
