---
title: Which questions to fix
sidebar_label: Which questions to fix
---

# Which questions to fix

**Codex** · as a teacher · default settings

After your students take a quiz, the agent reads Moodle's statistics for it and tells you which questions to look at again, and why: one nobody gets wrong, one the best students fail, one whose wrong answers point to a misunderstanding.

## What you ask

<Prompt>{`Look at the statistics of the quiz "Repaso: bucles y funciones" in my course mcp-content: which questions should I review, and why? Don't change anything.`}</Prompt>

Four students took this quiz. Its third question asks which of `for`, `while` and `def` is a loop, and only `for` is marked right, though `while` is one too.

## The session

<Screenshot app="Codex" session="quiz-statistics" alt="Codex reads the quiz's statistics and ranks the questions to review" />

What the agent did:

1. **Found the course and the quiz** (`list_courses`, `get_course_structure`).
2. **Read the quiz's statistics** (`get_quiz_statistics`): each question's facility index, discrimination index and the answers chosen, and the quiz's figures.
3. **Ranked the questions to review**: first "Bucle", which Moodle flags and whose discrimination index is −89%: the students who did best overall were the ones who missed it, so it asked to check its wording and the answer marked right. Then "Return", where most chose the same wrong answer, and "Break", flagged too. It noted that "Fijo", which everyone got right, tells nothing apart.
4. **Said how far to trust it**: four attempts are a small sample, signals to inspect the questions rather than proof. It changed nothing.

## The result in Moodle

<Screenshot app="Moodle" src="/img/moodle/quiz-statistics.png" alt="The quiz's statistics report in Moodle, with the questions Bucle and Break flagged and Bucle's negative discrimination" />

## Tips

- **Ask what a figure means.** "What's a discrimination index?" gets a plain answer, with this quiz's numbers as the example.
- **Then fix it**: "Change question 3 so only one answer is a loop" edits the question in the bank (`update_question`); a new version doesn't change the attempts already graded.
- **More attempts, firmer signals.** With a whole class, a negative discrimination is a strong sign of a flawed question; with a handful, it's a reason to look.
