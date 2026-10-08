# ADR-011: Follow mode

## Decision

A `follow` setting (variable, argument and `configure`), off by default and independent of `headless`: with a visible browser and `follow` on, each domain tool also shows, in the visible tab, the Moodle page it's working on (the course page for its structure, the grading table for submissions…).

## Motivation

Domain tools work mostly through AJAX from a hidden service tab (ADR-008), so a visible browser shows almost nothing of what the agent does. A person who wants to watch the agent, or check its work, needs the page the tool is about.

## Consequences

- Each domain tool names the page that shows its work; showing it is best effort and never changes the tool's result.
- Slower when on (one more page load per call); no cost when off.
- Without a visible browser, `follow` has no effect, and `server_info` says so.
