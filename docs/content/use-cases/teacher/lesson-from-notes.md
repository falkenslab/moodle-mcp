---
title: A lesson from your notes
sidebar_label: A lesson from your notes
---

# A lesson from your notes

**Claude Code** · as a teacher · default settings

The agent turns a page of notes into a Moodle lesson: one page per idea, each ending with a question, where a right answer moves on and a wrong one sends the student back to reread.

## What you ask

> In my Moodle course mcp-content, turn the page "Apuntes: bucles" into a short hidden lesson called "Loops, step by step" in the first section: one page per idea, each ending with a question; a right answer moves on to the next page, a wrong one goes back to the page that explains it. Tell me the plan before creating anything.

Then, after reading the plan:

> Looks good, create it.

## The session

<Screenshot app="Claude Code" session="lesson-from-notes" alt="Claude Code plans the lesson from the notes, then creates it and checks its pages" />

What the agent did:

1. **Read the notes** and found three ideas in them: what a loop is, the `for` loop with its example, and the `while` loop.
2. **Proposed a plan** before changing anything: one question page per idea, with the question, the right answer and the wrong ones in a table. It noticed that Moodle's lesson allows one try per question by default, which would move a student on after a wrong answer, and offered to allow unlimited tries.
3. **Created the hidden lesson and its three pages** once you agreed, each answer with a short response and its jump: the next page, or back to the same page.
4. **Set the tries to unlimited**, after checking that the setting offers that value.
5. **Read the pages back** and found that Moodle's emoticon filter had turned the `(n)` in `range(n)` into a smiley; it rewrote that text so the filter leaves it alone.

## The result in Moodle

<Screenshot app="Moodle" src="/img/moodle/lesson.png" alt="The lesson's pages in Moodle's editing view, with each answer, its response and its jump" />

## Tips

- **Say how it should branch.** "A wrong answer goes back", "a wrong answer goes to an extra explanation", "end of lesson after the last question": the agent sets each answer's jump.
- **Content pages too.** Ask for "a content page before each question" and the explanation and the question go on separate pages.
- **Grade or practice.** A lesson is graded out of 100 by default; say "a practice lesson, without a grade" if you'd rather.
- **Try it as a student** before showing it: open its link in Moodle's preview, or ask the agent to make it visible when you're ready.
