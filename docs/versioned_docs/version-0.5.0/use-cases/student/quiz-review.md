---
title: Reviewing a quiz
sidebar_label: Reviewing a quiz
---

# Reviewing a quiz

**Claude Code** · as a student · `MOODLE_MCP_ROLE=student`

After a quiz, the agent reads your attempt's review and explains each mistake, as far as the quiz lets you see the right answers.

## What you ask

> I just did the quiz "Loops: quick check" in my Moodle course mcp-content. What grade did I get, and which questions did I get wrong? Explain the right answers.

## The session

<Screenshot app="Claude Code" session="quiz-review" alt="Claude Code reads the attempt's review and explains the two wrong answers" />

What the agent did:

1. **Found the quiz and your attempts** (`get_quiz_info`).
2. **Read the attempt's review** (`get_attempt_review`): the grade, and for each question your answer, whether it was right, and the right answer.
3. **Explained each mistake**, and why the right answer is right.

## The review in Moodle

The same attempt, as Moodle shows it:

<Screenshot app="Moodle" src="/img/moodle/quiz-review.png" alt="The attempt's review in Moodle: one question right, two wrong" />

## Tips

- **Practise before the next attempt**: "Give me three more questions like the ones I got wrong."
- **What Moodle hides, the agent can't see**: if the quiz doesn't show the right answers until it closes, the agent can only tell you which ones you got wrong.
- **The quiz itself**: the agent can also answer quizzes for you (`start_quiz_attempt`), but it confirms with you before submitting. Your teacher sees the attempt as yours.
