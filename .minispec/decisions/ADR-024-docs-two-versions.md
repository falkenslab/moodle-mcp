# ADR-024: The docs site keeps two versions

## Decision

The documentation site serves only two versions: the latest release's (the default) and the next one's (`/next`, the current `docs/content/`). Cutting a release snapshots its docs and deletes the previous snapshot: its `versioned_docs/`, `versioned_sidebars/` and Spanish `i18n/…/version-X.Y.Z` files, and its line in `versions.json`. An older release's documentation is read in the repository at its tag (`docs/content/` at `vX.Y.Z`). Decided by the owner, 21 October 2026.

## Motivation

Every snapshot is a whole copy of the manual in English and Spanish: five releases in, the build compiled seven copies of every page, slowing it and every check of a docs change, for versions nobody is told to use (`npx -y @falkenslab/moodle-mcp` starts the latest). Git already keeps each release's docs at its tag.

Rejected: keeping every version (the cost grows with each release), keeping none (a page written for the next release would show as if it were out, and the released one would change under its users).

## Consequences

- The version menu offers the release and *Next*; the Releases page says where older docs are.
- A link from the home page to a page that only exists in the next release points at `/next/…` until the release.
- The `release` skill deletes the previous snapshot when it cuts the new one.
