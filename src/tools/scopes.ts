// Tool scopes and the student data policy (ADR-015, ADR-016): which tools exist for the agent, from
// the data the driver says each of their functions touches. The person sets the limits at start-up;
// configure only narrows them.
import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DATA_CATEGORIES, moduleCategories, type DataCategory } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";

export const SCOPES = ["content", "student-data", "grading", "communication", "as-student", "browser"] as const;
export type Scope = (typeof SCOPES)[number];

/** Named sets of scopes, for the person to pick one instead of a list. */
export const PROFILES: Record<string, readonly Scope[]> = {
  all: SCOPES,
  teacher: ["content", "student-data", "grading", "communication"],
  student: ["content", "student-data", "communication", "as-student"],
  content: ["content"],
};

/** How others' data reaches the agent, strictest first (ADR-016). */
export const STUDENT_DATA_LEVELS = ["block", "pseudonymize", "clear"] as const;
export type StudentDataLevel = (typeof STUDENT_DATA_LEVELS)[number];

/** What `block` takes away, whatever the scopes: others' data, decisions about others, the browser that reaches anything. */
const BLOCKED: readonly Scope[] = ["student-data", "grading", "browser"];

/** Tools that are always there: the session, the site, the person's own courses, the server itself. */
const SESSION_TOOLS = new Set(["configure", "login", "logout", "get_me", "get_site_info", "list_courses", "show_browser", "server_info"]);

const BROWSER_TOOLS = ["browser_navigate", "browser_snapshot", "browser_click", "browser_type", "browser_select", "browser_upload", "browser_screenshot", "browser_wait"];

/**
 * The driver functions each tool calls (`DATA_CATEGORIES` keys); `module:<name>` for one that reads an
 * activity of that module; `category:<name>` where the tool narrows a function itself. A tool missing here gets no scope and is refused: a new tool must be listed.
 */
export const TOOL_FUNCTIONS: Record<string, readonly string[]> = {
  get_course_structure: ["courseStructure"],
  get_activity_content: ["activityContent", ...["page", "book", "label", "url", "resource", "folder"].map((m) => `module:${m}`)],
  list_assignments: ["listAssignments"],
  get_submissions: ["assignmentSubmissions"],
  list_discussions: ["forumDiscussions"],
  get_discussion: ["discussion"],
  get_my_grades: ["myGrades"],
  // Its others' part (submitted files, attachments) is refused by URL without `student-data` (downloadFile.ts).
  download_file: ["category:course-content"],
  get_survey: ["getSurvey"],
  submit_survey: ["submitSurvey"],
  list_pending: ["pendingActivities"],
  get_activities_overview: ["activitiesOverview"],
  list_deadlines: ["deadlines"],
  get_course_updates: ["courseUpdates"],
  get_quiz_info: ["quizInfo"],
  start_quiz_attempt: ["startQuizAttempt"],
  get_quiz_attempt: ["readAttempt"],
  answer_quiz_questions: ["answerQuizQuestions"],
  finish_quiz_attempt: ["finishQuizAttempt"],
  get_attempt_review: ["readReview"],
  get_assignment: ["studentAssignment"],
  save_submission: ["saveSubmission"],
  submit_assignment: ["submitForGrading"],
  grade_submission: ["gradeSubmission"],
  reply_to_post: ["replyToPost"],
  create_discussion: ["startDiscussion"],
  create_activity: ["createActivity"],
  update_activity: ["updateActivity"],
  edit_activity: ["editActivity"],
  duplicate_activity: ["duplicateActivity"],
  // Activities holding others' work are refused without `student-data` (courseLayout.ts).
  delete_activity: ["deleteActivity"],
  delete_section: ["deleteSection"],
  add_section: ["addSection"],
  edit_section: ["editSection"],
  ...Object.fromEntries(BROWSER_TOOLS.map((name) => [name, ["BrowserManager.tab"]])),
};

/** The data categories of a tool, from the driver's declarations. */
export function toolCategories(tool: string): DataCategory[] {
  return (TOOL_FUNCTIONS[tool] ?? []).flatMap((fn): readonly DataCategory[] => {
    if (fn.startsWith("module:")) return moduleCategories(fn.slice(7));
    if (fn.startsWith("category:")) return [fn.slice(9) as DataCategory];
    return DATA_CATEGORIES[fn] ?? ["any"];
  });
}

/**
 * The scopes a tool needs, all of them (the strictest wins): `any` needs the browser scope,
 * communication its own, deciding about others grading, others' data student-data, what teachers make
 * and counts content; the person's own data alone is acting as a student.
 */
export function requiredScopes(tool: string): Set<Scope> {
  const categories = new Set(toolCategories(tool));
  const scopes = new Set<Scope>();
  if (categories.size === 0) return new Set(SCOPES); // Unlisted: only with every scope, and listed it should be.
  if (categories.has("any")) scopes.add("browser");
  if (categories.has("communication")) scopes.add("communication");
  if (categories.has("others-write")) scopes.add("grading");
  if (categories.has("others-personal")) scopes.add("student-data");
  if (categories.has("course-content") || categories.has("others-aggregate")) scopes.add("content");
  if (categories.has("own") && !categories.has("course-content")) scopes.add("as-student");
  if (scopes.size === 0) scopes.add("content");
  return scopes;
}

/** The scopes in force: those set, without what the student data level blocks. */
export function activeScopes(config: Pick<Config, "scopes" | "studentData">): Set<Scope> {
  return new Set(config.scopes.filter((scope) => !(config.studentData === "block" && BLOCKED.includes(scope))));
}

/** Whether a tool exists for the agent under this configuration. */
export function toolAllowed(tool: string, config: Pick<Config, "scopes" | "studentData">): boolean {
  if (SESSION_TOOLS.has(tool)) return true;
  const active = activeScopes(config);
  return [...requiredScopes(tool)].every((scope) => active.has(scope));
}

/** Whether others' data may be read or acted on under this configuration. */
export function studentDataAllowed(config: Pick<Config, "scopes" | "studentData">): boolean {
  return activeScopes(config).has("student-data");
}

/** A tool called outside the scopes in force: refused without touching Moodle. */
export class OutOfScopeError extends Error {
  override name = "OutOfScopeError";
}

type Handler = (args: unknown, extra: unknown) => Promise<unknown>;

// Every tool registered on a server, to enable and disable them as the scopes change.
const registered = new WeakMap<McpServer, Map<string, RegisteredTool>>();

/**
 * Makes every tool registered on `server` from now on refuse calls outside the scopes in force, and
 * keeps its handle so `applyScopes` can hide or show it. Installed last, so it wraps the others.
 */
export function scopeTools(server: McpServer, config: Config): void {
  const tools = new Map<string, RegisteredTool>();
  registered.set(server, tools);
  const register = server.registerTool.bind(server) as (name: string, settings: unknown, handler: Handler) => RegisteredTool;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) => {
    const tool = register(name, settings, async (args, extra) => {
      // A client that missed the list change can still call a hidden tool: the server says no.
      if (!toolAllowed(name, config)) throw new OutOfScopeError(`${name} is outside what this server allows (${describeLimits(config)}). The person sets that in the client's configuration of the server; it can't be widened from here.`);
      return handler(args, extra);
    });
    tools.set(name, tool);
    return tool;
  };
}

/** Hides the tools outside the scopes in force and shows the others; the SDK tells the client the list changed. */
export function applyScopes(server: McpServer, config: Config): void {
  for (const [name, tool] of registered.get(server) ?? []) {
    const allowed = toolAllowed(name, config);
    if (allowed && !tool.enabled) tool.enable();
    else if (!allowed && tool.enabled) tool.disable();
  }
}

/** The limits in words, for messages and the instructions. */
export function describeLimits(config: Pick<Config, "scopes" | "studentData">): string {
  return `scopes ${[...activeScopes(config)].join(", ") || "none"}; student data ${config.studentData}`;
}

/** A scope list or profile name, as the person writes it: `content`, `teacher`, `content,communication`… */
export function parseScopes(value: string): Scope[] {
  const items = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const scopes = new Set<Scope>();
  for (const item of items) {
    const profile = PROFILES[item];
    if (profile) profile.forEach((scope) => scopes.add(scope));
    else if ((SCOPES as readonly string[]).includes(item)) scopes.add(item as Scope);
    else throw new Error(`"${item}" is neither a scope (${SCOPES.join(", ")}) nor a profile (${Object.keys(PROFILES).join(", ")}).`);
  }
  if (scopes.size === 0) throw new Error(`Give at least one scope or profile (${Object.keys(PROFILES).join(", ")}).`);
  return SCOPES.filter((scope) => scopes.has(scope));
}

// Components whose files teachers make (pluginfile.php/<context>/<component>/<area>/…); any component's
// "intro" and "introattachment" areas are the activity's description, teacher-made too.
const CONTENT_COMPONENTS = new Set(["mod_resource", "mod_folder", "mod_page", "mod_book", "mod_label", "mod_url", "mod_lesson", "mod_h5pactivity", "mod_scorm", "mod_imscp", "course", "question", "block_html"]);

/**
 * Whether a site URL may hold others' files: submissions, feedback files, forum attachments, users'
 * drafts and areas, anything not known to be teacher-made. Media outside Moodle's file scripts (a video
 * library on the same host) is the site's content.
 */
export function holdsOthersFiles(url: URL): boolean {
  const path = url.pathname;
  if (/\/draftfile\.php\//.test(path)) return true;
  const match = /\/(?:token)?pluginfile\.php\/\d+\/([^/]+)\/([^/]+)/.exec(path);
  if (!match) return false;
  const [, component, area] = match as unknown as [string, string, string];
  if (area === "intro" || area === "introattachment") return false;
  return !(CONTENT_COMPONENTS.has(component) || component.startsWith("qtype_"));
}

/** Whether activities of a module may hold others' work (submissions, posts, attempts, responses). */
export function holdsOthersWork(module: string): boolean {
  return moduleCategories(module).some((category) => category === "others-personal" || category === "any");
}
