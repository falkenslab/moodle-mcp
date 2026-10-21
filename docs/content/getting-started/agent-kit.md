---
title: Set up an agent built on agent-kit
sidebar_label: agent-kit
---

# Set up an agent built on agent-kit

[agent-kit](https://falkenslab.github.io/agent-kit/) is Falken's Lab's kit for building AI agents, such as [miyagi](https://github.com/falkenslab/miyagi) for teachers and padawan for students. Its agents install moodle-mcp as an **extension** from [Falken's Lab's marketplace](https://falkenslab.github.io/agent-extensions/), with skills that say how to do each job well:

- **moodle-teacher**, for the courses you teach;
- **moodle-student**, for the courses you take.

Both run the same moodle-mcp from npm, at a fixed version. The examples use miyagi and moodle-teacher: write your agent's command and the extension you want instead.

## From the command line

```bash
miyagi extension add moodle-teacher@falkenslab
```

It asks for its settings (below), then it's there in the agent's next conversation. An agent whose own marketplace isn't Falken's Lab's adds it first:

```bash
my-agent extension marketplace add falkenslab/agent-extensions
```

To give the settings in the same command, without being asked, add a `--set` for each one: `--set access=read`.

## Its settings {#its-settings}

The extension asks for these when it's installed:

| Setting | What it does | Default |
| --- | --- | --- |
| `sites` | Your Moodle sites, `name=address` each, separated by commas; the first is where it starts. For example `school=https://campus.myschool.org`. | required |
| `headless` | The browser works out of sight. A window opens to log in, or when you ask to watch. | yes |
| `access` | `read`: it only looks, never changes anything. | `write` |
| `student_data` | `pseudonymize` (aliases), `block` (none) or `clear` (names: only for an AI on your own computer). See [Students' privacy](../privacy.md). | `pseudonymize` |

The role is fixed by the extension: moodle-teacher gives the teacher's tools, moodle-student the student's.

To change them later:

- **in the chat**: `/extensions config moodle-teacher access=read`. The server starts again with it in the same conversation;
- **in a terminal**: `miyagi extension config moodle-teacher access=read`. The agent takes it in its next conversation;
- **in a desktop agent**: in its extension settings.

## In an agent of your own

An agent you build with agent-kit can start moodle-mcp as one of its own MCP servers, with any of the [settings](../settings.md) as environment variables:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  buildMcpServers: () => ({
    moodle: {
      command: "npx",
      args: ["-y", "@falkenslab/moodle-mcp@0.4.1"],
      env: { MOODLE_URL: "https://campus.example.org", MOODLE_MCP_ROLE: "teacher" },
    },
  }),
};
```

Pin a version (`@0.4.1`) so the agent doesn't change under you. Its tools are then `mcp__moodle__<tool>`. See agent-kit's [Tools and MCP](https://falkenslab.github.io/agent-kit/docs/capabilities/tools-and-mcp).

## Try it

Ask the agent:

> List my Moodle courses.

The first time, a browser window opens at your Moodle login page: log in as usual. See [Logging in the first time](./first-login.md).
