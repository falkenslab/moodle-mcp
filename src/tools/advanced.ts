// Advanced tools (ADR-022): areas few people use, there only with MOODLE_MCP_ADVANCED=true, so every
// chat doesn't pay for them. Filled as each area is wired; an area is advanced by how rarely it's used.

/** The tools that exist only with the advanced setting on. */
export const ADVANCED_TOOLS: ReadonlySet<string> = new Set<string>([]);
