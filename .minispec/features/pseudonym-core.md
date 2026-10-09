# Pseudonym core

## Goal

A module with no Moodle in it (`src/pseudonym/`) that gives stable aliases for people, keeps a local encrypted directory and resolves aliases for the person in their terminal (ADR-013), ready to become a package when a second server needs it.

## Context

- Detection libraries (Presidio, OpenRedaction) and MCP proxies (MCP Conceal) replace PII found in free text with per-session tokens; none gives an alias that stays the same for a person forever, from structured data, resolvable offline. The cryptography is in `node:crypto`: no dependency needed.
- Shared by every server on the machine that integrates it: one key, one directory, one `whois`.

## Changes

- Files in the user's configuration folder, `pseudonym/` (`%APPDATA%` on Windows, `~/.config` elsewhere), readable by the user only: `key` (32 random bytes), `directory.enc`, `used` (a key existed).
- Two subkeys from the key (HKDF): one for aliases, one for the directory.
- `aliasFor({ service, identifiers })`: identifiers in order of preference (institutional id, institutional email, the service's own id), normalized; `A-` plus base32 of an HMAC, lengthened on a collision. Without cross-service linking (default) the service's name enters the HMAC.
- Directory entries: alias, display name, the service ids, matchers (HMACs of email and institutional id, never in clear), first and last seen. An entry matched by any identifier keeps its first alias. AES-256-GCM, written under a file lock (several servers may write).
- A missing key after `used` exists: refuse, explaining, instead of a new key.
- CLI (`pseudonym …`, also reachable as `moodle-mcp pseudonym …`): `whois <alias>`, `alias "<name>"`, `link <alias> <alias>`, `forget <alias>`, `prune --older-than <age>`, `key export | import | fingerprint`.
- Tests: same alias across instances and restarts; different per service unless linked; first alias kept when the email changes; directory unreadable without the key; refusal when the key is lost; concurrent writers.

## Acceptance

- Two processes with the same key give the same alias for the same identifiers; another key gives another.
- `whois` resolves an alias recorded by a server; `forget` removes it; `prune` removes entries not seen within the age.
- `key export` then `key import` on a fresh folder gives the same aliases; the fingerprint matches.
- The directory file contains no name, email or id in clear.
