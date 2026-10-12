// Writes the tools reference (content/reference/tools.md, and its Spanish copy) from the server's own
// tools/list, so it can't drift from the code. Needs the built server (npm run build at the root).
//   node scripts/tools-reference.mjs
// Every tool belongs to one area below; a tool missing from them fails the script, so a new tool
// can't go unlisted.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "../../node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";

const SERVER = fileURLToPath(new URL("../../dist/server.mjs", import.meta.url));
const OUT = {
  en: fileURLToPath(new URL("../content/reference/tools.md", import.meta.url)),
  es: fileURLToPath(new URL("../i18n/es/docusaurus-plugin-content-docs/current/reference/tools.md", import.meta.url)),
};

const AREAS = [
  { id: "session", en: "Session", es: "Sesión", tools: ["login", "logout", "get_me", "get_site_info", "configure", "show_browser", "server_info"] },
  { id: "content", en: "Courses and content", es: "Cursos y contenido", tools: ["list_courses", "get_course_structure", "get_activity_content", "get_activity_settings", "download_file", "create_activity", "update_activity", "edit_activity", "duplicate_activity", "delete_activity", "add_section", "edit_section", "delete_section", "update_course"] },
  { id: "lifecycle", en: "Course life cycle", es: "Ciclo de vida del curso", tools: ["copy_course", "backup_course", "restore_course", "import_activities", "reset_course"] },
  { id: "grading", en: "Assignments and grading", es: "Tareas y calificación", tools: ["list_assignments", "get_submissions", "get_rubric", "grade_submission", "grant_extension", "set_workflow_state", "allocate_marker"] },
  { id: "quizzes", en: "Quizzes and questions", es: "Cuestionarios y preguntas", tools: ["list_question_banks", "list_questions", "import_questions", "create_question", "update_question", "delete_questions", "set_question_status", "get_quiz_structure", "add_questions_to_quiz", "edit_quiz_slot", "remove_quiz_slot", "set_quiz_pages", "add_quiz_section", "get_quiz_results", "set_quiz_override", "list_questions_to_grade", "grade_quiz_question"] },
  { id: "gradebook", en: "Gradebook and progress", es: "Calificador y progreso", tools: ["get_grader_report", "set_grade", "export_grades", "get_gradebook_setup", "add_grade_item", "update_grade_item", "delete_grade_item", "add_grade_category", "update_grade_category", "delete_grade_category", "get_completion_report", "override_completion"] },
  { id: "reports", en: "Reports", es: "Informes", tools: ["get_activity_report", "get_participation_report", "get_course_logs"] },
  { id: "participants", en: "Participants and groups", es: "Participantes y grupos", tools: ["list_participants", "list_potential_users", "enrol_users", "unenrol_user", "set_user_roles", "list_enrolment_methods", "set_enrolment_method", "list_groups", "create_group", "update_group", "delete_group", "set_group_members", "list_groupings", "create_grouping", "delete_grouping", "set_grouping_groups"] },
  { id: "communication", en: "Forums, workshops and messages", es: "Foros, talleres y mensajes", tools: ["list_discussions", "get_discussion", "reply_to_post", "create_discussion", "edit_post", "delete_post", "set_discussion_state", "set_discussion_subscription", "get_forum_grades", "grade_forum_user", "rate", "get_workshop", "set_workshop_phase", "assess_workshop_submission", "list_notifications", "mark_notifications_read", "list_conversations", "get_conversation", "send_message", "message_participants"] },
  { id: "calendar", en: "Calendar and to-dos", es: "Calendario y pendientes", tools: ["list_events", "get_event", "create_event", "update_event", "delete_event", "list_deadlines", "list_pending", "get_activities_overview", "get_course_updates"] },
  { id: "student", en: "As a student", es: "Como alumno", tools: ["get_my_grades", "get_assignment", "save_submission", "submit_assignment", "get_quiz_info", "start_quiz_attempt", "get_quiz_attempt", "answer_quiz_questions", "finish_quiz_attempt", "get_attempt_review", "get_survey", "submit_survey", "get_choice", "answer_choice", "get_lesson_page", "answer_lesson_page", "get_h5p_activity", "get_scorm", "open_scorm", "set_completion"] },
  { id: "browser", en: "Browser", es: "Navegador", tools: ["browser_navigate", "browser_snapshot", "browser_click", "browser_type", "browser_select", "browser_upload", "browser_screenshot", "browser_wait"] },
];

const TEXT = {
  en: {
    title: "Tools",
    intro: (n, d) =>
      `moodle-mcp has **${n} tools**, ${d} at the default privacy level. This page is generated from the server itself, so it lists them exactly as your AI app gets them, with the descriptions the agent reads. You don't call tools yourself: you ask in your own words, and the agent picks them.\n\nIn the tables, ✓ marks the tools you still get with each limit: **Read only** with [read-only access](../limits.md#read-only), **Teacher** and **Student** with each [role](../limits.md#your-role). Read-only access leaves out every tool that changes something in Moodle (a grade, a post, an activity, an attempt) or saves a file on your computer (\`download_file\`, \`export_grades\`); session tools, such as logging in or showing the browser, are always there.`,
    area: "Tool",
    changes: "Read only",
    teacher: "Teacher",
    student: "Student",
    inputs: "Inputs",
    none: "No inputs.",
    required: "required",
    yes: "yes",
    clearOnly: "Only with `MOODLE_MCP_STUDENT_DATA=clear`: what it returns can't be pseudonymized. See [Students' privacy](../privacy.md).",
    browser:
      "These are for what no other tool covers: a plugin, a rare setting, the inside of a SCORM package. The agent uses them on your site only, never types passwords, and says which task needed them. With `pseudonymize`, they never open pages about people (participants, grades, reports, forums, messages).",
  },
  es: {
    title: "Herramientas",
    intro: (n, d) =>
      `moodle-mcp tiene **${n} herramientas**, ${d} con el nivel de privacidad por defecto. Esta página se genera desde el propio servidor, así que las muestra tal y como las recibe tu aplicación de IA, con las descripciones que lee el agente (en inglés). Tú no llamas a las herramientas: pides las cosas con tus palabras y el agente las elige.\n\nEn las tablas, ✓ marca las herramientas que sigues teniendo con cada límite: **Solo lectura** con el [acceso de solo lectura](../limits.md#solo-lectura), **Profesor** y **Alumno** con cada [rol](../limits.md#tu-rol). El acceso de solo lectura deja fuera todas las herramientas que cambian algo en Moodle (una nota, un mensaje, una actividad, un intento) o guardan un fichero en tu ordenador (\`download_file\`, \`export_grades\`); las de sesión, como iniciar sesión o mostrar el navegador, siempre están.`,
    area: "Herramienta",
    changes: "Solo lectura",
    teacher: "Profesor",
    student: "Alumno",
    inputs: "Parámetros",
    none: "Sin parámetros.",
    required: "obligatorio",
    yes: "sí",
    clearOnly: "Solo con `MOODLE_MCP_STUDENT_DATA=clear`: lo que devuelve no se puede seudonimizar. Consulta [Privacidad del alumnado](../privacy.md).",
    browser:
      "Son para lo que no cubre ninguna otra herramienta: un plugin, un ajuste poco común, el interior de un paquete SCORM. El agente las usa solo en tu sitio, nunca escribe contraseñas y dice qué tarea las necesitó. Con `pseudonymize`, nunca abren páginas sobre personas (participantes, calificaciones, informes, foros, mensajes).",
  },
};

async function listTools(env = {}) {
  const client = new Client({ name: "tools-reference", version: "0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER], env: { ...process.env, ...env }, stderr: "ignore" }));
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

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").replace(/[{}<>]/g, (c) => `&#${c.charCodeAt(0)};`);
const typeOf = (schema) => {
  if (!schema) return "";
  if (schema.enum) return schema.enum.map((v) => `\`${v}\``).join(", ");
  if (schema.type === "array") return `${typeOf(schema.items) || "item"} list`;
  if (schema.anyOf) return schema.anyOf.map(typeOf).filter(Boolean).join(" or ");
  return Array.isArray(schema.type) ? schema.type.join(" or ") : (schema.type ?? "");
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
    lines.push(`| ${t.area} | ${t.changes} | ${t.teacher} | ${t.student} |`, "| --- | :-: | :-: | :-: |");
    for (const name of area.tools) {
      const tool = tools.find((x) => x.name === name);
      lines.push(`| [\`${name}\`](#${name.replace(/_/g, "-")}) ${cell(tool.title ? `· ${tool.title}` : "")} | ${readOnly.has(name) ? "✓" : ""} | ${teacher.has(name) ? "✓" : ""} | ${student.has(name) ? "✓" : ""} |`);
    }
    lines.push("");
    for (const name of area.tools) {
      const tool = tools.find((x) => x.name === name);
      lines.push(`### \`${name}\` {#${name.replace(/_/g, "-")}}`, "");
      if (tool.title) lines.push(`**${cell(tool.title)}**`, "");
      if (!pseudonymized.has(name)) lines.push(`:::note
${t.clearOnly}
:::`, "");
      lines.push(cell(tool.description), "");
      const props = Object.entries(tool.inputSchema?.properties ?? {});
      if (props.length) {
        const required = new Set(tool.inputSchema.required ?? []);
        lines.push("<details>", `<summary>${t.inputs}</summary>`, "", `| | | |`, "| --- | --- | --- |");
        for (const [key, schema] of props) {
          lines.push(`| \`${key}\`${required.has(key) ? ` (${t.required})` : ""} | ${cell(typeOf(schema))} | ${cell(schema.description)} |`);
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
