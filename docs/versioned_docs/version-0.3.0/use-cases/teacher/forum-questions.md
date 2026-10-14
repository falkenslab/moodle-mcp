---
title: Answering the forum
sidebar_label: Answering the forum
---

# Answering the forum

**Claude Code** · as a teacher · default settings

The agent reads a forum, finds the questions nobody has answered, and drafts an answer for each. You read the draft, and then it posts it.

## What you ask

> Are there questions in the "Foro MCP" forum of my course mcp-content that nobody has answered yet? Read them and draft a short, friendly answer for each. Don't post anything yet.

Then: "Post it."

## The session

<Screenshot app="Claude Code" session="forum-questions" alt="Claude Code finds the unanswered question, drafts a reply in Spanish and posts it after confirmation" />

What the agent did:

1. **Listed the forum's discussions** (`list_discussions`) and **read the ones with open questions** (`get_discussion`).
2. **Found one open question**, and checked that the latest post in every other discussion was already an answer.
3. **Drafted the answer in the forum's language** (Spanish), even though you asked in English, and waited.
4. **Posted it** as a reply in the thread (`reply_to_post`).

## The result in Moodle

<Screenshot app="Moodle" src="/img/moodle/forum-reply.png" alt="The forum discussion in Moodle with the teacher's reply" />

The reply is yours. It's posted under your name, like any other post, and students get the forum's usual notifications.

## Tips

- **Set the tone**: "short and friendly", "with an example in Python", "point them to the notes of unit 2".
- **Students' names never reach the AI**, and the answer doesn't need them: it speaks to "you".
- **Announcements work the same way**: "Post an announcement in the News forum reminding everyone about Friday's exam."
