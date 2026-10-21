---
title: A quiz from your questions
sidebar_label: A quiz from your questions
---

# A quiz from your questions

**Codex** · as a teacher · default settings

You give the agent questions in [GIFT format](https://docs.moodle.org/en/GIFT_format), the plain-text format Moodle imports. It creates the quiz, imports the questions into the quiz's question bank, adds them and sets the layout.

## What you ask

```text
In my Moodle course mcp-content, create a hidden quiz called "Loops: quick check" in the first
section, import these GIFT questions into its question bank, add them to the quiz and put one
question per page:

::Repeat:: How many times does for i in range(3) run its block? {=3 ~2 ~4}

::Stop:: Which keyword leaves a loop early? {=break ~continue ~pass}

::While:: A while loop runs while its condition is true. {T}

Tell me what you'll do before changing anything.
```

Then: "Yes, go ahead."

:::tip
In GIFT, leave a blank line between questions. You can also ask the agent to write the questions first ("Write five GIFT questions about loops"), check them, and then ask for the quiz.
:::

## The session

<Screenshot app="Codex" session="quiz-from-questions" alt="Codex explains its plan, then creates the quiz, imports the questions and sets one per page" />

What the agent did:

1. **Said what it would do**, and then, instead of waiting, went ahead in the same turn. When you said "Yes, go ahead", it answered that it was already done.
2. **Created the quiz**, hidden, in the first section (`create_activity`).
3. **Imported the questions** into the quiz's own question bank (`list_question_banks`, `import_questions`).
4. **Added them to the quiz** and set one question per page (`add_questions_to_quiz`, `set_quiz_pages`).

:::warning Agents don't always wait
In this session, Codex was set to run moodle-mcp's tools without asking (`default_tools_approval_mode = "approve"`), so nothing stopped it when it decided not to wait. If you want to review a plan first, leave Codex's approval on for tools that change Moodle, so each change waits for your OK, and say "don't change anything yet" plainly. See [Set up Codex](../../getting-started/codex.md#approving-tool-calls).
:::

## The result in Moodle

<Screenshot app="Moodle" src="/img/moodle/quiz-edit.png" alt="The quiz's questions page in Moodle: three questions, one per page" />

The quiz stays hidden from students until you show it. Here, a student took it later: see [Reviewing a quiz](../student/quiz-review.md).

## Tips

- **Moodle XML** works too, for questions exported from another Moodle. A file on your computer works as well as text in the chat.
- **Settings in the same request**: time limit, attempts, opening and closing dates, grade to pass. The agent fills them in Moodle's own form.
- **Reuse questions**: "Add the questions in the category Unit 2 to the quiz" works with questions already in a bank.
