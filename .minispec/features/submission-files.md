# Submitted files saved under their alias

Issue: [#59](https://github.com/falkenslab/moodle-mcp/issues/59)

## Goal

With others' data pseudonymized, an agent can grade an assignment whose submissions are files: each one's files are saved in a local folder named after the student's alias.

## Context

- Under `pseudonymize`, `get_submissions` gives only a file's name, without its URL, and `download_file` refuses others' files because a file's content can't be pseudonymized (ADR-016). miyagi asks the teacher for each file under an alias, and the teacher can only match them by submission time (falkenslab/miyagi#95).
- The driver already gives what's needed (`assignmentSubmissions`, `downloadFile`): nothing from a sibling repository.
- This relaxes what ADR-016 decided: the content reaches the model, so a student who signs inside the file stays identifiable. It needs an ADR and the owner's decision.
- File names are often the student's name (`get_submissions` already redacts them).

## Changes

- An ADR amending ADR-016: at which levels the tool exists (not under `block`) and what the person accepts.
- A tool that saves an assignment's submitted files to `<destDir>/<alias>/`, with neutral file names that keep the extension, and returns only aliases, paths and sizes. `TOOL_FUNCTIONS`, role teacher, `src/people.ts`.
- For text files, a check for the student's name before handing the file over; what it does on a match is decided in the ADR.
- The tool's description and the privacy page, English and Spanish, say a name inside the file isn't hidden.

## Acceptance

- Tests in `test/tools/pseudonymize.test.ts`: no name, user id or original file name in the result, nor in the saved paths; refused under `block`.
- The sandbox's course 3: an assignment's files saved under their aliases.
