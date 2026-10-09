# ADR-013: Other people's personal data: minimized, and pseudonymous by default

## Decision

Tools never give other people's contact data (email, phone, address, IP), photos or profile fields, and give activity times only when asked. Beyond that, a pseudonymous mode, on by default (`MOODLE_MCP_PSEUDONYMIZE`, `--pseudonymize` / `--no-pseudonymize`, `configure`), replaces every other person with a stable alias: the client sees `A-7K3F`, never a name or a Moodle user id, and the person using the server resolves aliases on their own machine. Their own name and data stay visible: they are the one using the agent.

- **Aliases.** `A-` plus a short base32 HMAC-SHA256 of the site and the Moodle user id under a secret key: the same person on the same site always gets the same alias, in every course and session, and it can't be undone without the key (lengthened on a collision).
- **The key.** 32 random bytes in the user's configuration folder (`%APPDATA%\moodle-mcp\pseudonym.key`, `~/.config/moodle-mcp/` elsewhere), never inside the browser profile, so deleting the profile to log in again keeps it. A marker records that a key existed: if the key is missing then, the server refuses pseudonymous mode and explains, instead of making a new key that would silently change every alias. `moodle-mcp key export | import | fingerprint` moves it between machines (or shares it in a department) and checks it.
- **The local directory.** Whenever a tool meets a person, the server stores alias → Moodle id, full name and email in a file next to the key, encrypted with it (AES-256-GCM). `moodle-mcp whois <alias>` and `moodle-mcp alias "<name>"` read it offline, in the person's terminal; `moodle-mcp aliases --course <id>` exports a course's table to a file they choose.
- **Tools.** Outputs carry aliases instead of names and user ids, and URLs with user ids lose them; write tools take an alias and translate it inside. Free text (submissions, posts) gets known participants' names replaced by their aliases, best effort.
- **Browser fallback tools (ADR-010).** In pseudonymous mode, snapshots get known names replaced and user ids removed from links; screenshots are refused (a picture can't be redacted).

## Motivation

The server's results go to a language model, often outside the EU. Teachers' tasks need to tell students apart, not to know who they are, and their own notes need a stable reference they can resolve later. Encrypting each person's data into the output (a token per student) was considered: legally it's the same pseudonymization, it sends contact data the model doesn't need, a leaked key would expose everything ever sent, it changes when a name or email changes, and it costs the model hundreds of characters per mention. A short alias sends nothing to expose; the encrypted data stays on the person's machine. Off by default would rely on every institution configuring it; on by default is privacy by design (decided by the owner, 9 October 2026).

## Consequences

- Not anonymization: what people write about themselves in free text goes as written, and an alias plus enough context can identify someone. The README says so, lists what each tool sends, and leaves the legal basis, the processing agreement and the international transfer to the institution.
- The alias protects against sending names by accident, not against an agent that reads the key or runs `whois` on the same machine: the README gives the client permissions that deny it (the configuration folder and those commands).
- Losing the key loses the way back from old aliases, by design; `key export` is the backup.
- Every tool that shows other people goes through one module (`moodle/people.ts`), and tests check that no name or user id leaks in pseudonymous mode.
