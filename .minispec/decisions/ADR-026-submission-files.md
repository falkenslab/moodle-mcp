# ADR-026: Submitted files can reach the model under pseudonymize, with the person's yes

## Decision

Under `pseudonymize`, `download_file` still refuses others' files, and a new tool, `save_submission_files`, saves an assignment's submitted files locally, one folder per alias, with neutral file names. Its result gives aliases, paths and sizes, never an original file name or a user id. It doesn't exist under `block` (its driver functions are `others-personal`).

It's in `CONFIRMED` (ADR-023): before saving, the person is asked, in their language, knowing that the model can then read the files and that a name written inside a PDF, a document or an image isn't hidden. In plain text files, the saved copy has known people's names and contact data replaced by aliases, through the same redaction as any other text; each file's `textChecked` says whether that was done. Moodle's original is untouched. Decided by the owner, 9 November 2026 (#59, from falkenslab/miyagi#95).

## Motivation

ADR-016 keeps others' files for `clear` because their content can't be pseudonymized. In practice that made an assignment with file submissions impossible to grade with an agent at the default level: the teacher had to hand over each file under an alias they could only match by submission time. Reading what students wrote is what grading is; online text already reaches the model redacted.

## Consequences

- A student who signs inside a PDF or a document stays identifiable to the model. This is the one place under `pseudonymize` where that's accepted, it's one tool, and the person says yes each time. What the model has read can't be taken back.
- Without elicitation the tool is refused, unless the person set `MOODLE_MCP_CONFIRM=client`, as for every confirmed tool.
- Extensions kept in a neutral name come from a list: anything else after a dot could be a surname.
- A saved text file differs from what the student sent wherever a name or contact data was replaced; the file in Moodle is the one of record.
- Other people's files elsewhere (forum attachments, a user's files) still need `clear`.
