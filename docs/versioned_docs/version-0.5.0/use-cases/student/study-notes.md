---
title: Study notes
sidebar_label: Study notes
---

# Study notes

**Claude Code** · as a student · `MOODLE_MCP_ROLE=student`

The agent reads the course's pages and books, and turns them into a study sheet: key ideas and an example of each.

## What you ask

> Read the page "Apuntes: bucles" and the book "Libro: funciones" of my Moodle course mcp-content, and make me a one-page study sheet with the key ideas and an example of each.

## The session

<Screenshot app="Claude Code" session="study-notes" alt="Claude Code reads a page and a book and writes a study sheet on loops and functions" />

What the agent did:

1. **Found the page and the book** in the course (`get_course_structure`).
2. **Read them** (`get_activity_content`): the page's text and code, and every chapter of the book.
3. **Wrote the study sheet**, and said where the course material was thin and which examples it added itself.

## The course material

The page the agent read, as it looks in Moodle:

<Screenshot app="Moodle" src="/img/moodle/study-page.png" alt="The page Apuntes: bucles in Moodle" />

## Tips

- **Ask for a file**: in Claude Code or Codex, "save it as `loops.md`" writes the sheet to your folder.
- **Quiz yourself**: "Ask me five questions about this unit, one at a time, and correct my answers."
- **Files too**: PDFs and other files in the course can be downloaded and read ("Summarize the PDF in unit 2").
