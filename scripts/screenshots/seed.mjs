// In the container: the sandbox data the use cases start from, in course 3 (mcp-content) only.
//   node seed.mjs setup              once: the assignment due soon and the exam the agenda finds
//   node seed.mjs reset <en|es>      before a language's teacher sessions: that language's quiz and page
//                                    deleted, Tarea MCP submitted again (so it needs grading), a new
//                                    unanswered question in Foro MCP
//   node seed.mjs attempt <en|es>    after them: the quiz the teacher made shown, and done by the student
//                                    with one right answer and two wrong, for the quiz review
// reset also gives the copy-between-sites session its second site, "uni": a copy of the teacher's
// profile where the server keeps a second site's (CLAUDE_PLUGIN_DATA=/state/sites-data), and removes
// the copies of "Apuntes: bucles" an earlier run made.
import { cpSync, rmSync } from "node:fs";
import { open, unlock } from "./client.mjs";

const COURSE = 3;
const ASSIGNMENT = 35; // Tarea MCP
const FORUM = 37; // Foro MCP
const LANG = {
  en: {
    quiz: "Loops: quick check",
    page: "How a for loop works",
    question: ["¿Qué hace range(1, 10, 2)?", "<p>En un ejemplo de clase aparece for i in range(1, 10, 2). Entiendo range(10), pero no sé qué hacen los otros dos números.</p>"],
  },
  es: {
    quiz: "Bucles: repaso rápido",
    page: "Cómo funciona un bucle for",
    question: ["¿Por qué mi bucle while no termina nunca?", "<p>He escrito un while que cuenta hasta 10, pero se queda colgado y nunca acaba. ¿Qué puede estar pasando?</p>"],
  },
};
const SUBMISSION =
  "<p>Un bucle es una instrucción que repite un bloque de código mientras se cumple una condición. Por ejemplo, <code>for i in range(5)</code> repite el bloque cinco veces, y <code>while saldo &gt; 0</code> lo repite hasta que el saldo llega a cero.</p><p>Sirven para no escribir lo mismo muchas veces, por ejemplo para recorrer una lista de notas y calcular la media.</p>";

const [command, lang] = process.argv.slice(2);
const data = LANG[lang];
const activities = async (t) => (await t.call("get_course_structure", { courseId: COURSE }))?.sections.flatMap((s) => s.activities) ?? [];

if (command === "setup") {
  const t = await open("profile-teacher");
  const existing = await activities(t);
  const firstSection = (await t.call("get_course_structure", { courseId: COURSE })).sections[1];
  if (!existing.some((a) => a.name === "Práctica 2: funciones")) {
    const due = new Date(Date.now() + 8 * 86_400_000);
    await t.call("create_activity", {
      courseId: COURSE,
      sectionId: firstSection.id,
      type: "assign",
      name: "Práctica 2: funciones",
      visibility: "shown",
      description: "<p>Escribe tres funciones en Python: una que sume una lista, otra que devuelva el mayor y otra que cuente los pares. Sube un fichero <code>.py</code>.</p>",
      settings: { "duedate[enabled]": true, "duedate[day]": due.getDate(), "duedate[month]": due.getMonth() + 1, "duedate[year]": due.getFullYear(), "duedate[hour]": 23, "duedate[minute]": 55 },
    });
  }
  const events = await t.call("list_events", { courseId: COURSE });
  if (!events?.events?.some((e) => e.name.startsWith("Examen parcial"))) {
    const exam = new Date(Date.now() + 11 * 86_400_000);
    exam.setUTCHours(9, 0, 0, 0);
    await t.call("create_event", { courseId: COURSE, name: "Examen parcial: bucles y funciones", start: exam.toISOString(), durationMinutes: 60, description: "<p>En el aula 2.4. Entra todo lo visto hasta funciones.</p>" });
  }
  await t.close();
} else if (command === "reset" && data) {
  const t = await open("profile-teacher");
  const all = await activities(t);
  for (const a of all) if (a.name === data.quiz || a.name === data.page) await t.call("delete_activity", { courseId: COURSE, activityId: a.id });
  // The page copied between sites: the original is the oldest of that name, the others are copies.
  const notes = all.filter((a) => a.name === "Apuntes: bucles").sort((x, y) => x.id - y.id);
  for (const copy of notes.slice(1)) await t.call("delete_activity", { courseId: COURSE, activityId: copy.id });
  // An earlier run's question nobody answered would make two: one open question per run.
  const discussions = (await t.call("list_discussions", { forumId: FORUM, limit: 100 }))?.discussions ?? [];
  for (const d of discussions.filter((d) => d.subject === data.question[0] && d.replies === 0)) {
    const first = (await t.call("get_discussion", { discussionId: d.id }))?.posts?.[0];
    if (first) await t.call("delete_post", { postId: first.id });
  }
  await t.close();
  const s = await open("profile-student");
  if ((await s.call("get_assignment", { assignmentId: ASSIGNMENT }))?.canEdit) await s.call("save_submission", { assignmentId: ASSIGNMENT, onlineText: SUBMISSION });
  if ((await s.call("get_assignment", { assignmentId: ASSIGNMENT }))?.canSubmit) await s.call("submit_assignment", { assignmentId: ASSIGNMENT, acceptStatement: true });
  await s.call("create_discussion", { forumId: FORUM, subject: data.question[0], message: data.question[1] });
  await s.close();
  unlock("profile-teacher");
  rmSync("/state/sites-data", { recursive: true, force: true });
  cpSync("/state/profile-teacher", "/state/sites-data/sites/uni/profile", { recursive: true });
} else if (command === "attempt" && data) {
  const t = await open("profile-teacher");
  const quiz = (await activities(t)).find((a) => a.name === data.quiz);
  if (!quiz) throw new Error(`No quiz "${data.quiz}" in course ${COURSE}: run the quiz-from-questions session first.`);
  await t.call("update_activity", { activityId: quiz.id, visibility: "shown" });
  await t.close();
  const s = await open("profile-student");
  const attempt = await s.call("start_quiz_attempt", { quizId: quiz.id });
  // Slot 1 (range(3)): "2", wrong. Slot 2: break, right. Slot 3 (a while runs while true): False, wrong.
  const want = { 1: "2", 2: "break", 3: "False" };
  const answers = attempt.questions.map((q) => {
    const field = q.fields[0];
    const option = field.options.find((o) => o.label.trim() === want[q.slot]) ?? field.options[0];
    return { slot: q.slot, responses: { [field.name]: option.value } };
  });
  await s.call("answer_quiz_questions", { attemptId: attempt.attemptId, answers });
  await s.call("finish_quiz_attempt", { attemptId: attempt.attemptId });
  await s.close();
} else {
  console.error("Usage: node seed.mjs setup | reset <en|es> | attempt <en|es>");
  process.exit(2);
}
