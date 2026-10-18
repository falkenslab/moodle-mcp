// Writes the tools reference (content/reference/tools.md, and its Spanish copy) from the server's own
// tools/list, so it can't drift from the code. Needs the built server (npm run build at the root).
//   node scripts/tools-reference.mjs
// Every tool belongs to one area below; a tool missing from them fails the script, so a new tool
// can't go unlisted.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "../../node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";

const SERVER = fileURLToPath(new URL("../../dist/server.mjs", import.meta.url));
// The Spanish titles, descriptions and inputs, each with a hash of the English it translates: when the
// English changes, the tool shows in English until its translation is brought up to date.
//   node scripts/tools-reference.mjs --english <file>   writes the English to translate, with the hashes
const TRANSLATIONS = fileURLToPath(new URL("../i18n/es/tools.json", import.meta.url));
const OUT = {
  en: fileURLToPath(new URL("../content/reference/tools.md", import.meta.url)),
  es: fileURLToPath(new URL("../i18n/es/docusaurus-plugin-content-docs/current/reference/tools.md", import.meta.url)),
};

const AREAS = [
  { id: "session", en: "Session", es: "Sesión", tools: ["login", "logout", "get_me", "get_site_info", "configure", "show_browser", "server_info", "list_sites", "add_site", "use_site", "remove_site"] },
  { id: "content", en: "Courses and content", es: "Cursos y contenido", tools: ["list_courses", "get_course_structure", "get_activity_content", "get_activity_settings", "download_file", "create_activity", "update_activity", "validate_html", "edit_activity", "duplicate_activity", "delete_activity", "add_section", "edit_section", "delete_section", "update_course"] },
  { id: "activities", en: "Books, lessons, wikis, glossaries, databases and feedback", es: "Libros, lecciones, wikis, glosarios, bases de datos y feedback", tools: ["list_book_chapters", "add_book_chapter", "edit_book_chapter", "move_book_chapter", "set_book_chapter_visibility", "delete_book_chapter", "get_lesson_pages", "add_lesson_page", "edit_lesson_page", "move_lesson_page", "delete_lesson_page", "get_database_fields", "add_database_field", "edit_database_field", "delete_database_field", "get_database_templates", "set_database_template", "list_database_presets", "apply_database_preset", "list_database_entries", "add_database_entry", "edit_database_entry", "delete_database_entry", "set_database_entry_approved", "export_database_entries", "import_database_entries", "list_glossary_entries", "add_glossary_entry", "edit_glossary_entry", "delete_glossary_entry", "set_glossary_entry_approved", "list_glossary_categories", "add_glossary_category", "export_glossary", "import_glossary", "list_wiki_pages", "get_wiki_page", "create_wiki_page", "edit_wiki_page", "get_feedback_items", "add_feedback_item", "edit_feedback_item", "move_feedback_item", "delete_feedback_item", "list_feedback_templates", "use_feedback_template", "save_feedback_template", "delete_feedback_template"] },
  { id: "lifecycle", en: "Course life cycle", es: "Ciclo de vida del curso", tools: ["copy_course", "backup_course", "restore_course", "read_backup", "anonymize_backup", "import_activities", "reset_course", "copy_between_sites"] },
  { id: "grading", en: "Assignments and grading", es: "Tareas y calificación", tools: ["list_assignments", "get_submissions", "get_rubric", "set_rubric", "grade_submission", "grant_extension", "set_workflow_state", "allocate_marker"] },
  { id: "quizzes", en: "Quizzes and questions", es: "Cuestionarios y preguntas", tools: ["list_question_banks", "list_questions", "validate_gift", "import_questions", "create_question", "update_question", "delete_questions", "set_question_status", "list_question_categories", "add_question_category", "edit_question_category", "delete_question_category", "move_questions", "export_questions", "get_quiz_structure", "add_questions_to_quiz", "edit_quiz_slot", "remove_quiz_slot", "set_quiz_pages", "add_quiz_section", "get_quiz_results", "get_quiz_statistics", "set_quiz_override", "list_questions_to_grade", "grade_quiz_question"] },
  { id: "gradebook", en: "Gradebook and progress", es: "Calificador y progreso", tools: ["get_grader_report", "set_grade", "export_grades", "get_gradebook_setup", "add_grade_item", "update_grade_item", "delete_grade_item", "add_grade_category", "update_grade_category", "delete_grade_category", "import_grades", "list_scales", "add_scale", "edit_scale", "get_grade_letters", "set_grade_letters", "get_completion_report", "override_completion", "get_course_completion_criteria", "set_course_completion_criteria", "get_course_completion_status", "mark_course_complete"] },
  { id: "badges", en: "Badges", es: "Insignias", tools: ["list_badges", "create_badge", "set_badge_criteria", "set_badge_enabled", "award_badge"] },
  { id: "advanced", en: "Advanced tools (MOODLE_MCP_ADVANCED)", es: "Herramientas avanzadas (MOODLE_MCP_ADVANCED)", tools: ["list_course_blocks", "add_block", "configure_block", "move_block", "delete_block", "list_content_bank", "upload_to_content_bank", "rename_content", "download_content", "delete_content", "get_bigbluebutton", "get_bigbluebutton_join_url", "set_recording_published", "delete_recording", "list_notes", "add_note", "edit_note", "delete_note", "list_competency_frameworks", "list_course_competencies", "add_course_competency", "remove_course_competency", "set_activity_competencies", "get_competency_rating", "rate_competency", "list_external_tools", "add_external_tool", "set_external_tool_in_chooser", "delete_external_tool", "get_external_tool_launch_url"] },
  { id: "reports", en: "Reports", es: "Informes", tools: ["get_activity_report", "get_participation_report", "get_course_logs", "get_choice_results", "get_survey_results"] },
  { id: "participants", en: "Participants and groups", es: "Participantes y grupos", tools: ["list_participants", "list_potential_users", "enrol_users", "unenrol_user", "set_user_roles", "list_enrolment_methods", "set_enrolment_method", "list_groups", "create_group", "update_group", "delete_group", "set_group_members", "list_groupings", "create_grouping", "delete_grouping", "set_grouping_groups", "auto_create_groups", "import_groups"] },
  { id: "communication", en: "Forums, workshops and messages", es: "Foros, talleres y mensajes", tools: ["list_discussions", "get_discussion", "reply_to_post", "create_discussion", "edit_post", "delete_post", "set_discussion_state", "set_discussion_subscription", "get_forum_grades", "grade_forum_user", "rate", "get_workshop", "set_workshop_phase", "assess_workshop_submission", "get_workshop_submission", "save_workshop_submission", "list_workshop_examples", "add_workshop_example", "edit_workshop_example", "delete_workshop_example", "assess_workshop_example", "calculate_workshop_grades", "override_workshop_grade", "get_workshop_allocation", "allocate_workshop_reviewer", "remove_workshop_reviewer", "allocate_workshop_randomly", "schedule_workshop_allocation", "list_notifications", "mark_notifications_read", "list_conversations", "get_conversation", "send_message", "message_participants"] },
  { id: "calendar", en: "Calendar and to-dos", es: "Calendario y pendientes", tools: ["list_events", "get_event", "create_event", "update_event", "delete_event", "list_deadlines", "list_pending", "get_activities_overview", "get_course_updates"] },
  { id: "student", en: "As a student", es: "Como alumno", tools: ["get_my_grades", "get_assignment", "save_submission", "submit_assignment", "get_quiz_info", "start_quiz_attempt", "get_quiz_attempt", "answer_quiz_questions", "finish_quiz_attempt", "get_attempt_review", "get_survey", "submit_survey", "get_choice", "answer_choice", "get_lesson_page", "answer_lesson_page", "get_h5p_activity", "get_scorm", "open_scorm", "set_completion"] },
  { id: "browser", en: "Browser", es: "Navegador", tools: ["browser_navigate", "browser_snapshot", "browser_click", "browser_type", "browser_select", "browser_upload", "browser_screenshot", "browser_wait"] },
];

const TEXT = {
  en: {
    title: "Tools",
    intro: (n, d) =>
      `moodle-mcp has **${n} tools**, ${d} at the default privacy level. This page is generated from the server itself, so it lists them exactly as your AI app gets them, with the descriptions the agent reads. You don't call tools yourself: you ask in your own words, and the agent picks them.\n\nIn the tables, ✓ marks the tools you still get with each limit: **Read only** with [read-only access](../limits.md#read-only), **Teacher** and **Student** with each [role](../limits.md#your-role). Read-only access leaves out every tool that changes something in Moodle (a grade, a post, an activity, an attempt); session tools, such as logging in or showing the browser, are always there, and so are \`download_file\` and \`export_grades\`, which only save a file on your computer.`,
    area: "Tool",
    changes: "Read only",
    teacher: "Teacher",
    student: "Student",
    inputs: "Inputs",
    params: ["Input", "Required", "Type", "Description"],
    types: {},
    none: "No inputs.",
    required: "required",
    yes: "yes",
    clearOnly: "Only with `MOODLE_MCP_STUDENT_DATA=clear`: what it returns can't be pseudonymized. See [Students' privacy](../privacy.md).",
    browser:
      "These are for what no other tool covers: a plugin, a rare setting, the inside of a SCORM package. The agent uses them on your site only, never types passwords, and says which task needed them. With `pseudonymize`, they never open pages about people (participants, grades, reports, forums, messages).",
    advanced: "These are off by default, for areas few people use: `MOODLE_MCP_ADVANCED=true` turns them on, and the other limits still apply. See [Limiting the agent](../limits.md#advanced-tools).",
  },
  es: {
    title: "Herramientas",
    intro: (n, d) =>
      `moodle-mcp tiene **${n} herramientas**, ${d} con el nivel de privacidad por defecto. Esta página se genera desde el propio servidor, así que las muestra tal y como las recibe tu aplicación de IA, con las descripciones que lee el agente, traducidas (el agente las recibe en inglés). Tú no llamas a las herramientas: pides las cosas con tus palabras y el agente las elige.\n\nEn las tablas, ✓ marca las herramientas que sigues teniendo con cada límite: **Solo lectura** con el [acceso de solo lectura](../limits.md#solo-lectura), **Profesor** y **Alumno** con cada [rol](../limits.md#tu-rol). El acceso de solo lectura deja fuera todas las herramientas que cambian algo en Moodle (una nota, un mensaje, una actividad, un intento); las de sesión, como iniciar sesión o mostrar el navegador, siempre están, igual que \`download_file\` y \`export_grades\`, que solo guardan un fichero en tu ordenador.`,
    area: "Herramienta",
    changes: "Solo lectura",
    teacher: "Profesor",
    student: "Alumno",
    inputs: "Parámetros",
    params: ["Parámetro", "Obligatorio", "Tipo", "Descripción"],
    types: { string: "texto", integer: "entero", number: "número", boolean: "sí o no", object: "objeto", array: "lista", item: "elemento", list: "lista de", or: "o" },
    none: "Sin parámetros.",
    required: "obligatorio",
    yes: "sí",
    clearOnly: "Solo con `MOODLE_MCP_STUDENT_DATA=clear`: lo que devuelve no se puede seudonimizar. Consulta [Privacidad del alumnado](../privacy.md).",
    browser:
      "Son para lo que no cubre ninguna otra herramienta: un plugin, un ajuste poco común, el interior de un paquete SCORM. El agente las usa solo en tu sitio, nunca escribe contraseñas y dice qué tarea las necesitó. Con `pseudonymize`, nunca abren páginas sobre personas (participantes, calificaciones, informes, foros, mensajes).",
    advanced: "Están desactivadas por defecto, por ser de áreas que usa poca gente: `MOODLE_MCP_ADVANCED=true` las activa, y los demás límites siguen aplicándose. Consulta [Limitar al agente](../limits.md#herramientas-avanzadas).",
  },
};

async function listTools(env = {}) {
  const client = new Client({ name: "tools-reference", version: "0" });
  // Advanced tools on (ADR-022): the reference lists every tool, and its area says they need the setting.
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER], env: { ...process.env, MOODLE_MCP_ADVANCED: "true", ...env }, stderr: "ignore" }));
  const { tools } = await client.listTools();
  await client.close();
  return tools;
}

// Listed with students' data in clear, which leaves none out; the tools the default level leaves out are marked.
const tools = await listTools({ MOODLE_MCP_STUDENT_DATA: "clear" });
const teacher = new Set((await listTools({ MOODLE_MCP_STUDENT_DATA: "clear", MOODLE_MCP_ROLE: "teacher" })).map((t) => t.name));
const student = new Set((await listTools({ MOODLE_MCP_STUDENT_DATA: "clear", MOODLE_MCP_ROLE: "student" })).map((t) => t.name));
const pseudonymized = new Set((await listTools()).map((t) => t.name));
// What read-only access keeps: the tools that change nothing in Moodle, and the session's own (logging in, showing the browser), which are always there.
const readOnly = new Set((await listTools({ MOODLE_MCP_STUDENT_DATA: "clear", MOODLE_MCP_ACCESS: "read" })).map((t) => t.name));

const listed = new Set(AREAS.flatMap((a) => a.tools));
const unlisted = tools.map((t) => t.name).filter((name) => !listed.has(name));
const gone = [...listed].filter((name) => !tools.some((t) => t.name === name));
if (unlisted.length || gone.length) {
  console.error(`Tools to place in an area of docs/scripts/tools-reference.mjs: ${unlisted.join(", ") || "none"}; listed but gone: ${gone.join(", ") || "none"}.`);
  process.exit(1);
}

// What a tool says in English: the part a translation stands for, and its hash.
const english = (tool) => ({ title: tool.title ?? "", description: tool.description ?? "", inputs: Object.fromEntries(Object.entries(tool.inputSchema?.properties ?? {}).map(([k, v]) => [k, v.description ?? ""])) });
const hash = (tool) => createHash("sha256").update(JSON.stringify(english(tool))).digest("hex").slice(0, 12);
if (process.argv[2] === "--english") {
  writeFileSync(process.argv[3], JSON.stringify(Object.fromEntries(tools.map((tool) => [tool.name, { source: hash(tool), ...english(tool) }])), null, 2) + "\n");
  console.log(`${process.argv[3]}: ${tools.length} tools`);
  process.exit(0);
}
const translations = existsSync(TRANSLATIONS) ? JSON.parse(readFileSync(TRANSLATIONS, "utf8")) : {};
const untranslated = [];
// A tool's texts in a language: Spanish from the translations when they're for this English.
function texts(tool, lang) {
  const en = english(tool);
  if (lang === "en") return en;
  const tr = translations[tool.name];
  if (tr?.source === hash(tool)) return { title: tr.title, description: tr.description, inputs: { ...en.inputs, ...tr.inputs } };
  untranslated.push(tool.name);
  return en;
}

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").replace(/[{}<>]/g, (c) => `&#${c.charCodeAt(0)};`);
const typeOf = (schema, words) => {
  const w = (word) => words[word] ?? word;
  if (!schema) return "";
  if (schema.enum) return schema.enum.map((v) => `\`${v}\``).join(", ");
  if (schema.type === "array") return words.list ? `${w("list")} ${typeOf(schema.items, words) || w("item")}` : `${typeOf(schema.items, words) || "item"} list`;
  if (schema.anyOf) return schema.anyOf.map((s) => typeOf(s, words)).filter(Boolean).join(` ${w("or")} `);
  return Array.isArray(schema.type) ? schema.type.map(w).join(` ${w("or")} `) : w(schema.type ?? "");
};

for (const [lang, t] of Object.entries(TEXT)) {
  const lines = [
    "---",
    `title: ${t.title}`,
    `sidebar_label: ${t.title}`,
    "---",
    "",
    `<!-- Generated by docs/scripts/tools-reference.mjs from the server's tools/list: don't edit by hand. -->`,
    "",
    `# ${t.title}`,
    "",
    t.intro(tools.length, pseudonymized.size),
    "",
  ];
  for (const area of AREAS) {
    lines.push(`## ${area[lang]} {#${area.id}}`, "");
    if (area.id === "browser") lines.push(t.browser, "");
    if (area.id === "advanced") lines.push(t.advanced, "");
    lines.push(`| ${t.area} | ${t.params[3]} | ${t.changes} | ${t.teacher} | ${t.student} |`, "| --- | --- | :-: | :-: | :-: |");
    for (const name of area.tools) {
      const tool = tools.find((x) => x.name === name);
      const { title } = texts(tool, lang);
      lines.push(`| [\`${name}\`](#${name.replace(/_/g, "-")}) | ${cell(title)} | ${readOnly.has(name) ? "✓" : ""} | ${teacher.has(name) ? "✓" : ""} | ${student.has(name) ? "✓" : ""} |`);
    }
    lines.push("");
    for (const name of area.tools) {
      const tool = tools.find((x) => x.name === name);
      const said = texts(tool, lang);
      lines.push(`### \`${name}\` {#${name.replace(/_/g, "-")}}`, "");
      if (said.title) lines.push(`**${cell(said.title)}**`, "");
      if (!pseudonymized.has(name)) lines.push(`:::note
${t.clearOnly}
:::`, "");
      lines.push(cell(said.description), "");
      const props = Object.entries(tool.inputSchema?.properties ?? {});
      if (props.length) {
        const required = new Set(tool.inputSchema.required ?? []);
        lines.push('<details className="tool-inputs">', `<summary>${t.inputs}</summary>`, "", `| ${t.params.join(" | ")} |`, "| --- | :-: | --- | --- |");
        for (const [key, schema] of props) {
          lines.push(`| \`${key}\` | ${required.has(key) ? "✅" : ""} | ${cell(typeOf(schema, t.types))} | ${cell(said.inputs[key])} |`);
        }
        lines.push("", "</details>", "");
      } else {
        lines.push(`*${t.none}*`, "");
      }
    }
  }
  mkdirSync(dirname(OUT[lang]), { recursive: true });
  writeFileSync(OUT[lang], lines.join("\n"));
  console.log(`${OUT[lang]}: ${tools.length} tools`);
}
// Twice the same tool when its title and its section are both in English: once is enough to say.
const stale = [...new Set(untranslated)];
if (stale.length) console.warn(`Shown in English in the Spanish reference, no translation for their current text in ${TRANSLATIONS}: ${stale.join(", ")}.`);
