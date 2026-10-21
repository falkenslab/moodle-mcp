// What can't be undone, confirmed by the person (ADR-023): before such a tool runs, the server asks them
// in their app through MCP elicitation, and the model never sees the question nor the answer.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "../config.js";

type Args = Record<string, unknown>;
/** Who an input names: the alias the agent gave, or the user id. */
const who = (a: Args, alias = "user", id = "userId") => (a[alias] !== undefined ? String(a[alias]) : `user ${a[id]}`);

/**
 * The tools that ask, each with what will happen in a sentence, from its inputs; `when` limits a tool
 * to the calls that can't be undone (a restore that replaces, a reviewer whose assessment is graded).
 */
export const CONFIRMED: Record<string, { when?: (a: Args) => boolean; what: (a: Args) => string }> = {
  delete_activity: { what: (a) => `Delete activity ${a.activityId} from course ${a.courseId}, with everything participants did in it (submissions, attempts, posts, grades).` },
  delete_section: { what: (a) => `Delete section ${a.sectionId} of course ${a.courseId}, with every activity in it and what participants did in them.` },
  reset_course: { what: (a) => `Reset course ${a.courseId}: delete what its options choose (${Object.entries((a.delete as Args) ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "Moodle's defaults"}).` },
  restore_course: { when: (a) => a.mode === "replace", what: (a) => `Replace course ${a.intoCourseId}'s content with the backup: everything in it now is deleted first.` },
  unenrol_user: { what: (a) => `Unenrol ${who(a)} from course ${a.courseId}: Moodle removes their enrolment and what goes with it in the course.` },
  delete_questions: { what: (a) => `Delete ${(a.questionIds as unknown[] | undefined)?.length ?? 0} question(s) from bank ${a.bankId}, every version (those a quiz uses are hidden instead).` },
  delete_question_category: { what: (a) => `Delete question category ${a.categoryId} of bank ${a.bankId}${a.moveTo ? `, its questions moved to category ${a.moveTo}` : ""}.` },
  delete_grade_category: { what: (a) => `Delete grade category ${a.categoryId} of course ${a.courseId}.` },
  delete_grade_item: { what: (a) => `Delete grade item ${a.itemId} of course ${a.courseId}, with its grades.` },
  delete_post: { what: (a) => `Delete forum post ${a.postId}, with its replies.` },
  delete_database_entry: { what: (a) => `Delete entry ${a.entryId} of database ${a.databaseId}, with its files.` },
  delete_database_field: { what: (a) => `Delete field ${a.fieldId} of database ${a.databaseId}: what every entry has in it goes too.` },
  apply_database_preset: { what: (a) => `Give database ${a.databaseId} the preset ${a.presetId}: its fields not in the preset are deleted with what entries have in them.` },
  delete_glossary_entry: { what: (a) => `Delete entry ${a.entryId} of glossary ${a.glossaryId}, with its files.` },
  delete_group: { what: (a) => `Delete group ${a.groupId} (its members stay in the course).` },
  delete_grouping: { what: (a) => `Delete grouping ${a.groupingId} (its groups stay).` },
  delete_event: { what: (a) => `Delete calendar event ${a.eventId}.` },
  delete_block: { what: (a) => `Delete block ${a.blockId} from course ${a.courseId}'s page.` },
  delete_book_chapter: { what: (a) => `Delete chapter ${a.chapterId} of book ${a.bookId}, with its subchapters and files.` },
  delete_lesson_page: { what: (a) => `Delete page ${a.pageId} of lesson ${a.lessonId}.` },
  delete_feedback_item: { what: (a) => `Delete question ${a.itemId} of feedback ${a.feedbackId}, with the answers given to it.` },
  delete_feedback_template: { what: (a) => `Delete feedback template ${a.templateId}.` },
  delete_workshop_example: { what: (a) => `Delete example submission ${a.exampleId} of workshop ${a.workshopId}, with its assessments.` },
  remove_workshop_reviewer: { when: (a) => a.evenIfAssessed === true, what: (a) => `Remove a reviewer from a submission of workshop ${a.workshopId}, deleting their assessment and its grade.` },
  set_course_completion_criteria: { when: (a) => a.unlock === true, what: (a) => `Unlock course ${a.courseId}'s completion criteria: every participant's course completion data is deleted.` },
  delete_content: { what: (a) => `Delete content ${a.contentId} from its content bank.` },
  delete_recording: { what: (a) => `Delete recording ${a.recordingId} of BigBlueButton activity ${a.activityId}.` },
  delete_note: { what: (a) => `Delete note ${a.noteId}.` },
  delete_external_tool: { what: (a) => `Delete external tool ${a.toolId} from course ${a.courseId}.` },
  remove_site: { what: (a) => `Remove the site "${a.name}" from this server, with its browser session.` },
};

/** How long the person has to answer: ten minutes, as long as a tool may take in the clients' guides (Codex's tool_timeout_sec). */
export const CONFIRM_TIMEOUT_MS = 10 * 60_000;

/** What a confirmed tool's description adds, for the agent and the tools reference. */
export const CONFIRM_SENTENCE = "The server asks the person to confirm in their app first (MCP elicitation); declined, nothing happens.";

type Handler = (args: Args, extra: unknown) => Promise<unknown>;
type Settings = { description?: string };

/**
 * Makes every confirmed tool registered on `server` from now on ask the person before it runs (ADR-023):
 * through elicitation where the client offers it; else refused, unless the person set `MOODLE_MCP_CONFIRM=client`.
 */
export function confirmTools(server: McpServer, config: Pick<Config, "confirm">): void {
  const register = server.registerTool.bind(server) as (name: string, settings: Settings, handler: Handler) => unknown;
  (server as unknown as { registerTool: typeof register }).registerTool = (name, settings, handler) => {
    const rule = CONFIRMED[name];
    if (!rule) return register(name, settings, handler);
    return register(name, { ...settings, description: `${settings.description ?? ""} ${CONFIRM_SENTENCE}`.trim() }, async (args, extra) => {
      if (rule.when && !rule.when(args)) return handler(args, extra);
      if (!server.server.getClientCapabilities()?.elicitation) {
        if (config.confirm === "client") return handler(args, extra);
        throw new Error(`${name} needs the person's confirmation, which this app can't ask for: it doesn't support MCP elicitation. Tell the person to do it in Moodle; or, if their app asks them itself before each tool, they can start this server with MOODLE_MCP_CONFIRM=client.`);
      }
      // A person takes longer than the SDK's minute: they may be away, or reading what it deletes.
      const answer = await server.server
        .elicitInput(
          {
            mode: "form",
            message: `${rule.what(args)} This can't be undone. Go ahead?`,
            requestedSchema: { type: "object", properties: { confirm: { type: "boolean", title: "Yes, do it", description: "Leave it unticked, or decline, to change nothing" } }, required: ["confirm"] },
          },
          { timeout: CONFIRM_TIMEOUT_MS },
        )
        .catch((error: unknown) => {
          if (error instanceof McpError && error.code === ErrorCode.RequestTimeout) throw new Error(`The person didn't answer the confirmation for ${name} in ${CONFIRM_TIMEOUT_MS / 60_000} minutes: nothing was done. Ask them before trying again.`);
          throw error;
        });
      if (answer.action !== "accept" || (answer.content as { confirm?: unknown } | undefined)?.confirm !== true) throw new Error(`The person said no to ${name}: nothing was done. Don't try it again unless they ask.`);
      return handler(args, extra);
    });
  };
}
