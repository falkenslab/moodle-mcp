# A board's columns

Issue: [#64](https://github.com/falkenslab/moodle-mcp/issues/64)

## Goal

A teacher's agent names a Board activity's columns, when it creates the board and afterwards.

## Context

`create_activity` creates a Board (mod_board) with three default columns, all "Heading", and nothing can rename, add or remove them: boards meant for students go live as "Heading / Heading / Heading". The driver has nothing for mod_board yet.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#106](https://github.com/falkenslab/moodle-driver/issues/106)): reading and setting a board's columns.
- The columns when creating a board (names, and optionally colour and locked), and a tool to read and edit them afterwards, refused for a column with notes unless asked. Each tool as `add-tool` says: its driver functions in `TOOL_FUNCTIONS`, a role list (teacher), annotations, and `CONFIRMED` for what can't be undone, in English and Spanish.
- The docs: the tools' area and their Spanish.

## Acceptance

- On the sandbox's course 3: a board created with three named columns, one renamed and one added afterwards, as Moodle shows them.
- Removing a column with notes is refused unless asked, and asks the person first when it is.
