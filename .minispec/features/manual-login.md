# Manual login

## Goal

A `login` tool opens a visible browser at the site and waits for the person to log in by hand; the session then lives in the profile and every other tool uses it (ADR-002).

## Context

- `browser.ts` opens one persistent context on the profile, headless by default; a profile admits a single browser at a time.
- No tool knows yet whether the session is alive. Logged out, the sandbox redirects any page to `/login/index.php` (confirmed empirically, Moodle 5.2 sandbox, Edge and Chrome headless).
- Institutional sites may log in through SSO on another domain, with 2FA: the server can only wait for the person to come back to the site logged in.

## Changes

- `browser.ts`: a headed context on demand for login, closing a headless one first; later tools reopen in the configured mode.
- A session check shared by every tool: detect the login page (URL under `login/`, Moodle's `notloggedin` body class) and fail with an error that tells the client to call `login`. No dependence on the interface's language (ADR-006).
- `tools/login.ts`: `login` returns at once if the session is alive; otherwise opens `login/index.php`, waits (timeout as an input, default 5 minutes) until the person is back on the site logged in, and returns the user's full name and the site's name. Annotations: not read-only, not destructive, idempotent.
- `instructions.ts`: name the tool in the rule about expired sessions.
- Tests: the session check against saved login and dashboard HTML; `login` with a fake browser.

## Acceptance

- Against moodle-sandbox with an empty profile: `login` opens a window, the teacher logs in by hand, the tool returns their name.
- After restarting the server, `login` returns at once without a window, and the profile folder kept the session.
- A tool called with an empty profile reports a missing session and names `login`.
- A timeout closes the window and says so; nothing in the repo, the results or the logs contains a credential or cookie.
