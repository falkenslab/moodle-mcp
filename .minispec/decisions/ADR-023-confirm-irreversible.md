# ADR-023: The person confirms what can't be undone

## Decision

The tools whose effect can't be undone ask the person through MCP elicitation before they run: a form with what will happen, from the tool's inputs, and a yes/no. The answer reaches the server, never the model; declined, nothing runs and the tool says the person said no. They're listed in `src/tools/confirm.ts`: deleting (activities, sections, posts, entries, fields, questions and their categories, grade items and categories, groups and groupings, blocks, chapters, content, events, external tools, feedback items and templates, lesson pages, notes, recordings, workshop examples), unenrolling, resetting a course, restoring with `mode: "replace"`, removing a site, giving a database a preset, unlocking course completion's criteria, and removing a workshop reviewer whose assessment is graded. Grading stays out: it can be changed again.

A client without elicitation is refused, unless the person started the server with `MOODLE_MCP_CONFIRM=client` (`--confirm client`): the client asked already (an agent on agent-kit with `confirmTools`, a one-shot run that can't ask). The setting is never a tool input, and `configure` can't change it. Decided by the owner, 21 October 2026 (#50).

## Motivation

Every tool that changes Moodle tells the agent to confirm with the person first, and the instructions say so; but a model can still call one without asking, and a delete can't be taken back. Elicitation puts the question where only the person answers it. Asking for everything would make the server tiresome and the question meaningless: only what can't be recovered asks.

Rejected: a `confirmed: true` input (the model sets it), asking for every write (grades and content can be changed again), leaving it to each client (most don't gate tools).

## Consequences

- One more step in the person's app for each irreversible call; none for the rest.
- Clients without elicitation lose these tools unless the person sets `client`; the error says how.
- The question is built from the inputs only (ids, modes): it names what's touched by its ids and what goes with it, without reading Moodle first.
- A tool added that can't be undone belongs in the list; its description gets the sentence saying the server asks.
