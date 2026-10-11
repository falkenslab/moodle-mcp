# ADR-017: Browser fallback tools under pseudonymize: people's pages refused, people on a page as aliases

## Decision

The browser fallback tools (ADR-010) exist under `pseudonymize`, not only under `clear` (amends ADR-016), with three guards that apply while the server pseudonymizes:

- **People's pages are never opened.** A navigation of the tab (typed, clicked or redirected) to a page known to be about people is cancelled before Moodle answers, as one off the site is: participants, profiles, enrolments, groups, messages, blogs and notes, grade reports, imports and exports, any report (`report/…`, `…/report.php`), the assignment grader, quiz reviews and overrides, forums (their domain tools pseudonymize them), any page for a given user (`userid=`, `user=`), and others' files (ADR-015's `holdsOthersFiles`).
- **People on any other page become aliases.** Before a snapshot leaves, the people Moodle links to their profile (`user/view.php?id=…`, `user/profile.php?id=…`, the way core and plugins print a person) are remembered with their user id; the snapshot and the page title then go through pseudonym's `redact()`, and user ids in links are removed. The person's own name stays.
- **Screenshots only with `clear`**: a picture can't be redacted.

Under `block` the fallback stays off; under `clear` none of this applies.

## Motivation

The fallback is for what no domain tool covers, above all plugins nobody planned for, and since pseudonymization became the default it was off by default (11 October 2026). A list of URLs alone fails exactly there: a plugin's report has paths no list knows. Moodle prints people as links to their profile, core and plugins alike, so finding them in the page works where the list doesn't; the list covers the pages that are mostly people, where one name printed without a link would be enough to leak (decided by the owner, 11 October 2026).

## Consequences

- Residual risk, as in free text (ADR-013): a name printed without a profile link, of someone the directory doesn't know yet, reaches the agent. The README says so; `block` remains for those who can't accept it.
- A click that saves and then redirects to a people's page (a grading form going back to the grader) takes effect, and the page that follows isn't opened: the tool says so.
- The list grows with what live use finds; a page used often through the fallback becomes a domain tool (ADR-010).
