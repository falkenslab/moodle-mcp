// Follow mode (ADR-011): the Moodle page that shows each tool's work, for the tools that work through
// AJAX and open no page of their own (those that do are followed by `openSitePage`).
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./types.js";

type Args = Record<string, number | undefined>;

const course = (a: Args) => `course/view.php?id=${a.courseId}`;

/** Each AJAX tool's page, relative to the site, from its arguments. */
export const FOLLOWED_PAGES: Record<string, (args: Args) => string> = {
  get_me: () => "user/profile.php",
  list_courses: () => "my/courses.php",
  get_course_structure: course,
  list_assignments: (a) => `mod/assign/index.php?id=${a.courseId}`,
  list_pending: course,
  get_activities_overview: (a) => `course/overview.php?id=${a.courseId}`,
  list_deadlines: () => "calendar/view.php?view=upcoming",
  get_course_updates: course,
  get_discussion: (a) => `mod/forum/discuss.php?d=${a.discussionId}`,
  get_submissions: (a) => `mod/assign/view.php?id=${a.assignmentId}&action=grading`,
  // By alias (pseudonymous mode) the user id isn't known here: the grading list instead.
  grade_submission: (a) => (a.userId ? `mod/assign/view.php?id=${a.assignmentId}&action=grader&userid=${a.userId}` : `mod/assign/view.php?id=${a.assignmentId}&action=grading`),
  get_completion_report: (a) => `report/progress/index.php?course=${a.courseId}`,
  list_participants: (a) => `user/index.php?id=${a.courseId}`,
  list_groups: (a) => `group/index.php?id=${a.courseId}`,
  set_discussion_state: (a) => `mod/forum/view.php?id=${a.forumId}`,
  list_notifications: () => "message/output/popup/notifications.php",
  mark_notifications_read: () => "message/output/popup/notifications.php",
  list_conversations: () => "message/index.php",
  get_conversation: () => "message/index.php",
  send_message: () => "message/index.php",
  get_rubric: (a) => `mod/assign/view.php?id=${a.assignmentId}`,
  set_badge_enabled: (a) => `badges/overview.php?id=${a.badgeId}`,
  list_events: (a) => `calendar/view.php?view=upcoming${a.courseId ? `&course=${a.courseId}` : ""}`,
  create_event: (a) => `calendar/view.php?view=upcoming&course=${a.courseId}`,
  delete_event: () => "calendar/view.php?view=upcoming",
  update_grade_item: (a) => `grade/edit/tree/index.php?id=${a.courseId}`,
  add_grade_category: (a) => `grade/edit/tree/index.php?id=${a.courseId}`,
  edit_activity: course,
  duplicate_activity: course,
  delete_activity: course,
  add_section: course,
  edit_section: course,
  delete_section: course,
};

type Handler = (args: Args, extra: unknown) => Promise<{ isError?: boolean }>;

/**
 * Makes every tool registered on `server` from now on show its page when it succeeds, while the
 * person watches. Showing is best effort (`BrowserManager.show`) and costs nothing otherwise.
 */
export function followTools(server: McpServer, { config, browser }: ToolContext): void {
  const register = server.registerTool.bind(server) as (name: string, settings: unknown, handler: Handler) => unknown;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) =>
    register(name, settings, async (args, extra) => {
      const result = await handler(args, extra);
      const page = FOLLOWED_PAGES[name];
      if (page && !result.isError && config.moodleUrl && browser.visible()) await browser.show(new URL(page(args), config.moodleUrl).href);
      return result;
    });
}
