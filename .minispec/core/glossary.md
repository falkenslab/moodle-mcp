# Glossary

## Site

The Moodle installation the server works on, given by `MOODLE_URL`.

## Profile

The browser's persistent user-data folder (`MOODLE_MCP_PROFILE_DIR`): it keeps the person's Moodle session between runs. Only one browser can use it at a time.

## Channel

Which browser Playwright launches: the system's `msedge` or `chrome`, or `chromium`, the one the server downloads when neither is installed (ADR-001).

## Domain tool

An MCP tool named after a Moodle task (`list_courses`), with Playwright hidden inside (ADR-004).

## Client

Whatever starts the server and calls its tools: Claude Code, Claude Desktop, an agent (miyagi through its plugin).
