---
title: Set up an agent built on agent-kit
sidebar_label: agent-kit
---

# Set up an agent built on agent-kit

[agent-kit](https://falkenslab.github.io/agent-kit/) is Falken's Lab's kit for building AI agents, such as [miyagi](https://github.com/falkenslab/miyagi) for teachers and padawan for students. Its agents install moodle-mcp as an **extension** from [Falken's Lab's marketplace](https://falkenslab.github.io/agent-extensions/), with skills that say how to do each job well:

- **moodle-teacher**, for the courses you teach;
- **moodle-student**, for the courses you take.

Both run the same moodle-mcp from npm, at a fixed version. The examples use miyagi and moodle-teacher: write your agent's command and the extension you want instead.

## Start

```bash
miyagi extension add moodle-teacher@falkenslab
```

It asks for its settings (below), and it's there in the agent's next conversation. An agent whose own marketplace isn't Falken's Lab's adds it first: `my-agent extension marketplace add falkenslab/agent-extensions`. Then ask the agent **"List my Moodle courses"**: the first time, a browser window opens at your Moodle login page ([Logging in the first time](./first-login.md)).

### Its settings {#its-settings}

| Setting | What it does | Values |
| --- | --- | --- |
| `sites` | Your Moodle sites, the first where it starts | `name=address` each, separated by commas, such as `school=https://campus.myschool.org`. Required |
| `headless` | Whether you see the browser | **yes**: out of sight; a window opens to log in, or when you ask to watch. no: a visible window |
| `access` | Whether the agent may change Moodle | **`write`**: reads and changes. `read`: only looks |
| `student_data` | What the AI sees of other people ([Students' privacy](../privacy.md)) | **`pseudonymize`**: aliases. `block`: nothing. `clear`: names, only for an AI on your own computer |

The role is the extension's: moodle-teacher has the teacher's tools, moodle-student the student's. To give the settings in the same command, add a `--set` for each: `--set access=read`.

## Where to set it up

An agent keeps its extensions in two scopes, as Claude Code does:

| Scope | Where it's there | How |
| --- | --- | --- |
| The agent's | In all its projects | `extension add …` |
| A project's | Only in that project, over the agent's | `extension add … --project` |

### Everywhere

The extension in the agent's scope, as in [Start](#start): every project of the agent has Moodle, with the same sites and settings.

- **Why**: one setup; the agent's usual way.

### A project with its own settings

A project of yours (a course you're preparing, the notes of a subject) where the extension should have other settings: another site, read-only access.

```bash
cd ~/courses/programming-1
miyagi extension add moodle-teacher@falkenslab --project --set access=read
```

- **Why**: that project's settings win over the agent's, only there.
- **Mind**: the extension's settings don't include [classrooms](../limits.md#classrooms) yet; for an agent held to some courses, see the next one.

### An agent of your own

An agent you build with agent-kit starts moodle-mcp as one of its own MCP servers, with any [setting](../settings.md), classrooms included:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  buildMcpServers: () => ({
    moodle: {
      command: "npx",
      args: ["-y", "@falkenslab/moodle-mcp@0.5.0"],
      env: { MOODLE_MCP_COURSES: "https://campus.example.org/course/view.php?id=12", MOODLE_MCP_ROLE: "teacher" },
    },
  }),
};
```

- **Why**: the agent comes with Moodle, set as you need. Pin a version (`@0.5.0`) so it doesn't change under you. Its tools are `mcp__moodle__<tool>`; see agent-kit's [Tools and MCP](https://falkenslab.github.io/agent-kit/docs/capabilities/tools-and-mcp).

## While you use it

In guided mode, the agent asks you before the tools that change things; `extension config moodle-teacher confirm=off` lets them run without asking, for an extension you trust. What can't be undone (deleting, unenrolling, resetting a course) is asked again by moodle-mcp itself: see [Confirming what can't be undone](../limits.md#confirming-what-cant-be-undone).

## Changing or removing it

- **In the chat**: `/extensions config moodle-teacher access=read`; the server starts again with it in the same conversation.
- **In a terminal**: `miyagi extension config moodle-teacher access=read`, taken in the agent's next conversation.
- **In a desktop agent**: its extension settings.
- **Removing it**: `miyagi extension remove moodle-teacher` (`--project` for a project's).
