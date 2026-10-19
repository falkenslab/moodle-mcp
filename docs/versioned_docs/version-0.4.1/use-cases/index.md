---
title: Use cases
sidebar_label: Use cases
slug: /use-cases
---

# Use cases

These are real sessions with **Claude Code** and **Codex**, working with moodle-mcp in a test Moodle site: what was asked, which tools the agent used, what it answered, and what changed in Moodle. Nothing was edited, except that long answers are cut short.

In every session, students reach the AI as aliases such as `A-8FT4A1`: that's [students' privacy](../privacy.md) at its default level.

## As a teacher

| Use case | You ask… | App |
| --- | --- | --- |
| [Grading with a rubric](./teacher/grading.md) | "Which submissions still need grading? Propose a grade with the rubric." | Claude Code |
| [A quiz from your questions](./teacher/quiz-from-questions.md) | "Create a quiz with these GIFT questions, one per page." | Codex |
| [Answering the forum](./teacher/forum-questions.md) | "Are there unanswered questions in the forum? Draft an answer." | Claude Code |
| [Students falling behind](./teacher/falling-behind.md) | "Who hasn't completed the notes? Send them a reminder." | Codex |
| [A page with an image](./teacher/page-with-image.md) | "Create a page with an explanation and this diagram." | Claude Code |
| [A read-only assistant](./teacher/reading-assistant.md) | "How's my course going?", with an agent that can't change anything | Claude Code |
| [Copying between sites](./teacher/copy-between-sites.md) | "Copy this page from my course on one Moodle to the same course on another." | Claude Code |

## As a student

| Use case | You ask… | App |
| --- | --- | --- |
| [Your weekly agenda](./student/weekly-agenda.md) | "What do I have due in the next two weeks?" | Codex |
| [Study notes](./student/study-notes.md) | "Make me a study sheet from these notes." | Claude Code |
| [A SCORM activity](./student/scorm.md) | "Do the SCORM activity and tell me my grade." | Codex |
| [Reviewing a quiz](./student/quiz-review.md) | "What did I get wrong in my last quiz?" | Claude Code |

## Tips for asking

- **Name the course** the way you see it in Moodle, by its short name or full name. The agent finds the ids by itself.
- **Ask for a draft first** for anything students will see: "Propose a grade, don't save anything yet", "Draft the answer, don't post it". Then say "save it" or "post it".
- **Say who it's for.** "Hidden", "visible to students", "without notifying the student": the agent passes that on to Moodle.
- **Check the result in Moodle.** Every tool that creates something returns its link: ask the agent for it, or ask it to [show you the browser](../getting-started/watching.md).
