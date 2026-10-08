# ADR-008: Moodle's AJAX services through the logged-in page

## Decision

A tool reads Moodle through the AJAX services its own pages use (`lib/ajax/service.php`, functions marked `ajax => true`), called from a logged-in tab with the page's `sesskey` and cookies, whenever such a service gives what the tool needs. It scrapes rendered HTML only when no service does. It never uses a web service token.

## Motivation

The services return structured data, independent of the interface's language and theme (ADR-006), and are what Moodle's own JavaScript calls, so they exist on any site where the page works. Scraped HTML changes with themes and versions. A web service token would need the site to enable web services and the person to create a token, a credential the server would have to hold (ADR-002).

## Consequences

- Tools still act only as the person logged in, with their permissions: a service the page can't call, the tool can't either.
- One tab with a session is kept open and reused for service calls (`src/moodle/ajax.ts`); a `servicerequireslogin` or `invalidsesskey` answer means a new tab, and if the site shows its login page, `NotLoggedInError`.
- Which service a tool uses is an internal detail: a service missing in an older Moodle is a bug to fix in that tool, with the Moodle version noted.
