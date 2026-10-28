---
title: Set up an agent built on agent-kit
sidebar_label: agent-kit
---

# Set up an agent built on agent-kit

[agent-kit](https://falkenslab.github.io/agent-kit/) is Falken's Lab's kit for building AI agents, such as [miyagi](https://github.com/falkenslab/miyagi) for teachers and padawan for students. They add moodle-mcp as an **extension** from [Falken's Lab's marketplace](https://falkenslab.github.io/agent-extensions/), which also teaches them how to do each job well. There are two:

- **moodle-teacher**, if you teach;
- **moodle-student**, if you study.

The examples use miyagi and moodle-teacher: write your agent's name and the one you need instead.

## 1. Install it

In a terminal:

<Terminal>{`$ miyagi extension add moodle-teacher@falkenslab`}</Terminal>

It asks you a few questions; for now, only the first matters: **your Moodle sites**, as `name=address`, such as `school=https://campus.myschool.org`. Press Enter on the others to keep their defaults, which are safe ones.

(An agent that isn't miyagi or padawan may need Falken's Lab's marketplace first: `my-agent extension marketplace add falkenslab/agent-extensions`.)

## 2. Try it

Open the agent and ask:

<Prompt>{`List my Moodle courses.`}</Prompt>

The first time, a browser window opens at your Moodle's login page: log in as you always do. moodle-mcp never sees your password, and keeps you logged in for the next times. See [Logging in the first time](./first-login.md).

## 3. Where it's kept

The agent keeps the extension and its answers with its own extensions. To see them:

<Terminal>{`$ miyagi extension info moodle-teacher
$ miyagi extension config moodle-teacher`}</Terminal>

The second shows its settings and their values: `sites`, `courses`, `headless`, `access` and `student_data`.

## 4. Make it yours {#make-it-yours}

Change a setting with `extension config`, in a terminal, or with `/extensions config` in the agent's chat, where it applies straight away:

<Terminal>{`$ miyagi extension config moodle-teacher access=read`}</Terminal>

### If you teach, or study

That's the extension you choose: moodle-teacher has a teacher's tools (building courses, grading, the forum, reports), moodle-student a student's (your courses, what's due, doing activities, your grades). Fewer tools to choose from, so the agent chooses better.

### Your students' names

You don't need to do anything: **by default the AI never sees other people's names**. It sees each person as an alias, such as `A-7KQ2XM`, always the same one, and only you can find out who it is, on your computer ([Students' privacy](../privacy.md)). Two other choices:

- `student_data=block`: the AI sees nothing at all about other people.
- `student_data=clear`: real names. Only with an AI that runs on your own computer.

### So it only looks

`access=read`

The agent can read your courses, submissions and grades, but can't change anything: no grading, posting or creating.

### To watch what it does

`headless=false`

moodle-mcp works in a browser you don't see; with this, you see its window all the time. You can also just ask "show me the browser" when you want to watch.

### Only this year's courses

`courses=https://campus.myschool.org/course/view.php?id=12`

The agent works only in the courses you list (their addresses, separated by commas), not in last year's or other ones. Copy each address from your browser when you're on the course's page. See [Classrooms](../limits.md#classrooms).

### More sites

`sites=school=https://campus.myschool.org,uni=https://moodle.myuni.edu`

Your sites, separated by commas; the first is where it starts.

## 5. While you use it {#while-you-use-it}

- **In guided mode, the agent asks you before the steps that change things.** `miyagi extension config moodle-teacher confirm=off` stops it asking, for an extension you trust.
- **What can't be undone asks you again**: before deleting something, unenrolling someone or resetting a course, moodle-mcp itself asks you, and nothing happens until you say yes.

## 6. Other setups {#where-to-set-it-up}

- **For one project only**: `miyagi extension add moodle-teacher@falkenslab --project`, in that project's folder. Its settings there win over the agent's, only in that project.
- **In an agent of your own**: it starts moodle-mcp as one of its own helpers, with any [setting](../settings.md):

  ```ts
  buildMcpServers: () => ({
    moodle: {
      command: "npx",
      args: ["-y", "@falkenslab/moodle-mcp@0.7.0"],
      env: { MOODLE_MCP_COURSES: "https://campus.myschool.org/course/view.php?id=12", MOODLE_MCP_ROLE: "teacher" },
    },
  }),
  ```

  Pin a version (`@0.7.0`) so it doesn't change under you. See agent-kit's [Tools and MCP](https://falkenslab.github.io/agent-kit/docs/capabilities/tools-and-mcp).

To remove it: `miyagi extension remove moodle-teacher` (`--project` for a project's).
