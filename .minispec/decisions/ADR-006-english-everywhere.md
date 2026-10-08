# ADR-006: English everywhere in the repository

## Decision

Code, comments, tool names and descriptions, the server's `instructions`, `README.md`, `CLAUDE.md`, `.minispec/` and commit messages are in English.

## Motivation

The server is generic and meant for any MCP client and any Moodle, in any language; models follow English tool descriptions best, and the sibling projects (agent-kit) use the same rule.

## Consequences

- Tools must not depend on the language of Moodle's interface: they rely on URLs, roles and attributes, not on visible Spanish or English texts, wherever Moodle allows it.
- Conversation with the owner can be in another language; nothing of it goes into the repo untranslated.
