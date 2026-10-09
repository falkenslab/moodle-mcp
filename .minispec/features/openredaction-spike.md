# OpenRedaction spike

## Goal

Decide, with numbers, whether OpenRedaction redacts the contact and identity data people write in Spanish free text (submissions, forum posts) well enough to use in pseudonymous mode.

## Context

- Pseudonymous mode replaces known participants' names itself; what students write about themselves (an email, a phone, a DNI, an IBAN, an address) needs pattern detection.
- OpenRedaction (TypeScript, regex-first, 570+ patterns, deterministic tokens) looked closest; not yet checked: npm package, licence, maintenance, dependencies, ESM and types, Spanish formats.
- The courses are often programming: code in submissions (variables called `email`, numbers, hashes) must not turn into noise.

## Changes

- No code in the repository: a script in the scratch folder, run in Docker.
- A test set of 40–60 made-up Spanish texts: forum posts and submissions with DNI and NIE (with check letters), +34 mobiles and landlines, ES IBANs, emails, postal addresses, dates of birth, and texts without any (code, maths, prose with numbers).
- Measure per kind: found, missed, false positives; time per text; the package's size and dependencies.
- Try its deterministic mode: the same value gives the same token across texts.
- Compare a small set of our own patterns (email, +34 phone, DNI/NIE with check letter, ES IBAN) on the same set.

## Acceptance

- A verdict in the closing commit and in `pseudonymous-mode.md`: adopt OpenRedaction (which patterns, which configuration), or our own patterns, with the counts behind it.
- No made-up value in the set looks like a real person's data.
