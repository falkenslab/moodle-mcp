# ADR-002: Manual login on a persistent profile

## Decision

The server never types a password. A login tool opens a visible browser at the site and waits for the person to log in; the session lives in a persistent browser profile (`launchPersistentContext`) whose folder comes from the configuration (`MOODLE_MCP_PROFILE_DIR`, by default under the user's home), never inside the server's own folder.

## Motivation

Credentials in an MCP server end up in configuration files, logs and transcripts the model can read. Institutional Moodles often log in through SSO, with two-factor authentication or captchas that a script can't pass anyway. A persistent profile keeps the session (cookies, SSO) between runs, as the person's own browser would.

## Consequences

- The first use, and every expired session, needs a person at the screen; tools detect a logged-out page and tell the client to call the login tool.
- The profile holds a live session: it's sensitive, kept out of the repo and of the package, and the server refuses a profile folder inside its own folder.
- Only one browser can open a profile at a time: the server keeps a single context and reuses it.
