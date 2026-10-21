---
title: Students falling behind
sidebar_label: Students falling behind
---

# Students falling behind

**Codex** · as a teacher · default settings

The agent checks the course's activity completion, finds who hasn't done something yet, and sends them a reminder, after telling you who would get it.

## What you ask

> In my Moodle course mcp-content, which students haven't completed the page "Apuntes: bucles" yet? Prepare a short, friendly reminder for them, and tell me who would get it before sending anything.

Then: "Yes, send it."

## The session

<Screenshot app="Codex" session="falling-behind" alt="Codex lists four students by alias, drafts a reminder, and sends it after confirmation" />

What the agent did:

1. **Read the course's completion report** (`get_completion_report`): four students haven't completed the page.
2. **Drafted the reminder**, listed who would get it (by alias), and sent nothing.
3. **After your OK, sent it** as a Moodle message to each of them (`message_participants`).

The AI only ever knew the students as `A-8FT4A1`, `A-RKTGVD` and so on. moodle-mcp turned the aliases back into the right people when sending.

## The result in Moodle

Each student gets a private message from you:

<Screenshot app="Moodle" src="/img/moodle/messages.png" alt="The reminder in a student's Moodle messages" />

## Tips

- **Who's behind an alias**: run `npx @falkenslab/pseudonym whois A-8FT4A1` in your own terminal. See [Students' privacy](../../privacy.md#aliases).
- **Other signals**: "Who hasn't opened the course since Monday?", "Who hasn't submitted Task 3?", "Who has a grade below 5 in the quizzes?"
- **Without sending**: ask for the list only, and write to them yourself.
