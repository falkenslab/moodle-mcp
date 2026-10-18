// Advanced tools (ADR-022): areas few people use, there only with MOODLE_MCP_ADVANCED=true, so every
// chat doesn't pay for them. Filled as each area is wired; an area is advanced by how rarely it's used.

/** The tools that exist only with the advanced setting on. */
export const ADVANCED_TOOLS: ReadonlySet<string> = new Set<string>([
  // Course blocks
  "list_course_blocks",
  "add_block",
  "configure_block",
  "move_block",
  "delete_block",
  // The content bank
  "list_content_bank",
  "upload_to_content_bank",
  "rename_content",
  "download_content",
  "delete_content",
  // BigBlueButton
  "get_bigbluebutton",
  "get_bigbluebutton_join_url",
  "set_recording_published",
  "delete_recording",
  // Notes about participants
  "list_notes",
  "add_note",
  "edit_note",
  "delete_note",
  // Competencies
  "list_competency_frameworks",
  "list_course_competencies",
  "add_course_competency",
  "remove_course_competency",
  "set_activity_competencies",
  "get_competency_rating",
  "rate_competency",
  // External tools (LTI)
  "list_external_tools",
  "add_external_tool",
  "set_external_tool_in_chooser",
  "delete_external_tool",
  "get_external_tool_launch_url",
]);
