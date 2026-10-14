// Tools for a role (ADR-018): which tools a teacher or a student uses in Moodle, so an agent working for
// one gets only those. Beside the scopes (ADR-015), which are by the data a tool touches: a tool exists
// when the role, the scopes and the student data level all allow it.

export const ROLES = ["all", "teacher", "student"] as const;
export type Role = (typeof ROLES)[number];

/** Both roles: the session, reading a course, forums and messages, the calendar, the browser fallback. */
const SHARED = [
  "configure",
  "login",
  "logout",
  "get_me",
  "get_site_info",
  "list_courses",
  "show_browser",
  "server_info",
  "list_sites",
  "add_site",
  "use_site",
  "remove_site",
  "get_course_structure",
  "get_activity_content",
  "download_file",
  "list_assignments",
  "get_activities_overview",
  "list_deadlines",
  "get_course_updates",
  "list_events",
  "get_event",
  "get_quiz_info",
  "get_attempt_review",
  "get_choice",
  "get_h5p_activity",
  "get_scorm",
  "list_participants",
  "list_groups",
  "list_discussions",
  "get_discussion",
  "reply_to_post",
  "create_discussion",
  "edit_post",
  "delete_post",
  "set_discussion_subscription",
  "rate",
  // Students assess each other's work in a workshop's assessment phase.
  "assess_workshop_submission",
  "list_notifications",
  "mark_notifications_read",
  "list_conversations",
  "get_conversation",
  "send_message",
  "browser_navigate",
  "browser_snapshot",
  "browser_click",
  "browser_type",
  "browser_select",
  "browser_upload",
  "browser_screenshot",
  "browser_wait",
] as const;

/** A student's own work: doing activities, their grades and what they have left to do. */
const STUDENT = [
  "get_my_grades",
  "list_pending",
  "start_quiz_attempt",
  "get_quiz_attempt",
  "answer_quiz_questions",
  "finish_quiz_attempt",
  "get_assignment",
  "save_submission",
  "submit_assignment",
  "get_survey",
  "submit_survey",
  "answer_choice",
  "get_lesson_page",
  "answer_lesson_page",
  "open_scorm",
  "set_completion",
] as const;

/** A teacher's: building and managing courses, grading, people, reports. */
const TEACHER = [
  "get_activity_settings",
  "create_activity",
  "update_activity",
  "edit_activity",
  "duplicate_activity",
  "delete_activity",
  "add_section",
  "edit_section",
  "delete_section",
  "update_course",
  "copy_course",
  "backup_course",
  "restore_course",
  "copy_between_sites",
  "import_activities",
  "reset_course",
  "list_question_banks",
  "list_questions",
  "import_questions",
  "create_question",
  "update_question",
  "delete_questions",
  "set_question_status",
  "get_quiz_structure",
  "add_questions_to_quiz",
  "edit_quiz_slot",
  "remove_quiz_slot",
  "set_quiz_pages",
  "add_quiz_section",
  "get_quiz_results",
  "set_quiz_override",
  "list_questions_to_grade",
  "grade_quiz_question",
  "get_submissions",
  "get_rubric",
  "grade_submission",
  "grant_extension",
  "set_workflow_state",
  "allocate_marker",
  "get_grader_report",
  "set_grade",
  "export_grades",
  "get_gradebook_setup",
  "add_grade_item",
  "update_grade_item",
  "delete_grade_item",
  "add_grade_category",
  "update_grade_category",
  "delete_grade_category",
  "get_completion_report",
  "override_completion",
  "get_activity_report",
  "get_participation_report",
  "get_course_logs",
  "list_potential_users",
  "enrol_users",
  "unenrol_user",
  "set_user_roles",
  "list_enrolment_methods",
  "set_enrolment_method",
  "create_group",
  "update_group",
  "delete_group",
  "set_group_members",
  "list_groupings",
  "create_grouping",
  "delete_grouping",
  "set_grouping_groups",
  "set_discussion_state",
  "get_forum_grades",
  "grade_forum_user",
  "get_workshop",
  "set_workshop_phase",
  "message_participants",
  "create_event",
  "update_event",
  "delete_event",
] as const;

/** The three lists, for the test that every tool is in exactly one. */
export const ROLE_LISTS = { shared: SHARED, student: STUDENT, teacher: TEACHER };

/** Each tool's roles; a tool missing here exists only for `all` (and a test fails on it). */
export const TOOL_ROLES: Record<string, readonly Exclude<Role, "all">[]> = Object.fromEntries([
  ...SHARED.map((tool) => [tool, ["teacher", "student"]] as const),
  ...STUDENT.map((tool) => [tool, ["student"]] as const),
  ...TEACHER.map((tool) => [tool, ["teacher"]] as const),
]);

/** Whether a role uses a tool: `all` uses every one. */
export function roleAllows(tool: string, role: Role): boolean {
  return role === "all" || (TOOL_ROLES[tool]?.includes(role) ?? false);
}

/** Whether one role's tools are among another's: only `all` holds the others. */
export function roleWithin(role: Role, of: Role): boolean {
  return of === "all" || role === of;
}
