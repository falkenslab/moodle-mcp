---
title: Watching what the agent does
sidebar_label: Watching the agent
---

# Watching what the agent does

The agent works in Moodle without a window, so it doesn't get in your way. When you want to see what it's doing, ask:

> Show me the browser.

A browser window opens, already logged in, and each step the agent takes shows up in it: the course page, the submission it reads, the form it fills. It's a good way to get to know moodle-mcp, or to check a task you're not sure about.

To go back to working in the background:

> Hide the browser.

Closing the window yourself does the same.

## Checking the result in Moodle

Every tool that creates something gives the agent its link, so you can ask for it:

> Give me the link to the quiz you just created.

And everything the agent does is in Moodle as if you had done it yourself: in the course, in the gradebook, and in Moodle's logs, under your name.

## While it works

- **It asks first.** The agent is told to confirm with you before anything that changes Moodle: a grade, a post, a message, a new activity. Your AI app may also ask you to approve each tool call.
- **It says what it couldn't do.** If a tool isn't available (because of the [limits](../limits.md) you set), or Moodle refused something, the agent tells you why.
- **It works at a student's pace when acting as a student.** Activities done as a student (a lesson, a quiz, a SCORM package) are read page by page with pauses, so Moodle records them as a person would. See [`MOODLE_MCP_TRAIL`](../settings.md).
