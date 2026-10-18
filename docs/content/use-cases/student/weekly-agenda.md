---
title: Your weekly agenda
sidebar_label: Your weekly agenda
---

# Your weekly agenda

**Codex** · as a student · `MOODLE_MCP_ROLE=student`

The agent looks through all your courses for what's due and tells you what's still left to do.

## What you ask

> What do I have due in Moodle in the next two weeks, across my courses? Order it by date and tell me what's still left to do.

## The session

<Screenshot app="Codex" session="weekly-agenda" alt="Codex lists the assignments and the exam of the next two weeks, and what's still to do" />

What the agent did:

1. **Read your deadlines and to-dos** across your courses (`list_deadlines`, `list_pending`).
2. **Checked each assignment and quiz** (`get_assignment`, `get_quiz_info`) to tell what's already done from what's still to do.
3. **Answered by date**: one assignment to submit by 20 October, one already overdue in another course, and the activities with no due date that are still pending.

## The same, in Moodle

Moodle's calendar also shows an exam on 23 October. It isn't a deadline, so the agent left it out: ask for "deadlines and calendar events" to get both.


<Screenshot app="Moodle" src="/img/moodle/upcoming.png" alt="Moodle's upcoming events: two assignments and an exam" />

## Tips

- **Every morning**: "What's due today and tomorrow?" or "What changed in my courses since yesterday?"
- **Details**: "What does Práctica 2 ask for exactly?" reads the assignment's instructions and files.
- **A student's tools only**: with `MOODLE_MCP_ROLE=student`, the agent gets 83 tools instead of 235, and works faster and better. See [Limiting the agent](../../limits.md#your-role).
