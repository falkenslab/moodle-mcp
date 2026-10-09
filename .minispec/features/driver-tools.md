# Driver tools

## Goal

Each Moodle area moodle-driver gains becomes MCP tools here: a schema, a description, annotations and one driver call (ADR-014).

## Context

- The Moodle work is in moodle-driver's feature cards; this card tracks what to expose once each lands there. A tool's work here is small; take a row when its driver card is done.
- Tools that show other people wait for `pseudonymous-mode.md` (ADR-013): participants, gradebook, quiz results, completion report, messages.

## Changes

| moodle-driver card | Tools | Notes |
| --- | --- | --- |
| `activity-settings` | `get_activity` | Teachers; read-only; the catalog's `get_assignment_settings` done through it |
| `update-course` | `update_course` | Write, idempotent |
| `completion` | `set_completion`, `override_completion`, `get_completion_report` | Report pseudonymized |
| `choice-activity` | `type: "choice"` in `get_survey` / `submit_survey`, or `get_choice` / `answer_choice` | As the driver decides |
| `lessons` | `get_lesson_page`, `answer_lesson_page` | Trail and progress like `get_activity_content` |
| `h5p-activity` | `get_h5p_activity` | Solving stays with the browser fallback tools |
| `rubric` | `get_rubric`; rubric levels in `grade_submission` | |
| `extensions-and-overrides` | `grant_extension`, `set_quiz_override` | Users by alias |
| `quiz-results` | `get_quiz_results` | Pseudonymized |
| `quiz-structure` | `get_quiz_structure`, `add_questions_to_quiz` | |
| `question-bank` | `list_question_banks`, `list_questions`, `import_questions`, `create_question` | |
| `forum-moderation` | `set_discussion_state` | Idempotent |
| `calendar-events` | `create_event`, `delete_event` | |
| `participants-and-groups` | `list_participants` (covers `list_inactive_participants`), `list_groups` | Pseudonymized, no emails |
| `gradebook` | `get_grader_report`, `get_gradebook_setup`, `update_grade_item`, `add_grade_category` | Pseudonymized |
| `messages-and-notifications` | `list_notifications`, `mark_notifications_read`, `list_conversations`, `get_conversation`, `send_message` | Pseudonymized; confirm before sending |

- Each tool's scope (ADR-015) comes from the driver categories of the functions it calls, once `tool-scopes` is in.
- Each new AJAX-only tool gets its page in `src/tools/follow.ts`; each driver error class that needs a tool's name or a setting gets a line in `src/tools/errors.ts`.
- When moodle-driver's `api-tests` card is done, the tool tests here shrink to what MCP adds: schemas, annotations, error explanations, progress, following.

## Acceptance

- Per row: the tools listed, with annotations, `--strict` clean, a test against the fake Moodle, and the catalog's status updated.
