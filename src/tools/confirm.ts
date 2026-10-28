// What can't be undone, confirmed by the person (ADR-023): before such a tool runs, the server asks them
// in their app through MCP elicitation, and the model never sees the question nor the answer. The question
// is in the person's language, from the locale; what the agent reads stays in English.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "../config.js";

type Args = Record<string, unknown>;

/** The languages the confirmations are asked in. */
export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];
type Text = Record<Language, string>;

/** The person's language as programs read it from the locale: LC_ALL, else LC_MESSAGES, else LANG (`es_ES.UTF-8` is Spanish); English otherwise. */
export function localeLanguage(env: NodeJS.ProcessEnv = process.env): Language {
  const locale = env.LC_ALL || env.LC_MESSAGES || env.LANG || "";
  return /^es([_.@]|$)/i.test(locale) ? "es" : "en";
}

/**
 * The tools that ask, each with what will happen in a sentence, from its inputs; `when` limits a tool
 * to the calls that can't be undone (a restore that replaces, a reviewer whose assessment is graded).
 */
export const CONFIRMED: Record<string, { when?: (a: Args) => boolean; what: (a: Args) => Text }> = {
  delete_activity: {
    what: (a) => ({
      en: `Delete activity ${a.activityId} from course ${a.courseId}, with everything participants did in it (submissions, attempts, posts, grades).`,
      es: `Borrar la actividad ${a.activityId} del curso ${a.courseId}, con todo lo que los participantes hicieron en ella (entregas, intentos, mensajes, calificaciones).`,
    }),
  },
  delete_section: {
    what: (a) => ({
      en: `Delete section ${a.sectionId} of course ${a.courseId}, with every activity in it and what participants did in them.`,
      es: `Borrar la sección ${a.sectionId} del curso ${a.courseId}, con todas sus actividades y lo que los participantes hicieron en ellas.`,
    }),
  },
  reset_course: {
    what: (a) => {
      const chosen = Object.entries((a.delete as Args) ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ");
      return {
        en: `Reset course ${a.courseId}: delete what its options choose (${chosen || "Moodle's defaults"}).`,
        es: `Reiniciar el curso ${a.courseId}: se borra lo que eligen sus opciones (${chosen || "lo que Moodle elige por defecto"}).`,
      };
    },
  },
  restore_course: {
    when: (a) => a.mode === "replace",
    what: (a) => ({
      en: `Replace course ${a.intoCourseId}'s content with the backup: everything in it now is deleted first.`,
      es: `Reemplazar el contenido del curso ${a.intoCourseId} por la copia de seguridad: antes se borra todo lo que tiene ahora.`,
    }),
  },
  unenrol_user: {
    // Who: the alias the agent gave, or the user id.
    what: (a) => ({
      en: `Unenrol ${a.user ?? `user ${a.userId}`} from course ${a.courseId}: Moodle removes their enrolment and what goes with it in the course.`,
      es: `Dar de baja ${a.user !== undefined ? `a ${a.user}` : `al usuario ${a.userId}`} del curso ${a.courseId}: Moodle quita su matrícula y lo que va con ella en el curso.`,
    }),
  },
  delete_questions: {
    what: (a) => {
      const count = (a.questionIds as unknown[] | undefined)?.length ?? 0;
      return {
        en: `Delete ${count} question(s) from bank ${a.bankId}, every version (those a quiz uses are hidden instead).`,
        es: `Borrar ${count} pregunta(s) del banco ${a.bankId}, con todas sus versiones (las que usa un cuestionario se ocultan en su lugar).`,
      };
    },
  },
  delete_question_category: {
    what: (a) => ({
      en: `Delete question category ${a.categoryId} of bank ${a.bankId}${a.moveTo ? `, its questions moved to category ${a.moveTo}` : ""}.`,
      es: `Borrar la categoría de preguntas ${a.categoryId} del banco ${a.bankId}${a.moveTo ? `, con sus preguntas movidas a la categoría ${a.moveTo}` : ""}.`,
    }),
  },
  delete_grade_category: {
    what: (a) => ({ en: `Delete grade category ${a.categoryId} of course ${a.courseId}.`, es: `Borrar la categoría de calificación ${a.categoryId} del curso ${a.courseId}.` }),
  },
  delete_grade_item: {
    what: (a) => ({ en: `Delete grade item ${a.itemId} of course ${a.courseId}, with its grades.`, es: `Borrar el elemento de calificación ${a.itemId} del curso ${a.courseId}, con sus calificaciones.` }),
  },
  delete_post: { what: (a) => ({ en: `Delete forum post ${a.postId}, with its replies.`, es: `Borrar el mensaje de foro ${a.postId}, con sus respuestas.` }) },
  delete_database_entry: {
    what: (a) => ({ en: `Delete entry ${a.entryId} of database ${a.databaseId}, with its files.`, es: `Borrar la entrada ${a.entryId} de la base de datos ${a.databaseId}, con sus archivos.` }),
  },
  delete_database_field: {
    what: (a) => ({
      en: `Delete field ${a.fieldId} of database ${a.databaseId}: what every entry has in it goes too.`,
      es: `Borrar el campo ${a.fieldId} de la base de datos ${a.databaseId}: lo que cada entrada tiene en él se borra también.`,
    }),
  },
  apply_database_preset: {
    what: (a) => ({
      en: `Give database ${a.databaseId} the preset ${a.presetId}: its fields not in the preset are deleted with what entries have in them.`,
      es: `Aplicar a la base de datos ${a.databaseId} el ajuste preestablecido ${a.presetId}: sus campos que no estén en él se borran con lo que las entradas tienen en ellos.`,
    }),
  },
  delete_glossary_entry: {
    what: (a) => ({ en: `Delete entry ${a.entryId} of glossary ${a.glossaryId}, with its files.`, es: `Borrar la entrada ${a.entryId} del glosario ${a.glossaryId}, con sus archivos.` }),
  },
  delete_group: { what: (a) => ({ en: `Delete group ${a.groupId} (its members stay in the course).`, es: `Borrar el grupo ${a.groupId} (sus miembros siguen en el curso).` }) },
  delete_grouping: { what: (a) => ({ en: `Delete grouping ${a.groupingId} (its groups stay).`, es: `Borrar el agrupamiento ${a.groupingId} (sus grupos se mantienen).` }) },
  delete_event: { what: (a) => ({ en: `Delete calendar event ${a.eventId}.`, es: `Borrar el evento de calendario ${a.eventId}.` }) },
  delete_block: { what: (a) => ({ en: `Delete block ${a.blockId} from course ${a.courseId}'s page.`, es: `Borrar el bloque ${a.blockId} de la página del curso ${a.courseId}.` }) },
  delete_book_chapter: {
    what: (a) => ({ en: `Delete chapter ${a.chapterId} of book ${a.bookId}, with its subchapters and files.`, es: `Borrar el capítulo ${a.chapterId} del libro ${a.bookId}, con sus subcapítulos y archivos.` }),
  },
  delete_lesson_page: { what: (a) => ({ en: `Delete page ${a.pageId} of lesson ${a.lessonId}.`, es: `Borrar la página ${a.pageId} de la lección ${a.lessonId}.` }) },
  delete_feedback_item: {
    what: (a) => ({
      en: `Delete question ${a.itemId} of feedback ${a.feedbackId}, with the answers given to it.`,
      es: `Borrar la pregunta ${a.itemId} de la encuesta ${a.feedbackId}, con las respuestas que se le dieron.`,
    }),
  },
  delete_feedback_template: { what: (a) => ({ en: `Delete feedback template ${a.templateId}.`, es: `Borrar la plantilla de encuesta ${a.templateId}.` }) },
  delete_workshop_example: {
    what: (a) => ({
      en: `Delete example submission ${a.exampleId} of workshop ${a.workshopId}, with its assessments.`,
      es: `Borrar el envío de ejemplo ${a.exampleId} del taller ${a.workshopId}, con sus evaluaciones.`,
    }),
  },
  remove_workshop_reviewer: {
    when: (a) => a.evenIfAssessed === true,
    what: (a) => ({
      en: `Remove a reviewer from a submission of workshop ${a.workshopId}, deleting their assessment and its grade.`,
      es: `Quitar un evaluador de un envío del taller ${a.workshopId}, borrando su evaluación y su calificación.`,
    }),
  },
  set_course_completion_criteria: {
    when: (a) => a.unlock === true,
    what: (a) => ({
      en: `Unlock course ${a.courseId}'s completion criteria: every participant's course completion data is deleted.`,
      es: `Desbloquear los criterios de finalización del curso ${a.courseId}: se borran los datos de finalización del curso de todos los participantes.`,
    }),
  },
  delete_content: { what: (a) => ({ en: `Delete content ${a.contentId} from its content bank.`, es: `Borrar el contenido ${a.contentId} de su banco de contenido.` }) },
  delete_recording: {
    what: (a) => ({ en: `Delete recording ${a.recordingId} of BigBlueButton activity ${a.activityId}.`, es: `Borrar la grabación ${a.recordingId} de la actividad BigBlueButton ${a.activityId}.` }),
  },
  delete_note: { what: (a) => ({ en: `Delete note ${a.noteId}.`, es: `Borrar la nota ${a.noteId}.` }) },
  delete_external_tool: {
    what: (a) => ({ en: `Delete external tool ${a.toolId} from course ${a.courseId}.`, es: `Borrar la herramienta externa ${a.toolId} del curso ${a.courseId}.` }),
  },
  remove_site: {
    what: (a) => ({ en: `Remove the site "${a.name}" from this server, with its browser session.`, es: `Quitar el sitio "${a.name}" de este servidor, con su sesión del navegador.` }),
  },
};

/** The question's fixed texts: after what will happen, and the field the person ticks. */
const ASK: Record<Language, { undone: string; yes: string; leave: string }> = {
  en: { undone: "This can't be undone. Go ahead?", yes: "Yes, do it", leave: "Leave it unticked, or decline, to change nothing" },
  es: { undone: "No se puede deshacer. ¿Seguimos?", yes: "Sí, hazlo", leave: "Déjalo sin marcar, o rechaza, para no cambiar nada" },
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
  const language = localeLanguage();
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
      const ask = ASK[language];
      // A person takes longer than the SDK's minute: they may be away, or reading what it deletes.
      const answer = await server.server
        .elicitInput(
          {
            mode: "form",
            message: `${rule.what(args)[language]} ${ask.undone}`,
            requestedSchema: { type: "object", properties: { confirm: { type: "boolean", title: ask.yes, description: ask.leave } }, required: ["confirm"] },
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
