# Attendance sessions and taking attendance

Issue: [#60](https://github.com/falkenslab/moodle-mcp/issues/60)

## Goal

A teacher's agent sets up an Attendance activity's sessions, takes attendance and reads each student's percentages.

## Context

`create_activity` creates an Attendance activity (mod_attendance), but nothing works inside it: the sessions, taking attendance and the report are done by hand in Moodle. A school's rule on unjustified absences (a share of the sessions) needs the report's percentages. The driver has nothing for mod_attendance yet; the sandbox's image has it installed.

## Changes

- **Needs moodle-driver first** ([falkenslab/moodle-driver#103](https://github.com/falkenslab/moodle-driver/issues/103)): sessions, taking attendance and the report.
- Tools for adding sessions (one, or weekly on given days and times between two dates), listing, editing and deleting them, taking attendance and reading the report. Each tool as `add-tool` says: its driver functions in `TOOL_FUNCTIONS`, a role list (teacher), annotations, and `CONFIRMED` for what can't be undone, in English and Spanish.
- Students go through `src/people.ts`: aliases when pseudonymizing, in the report and when taking attendance, with a test in `test/tools/pseudonymize.test.ts`.
- The docs: the tools' area and their Spanish, a use case if it reads well.

## Acceptance

- On the sandbox's course 3: weekly sessions created from a schedule, attendance taken for one, and the report's percentages as Moodle shows them.
- Deleting a session asks the person first.
- Under pseudonymize, no student's name in any result.
