// Tool scopes and the student data policy (ADR-015, ADR-016): which tools exist for the agent, from
// the data the driver says each of their functions touches. The person sets the limits at start-up;
// configure only narrows them.
import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DATA_CATEGORIES, moduleCategories, type DataCategory } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { ADVANCED_TOOLS } from "./advanced.js";
import { roleAllows } from "./roles.js";

export const SCOPES = ["content", "student-data", "grading", "communication", "as-student", "browser"] as const;
export type Scope = (typeof SCOPES)[number];

/** Named sets of scopes, for the person to pick one instead of a list. */
export const PROFILES: Record<string, readonly Scope[]> = {
  all: SCOPES,
  teacher: ["content", "student-data", "grading", "communication"],
  student: ["content", "student-data", "communication", "as-student"],
  content: ["content"],
};

/** Whether the agent may change Moodle (ADR-020): `read` keeps only the tools that change nothing. */
export const ACCESS_LEVELS = ["read", "write"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

// The tools that only read, as each declares itself (`readOnlyHint`) when it's registered.
const readOnlyTools = new Set<string>();
// Tools that only read Moodle but save a file on the person's computer: not read-only to MCP, which
// counts the disk as the environment (so a client may ask before each), yet they change nothing in Moodle.
const LOCAL_FILE_TOOLS = new Set(["download_file", "export_grades", "export_glossary", "export_database_entries", "export_questions", "anonymize_backup"]);

/** How others' data reaches the agent, strictest first (ADR-016). */
export const STUDENT_DATA_LEVELS = ["block", "pseudonymize", "clear"] as const;
export type StudentDataLevel = (typeof STUDENT_DATA_LEVELS)[number];

/** What `block` takes away, whatever the scopes: others' data, decisions about others, the browser that reaches anything. */
const BLOCKED: readonly Scope[] = ["student-data", "grading", "browser"];

/** Tools that are always there: the session, the sites, the person's own courses, the server itself. */
const SESSION_TOOLS = new Set(["configure", "login", "logout", "get_me", "get_site_info", "list_courses", "show_browser", "server_info", "list_sites", "add_site", "use_site", "remove_site"]);

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
  list_notifications: ["notifications", "userById"],
  mark_notifications_read: ["markNotificationsRead"],
  list_conversations: ["conversations", "userById"],
  get_conversation: ["conversation", "userById"],
  send_message: ["sendMessage"],
  list_participants: ["participants"],
  list_groups: ["groups", "participants"],
  get_grader_report: ["graderReport"],
  get_completion_report: ["completionReport"],
  get_quiz_results: ["quizResults"],
  override_completion: ["overrideCompletion"],
  grant_extension: ["grantExtension"],
  set_quiz_override: ["setQuizOverride"],
  set_discussion_state: ["setDiscussionState"],
  // The person's own following of a discussion, given back as the forum lists it (other people's names).
  set_discussion_subscription: ["category:communication", "category:others-personal"],
  // Copies, backups and restores are content; with users, the tools check the limits themselves (courseLifecycle.ts).
  copy_course: ["category:course-content"],
  backup_course: ["category:course-content"],
  restore_course: ["category:course-content"],
  copy_between_sites: ["category:course-content"],
  import_activities: ["importActivities"],
  reset_course: ["resetCourse"],
  edit_quiz_slot: ["editQuizSlot"],
  remove_quiz_slot: ["removeQuizSlot"],
  set_quiz_pages: ["setQuizPages"],
  add_quiz_section: ["addQuizSection"],
  update_question: ["updateQuestion"],
  delete_questions: ["deleteQuestions"],
  set_question_status: ["setQuestionStatus"],
  add_grade_item: ["addGradeItem"],
  update_grade_category: ["updateGradeCategory"],
  delete_grade_category: ["deleteGradeCategory"],
  delete_grade_item: ["deleteGradeItem"],
  get_event: ["calendarEvent"],
  update_event: ["updateEvent"],
  create_group: ["createGroup"],
  update_group: ["updateGroup"],
  delete_group: ["deleteGroup"],
  list_groupings: ["groupings"],
  create_grouping: ["createGrouping"],
  delete_grouping: ["deleteGrouping"],
  set_grouping_groups: ["setGroupingGroups"],
  list_enrolment_methods: ["enrolmentMethods"],
  set_enrolment_method: ["setEnrolmentMethod"],
  get_activity_report: ["activityReport"],
  get_participation_report: ["participationReport"],
  get_course_logs: ["courseLogs"],
  list_potential_users: ["potentialUsers"],
  enrol_users: ["enrolUsers"],
  unenrol_user: ["unenrolUser"],
  set_user_roles: ["setUserRoles"],
  set_group_members: ["setGroupMembers", "participants"],
  set_grade: ["setGrade"],
  get_forum_grades: ["forumGrades"],
  grade_forum_user: ["gradeForumUser"],
  list_questions_to_grade: ["questionsToGrade"],
  grade_quiz_question: ["gradeQuizQuestion"],
  set_workflow_state: ["setWorkflowState"],
  allocate_marker: ["allocateMarker"],
  rate: ["rate"],
  export_grades: ["exportGrades"],
  get_workshop: ["workshopInfo"],
  set_workshop_phase: ["setWorkshopPhase"],
  assess_workshop_submission: ["assessWorkshopSubmission"],
  edit_post: ["editPost"],
  delete_post: ["deletePost"],
  message_participants: ["messageParticipants", "participants"],
  get_choice: ["getChoice"],
  answer_choice: ["answerChoice"],
  get_lesson_page: ["lessonPage"],
  answer_lesson_page: ["answerLessonPage"],
  get_h5p_activity: ["h5pActivity"],
  get_scorm: ["scorm"],
  // It leaves the browser tools' tab in the player, for them to do the package: the fallback's scope too.
  open_scorm: ["openScorm", "BrowserManager.tab"],
  set_completion: ["setCompletion"],
  get_activity_settings: ["activitySettings"],
  update_course: ["updateCourse"],
  list_question_banks: ["questionBanks"],
  list_questions: ["questions"],
  import_questions: ["importQuestions"],
  create_question: ["createQuestion"],
  get_quiz_structure: ["quizStructure"],
  add_questions_to_quiz: ["addQuestionsToQuiz"],
  get_rubric: ["rubric"],
  set_rubric: ["setGradingDefinition"],
  // Checked here, without Moodle: what they read is what the agent gives them.
  validate_gift: ["category:course-content"],
  read_backup: ["backupContents"],
  anonymize_backup: ["anonymizeBackup"],
  list_course_blocks: ["courseBlocks"],
  add_block: ["addBlock"],
  configure_block: ["configureBlock"],
  move_block: ["moveBlock"],
  delete_block: ["deleteBlock"],
  list_content_bank: ["contentBank"],
  upload_to_content_bank: ["uploadToContentBank"],
  rename_content: ["renameContent"],
  download_content: ["downloadContent"],
  delete_content: ["deleteContent"],
  get_bigbluebutton: ["bigBlueButton"],
  get_bigbluebutton_join_url: ["bigBlueButtonJoinUrl"],
  set_recording_published: ["setRecordingPublished"],
  delete_recording: ["deleteRecording"],
  list_notes: ["notes"],
  add_note: ["addNote"],
  edit_note: ["editNote"],
  delete_note: ["deleteNote"],
  list_competency_frameworks: ["competencyFrameworks"],
  list_course_competencies: ["courseCompetencies"],
  add_course_competency: ["addCourseCompetency"],
  remove_course_competency: ["removeCourseCompetency"],
  set_activity_competencies: ["setActivityCompetencies"],
  rate_competency: ["rateCompetency"],
  list_external_tools: ["externalTools"],
  add_external_tool: ["addExternalTool"],
  set_external_tool_in_chooser: ["setExternalToolInChooser"],
  delete_external_tool: ["deleteExternalTool"],
  get_external_tool_launch_url: ["externalToolLaunchUrl"],
  // A participant's own rating, or (for a teacher) someone else's: the stricter of the two.
  get_competency_rating: ["category:others-personal"],
  list_wiki_pages: ["wikiPages"],
  get_wiki_page: ["wikiPage"],
  create_wiki_page: ["createWikiPage"],
  edit_wiki_page: ["editWikiPage"],
  import_grades: ["importGrades"],
  list_scales: ["courseScales"],
  add_scale: ["addScale"],
  edit_scale: ["editScale"],
  get_grade_letters: ["gradeLetters"],
  set_grade_letters: ["setGradeLetters"],
  auto_create_groups: ["autoCreateGroups"],
  import_groups: ["importGroups"],
  get_feedback_items: ["feedbackItems"],
  add_feedback_item: ["addFeedbackItem"],
  edit_feedback_item: ["editFeedbackItem"],
  move_feedback_item: ["moveFeedbackItem"],
  delete_feedback_item: ["deleteFeedbackItem"],
  list_feedback_templates: ["feedbackTemplates"],
  use_feedback_template: ["useFeedbackTemplate"],
  save_feedback_template: ["saveFeedbackTemplate"],
  delete_feedback_template: ["deleteFeedbackTemplate"],
  get_quiz_statistics: ["quizStatistics"],
  list_glossary_entries: ["glossaryEntries"],
  add_glossary_entry: ["addGlossaryEntry"],
  edit_glossary_entry: ["editGlossaryEntry"],
  delete_glossary_entry: ["deleteGlossaryEntry"],
  set_glossary_entry_approved: ["setGlossaryEntryApproved"],
  list_glossary_categories: ["glossaryCategories"],
  add_glossary_category: ["addGlossaryCategory"],
  export_glossary: ["exportGlossaryEntries"],
  import_glossary: ["importGlossaryEntries"],
  list_database_entries: ["databaseEntries"],
  add_database_entry: ["addDatabaseEntry"],
  edit_database_entry: ["editDatabaseEntry"],
  delete_database_entry: ["deleteDatabaseEntry"],
  set_database_entry_approved: ["setDatabaseEntryApproved"],
  export_database_entries: ["exportDatabaseEntries"],
  import_database_entries: ["importDatabaseEntries"],
  get_choice_results: ["choiceResults"],
  get_survey_results: ["surveyResults"],
  save_workshop_submission: ["saveWorkshopSubmission"],
  list_workshop_examples: ["workshopExamples"],
  add_workshop_example: ["addWorkshopExample"],
  edit_workshop_example: ["editWorkshopExample"],
  delete_workshop_example: ["deleteWorkshopExample"],
  assess_workshop_example: ["assessWorkshopExample"],
  calculate_workshop_grades: ["calculateWorkshopGrades"],
  override_workshop_grade: ["overrideWorkshopGrade"],
  get_course_completion_criteria: ["courseCompletionCriteria"],
  set_course_completion_criteria: ["setCourseCompletionCriteria"],
  get_course_completion_status: ["courseCompletionStatus"],
  mark_course_complete: ["markCourseComplete"],
  list_question_categories: ["questionCategories"],
  add_question_category: ["addQuestionCategory"],
  edit_question_category: ["editQuestionCategory"],
  delete_question_category: ["deleteQuestionCategory"],
  move_questions: ["moveQuestions"],
  export_questions: ["exportQuestions"],
  // A participant's own submission, or (for a teacher or a reviewer) someone else's: the stricter of the two.
  get_workshop_submission: ["category:others-personal"],
  validate_html: ["category:course-content"],
  list_book_chapters: ["bookChapters"],
  add_book_chapter: ["addBookChapter"],
  edit_book_chapter: ["editBookChapter"],
  move_book_chapter: ["moveBookChapter"],
  set_book_chapter_visibility: ["setBookChapterVisible"],
  delete_book_chapter: ["deleteBookChapter"],
  get_lesson_pages: ["lessonPages"],
  add_lesson_page: ["addLessonPage"],
  edit_lesson_page: ["editLessonPage"],
  move_lesson_page: ["moveLessonPage"],
  delete_lesson_page: ["deleteLessonPage"],
  get_database_fields: ["databaseFields"],
  add_database_field: ["addDatabaseField"],
  edit_database_field: ["editDatabaseField"],
  delete_database_field: ["deleteDatabaseField"],
  get_database_templates: ["databaseTemplates"],
  set_database_template: ["setDatabaseTemplate"],
  list_database_presets: ["databasePresets"],
  apply_database_preset: ["applyDatabasePreset"],
  list_badges: ["courseBadges"],
  create_badge: ["createBadge"],
  set_badge_criteria: ["setBadgeCriteria"],
  set_badge_enabled: ["setBadgeEnabled"],
  award_badge: ["awardBadge"],
  get_workshop_allocation: ["workshopAllocation"],
  allocate_workshop_reviewer: ["allocateReviewer"],
  remove_workshop_reviewer: ["removeReviewer"],
  allocate_workshop_randomly: ["allocateRandomly"],
  schedule_workshop_allocation: ["scheduleAllocation"],
  list_events: ["upcomingEvents"],
  create_event: ["createEvent"],
  delete_event: ["deleteEvent"],
  get_gradebook_setup: ["gradebookSetup"],
  update_grade_item: ["updateGradeItem"],
  add_grade_category: ["addGradeCategory"],
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
export function toolAllowed(tool: string, config: Pick<Config, "scopes" | "studentData" | "role" | "access" | "advanced">): boolean {
  if (SESSION_TOOLS.has(tool)) return true;
  if (ADVANCED_TOOLS.has(tool) && !config.advanced) return false;
  if (!roleAllows(tool, config.role)) return false;
  if (config.access === "read" && !readOnlyTools.has(tool) && !LOCAL_FILE_TOOLS.has(tool)) return false;
  // A picture can't be redacted (ADR-017).
  if (tool === "browser_screenshot" && config.studentData !== "clear") return false;
  const active = activeScopes(config);
  return [...requiredScopes(tool)].every((scope) => active.has(scope));
}

/** Whether others' data may be read or acted on under this configuration. */
export function studentDataAllowed(config: Pick<Config, "scopes" | "studentData">): boolean {
  return activeScopes(config).has("student-data");
}

/** Whether others' files (submissions, attachments) can reach the agent: their content can't be pseudonymized, so only with names in clear. */
export function othersFilesAllowed(config: Pick<Config, "scopes" | "studentData">): boolean {
  return studentDataAllowed(config) && config.studentData === "clear";
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
    if ((settings as { annotations?: { readOnlyHint?: boolean } }).annotations?.readOnlyHint === true) readOnlyTools.add(name);
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
export function describeLimits(config: Pick<Config, "scopes" | "studentData" | "role" | "access">): string {
  return `${config.access === "read" ? "read-only; " : ""}${config.role === "all" ? "" : `role ${config.role}; `}scopes ${[...activeScopes(config)].join(", ") || "none"}; student data ${config.studentData}`;
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

// Pages about people (ADR-017), by their path under the site: mostly people, so one name printed without
// a profile link would be enough. Forums too: their domain tools pseudonymize them.
const PEOPLE_PATHS = [
  /^(user|enrol|cohort|group|message|blog|notes|badges\/recipients|admin\/user)(\/|\.php|$)/,
  /^grade\/(report|export|import)\//,
  /(^|\/)reports?(\/|\.php)/,
  /^mod\/assign\/grader\.php$/,
  /^mod\/quiz\/(review|report|overrides|reviewquestion|comment)\.php$/,
  /^mod\/forum\//,
];
const PEOPLE_QUERY = /^(user|userid|users|uid|participant|selecteduser)$/i;
const GRADING_ACTIONS = /^(grading|grader|grade|viewpluginassignsubmission|viewpluginassignfeedback)$/i;

/**
 * Whether a page of the site is about people (ADR-017): known people's pages, any page for a given
 * user, the assignment's grading views, others' files. Off the site, false: the off-site guard decides.
 */
export function showsPeople(url: URL, siteUrl: string): boolean {
  const site = new URL(siteUrl);
  if (url.origin !== site.origin || !url.pathname.startsWith(site.pathname.replace(/\/?$/, "/"))) return false;
  if (holdsOthersFiles(url)) return true;
  const path = url.pathname.slice(site.pathname.replace(/\/?$/, "/").length);
  if ([...url.searchParams.keys()].some((key) => PEOPLE_QUERY.test(key))) return true;
  if (path === "mod/assign/view.php") return GRADING_ACTIONS.test(url.searchParams.get("action") ?? "");
  return PEOPLE_PATHS.some((pattern) => pattern.test(path));
}

/** Whether activities of a module may hold others' work (submissions, posts, attempts, responses). */
export function holdsOthersWork(module: string): boolean {
  return moduleCategories(module).some((category) => category === "others-personal" || category === "any");
}
