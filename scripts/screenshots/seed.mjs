// In the container: the sandbox data the use cases start from, in course 3 (mcp-content) only.
//   node seed.mjs setup              once: the assignment due soon, the exam the agenda finds, and the
//                                    class glossary, whose entries wait for the teacher's approval, and
//                                    the review quiz the statistics session reads, done by four students
//                                    (profile-student and the seeded ones' profile-lucia, profile-marcos
//                                    and profile-sara, logged in as the sandbox-check skill does)
//   node seed.mjs reset <en|es>      before a language's teacher sessions: that language's quiz and page
//                                    deleted, Tarea MCP submitted again (so it needs grading), a new
//                                    unanswered question in Foro MCP, that language's lesson and
//                                    feedback deleted, and the student's glossary entries made again,
//                                    waiting for approval
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
    lesson: "Loops, step by step",
    feedback: "How was unit 1?",
    question: ["¿Qué hace range(1, 10, 2)?", "<p>En un ejemplo de clase aparece for i in range(1, 10, 2). Entiendo range(10), pero no sé qué hacen los otros dos números.</p>"],
  },
  es: {
    quiz: "Bucles: repaso rápido",
    page: "Cómo funciona un bucle for",
    lesson: "Bucles, paso a paso",
    feedback: "¿Qué tal la unidad 1?",
    question: ["¿Por qué mi bucle while no termina nunca?", "<p>He escrito un while que cuenta hasta 10, pero se queda colgado y nunca acaba. ¿Qué puede estar pasando?</p>"],
  },
};
const GLOSSARY = "Glosario de la clase";
// The student's entries: two right, one wrong (an infinite loop doesn't run once), for the teacher to check.
const ENTRIES = [
  ["Iteración", "<p>Cada una de las veces que se ejecuta el bloque de un bucle.</p>"],
  ["Bucle infinito", "<p>Un bucle que se ejecuta exactamente una vez y luego termina.</p>"],
  ["Contador", "<p>Una variable que aumenta en cada vuelta del bucle para llevar la cuenta.</p>"],
];
const REVIEW = "Repaso: bucles y funciones";
// Five questions; the third is flawed: while is a loop too, so the students who know most get it "wrong".
const REVIEW_GIFT = `::Fijo:: ¿Qué palabra empieza un bucle que se repite un número fijo de veces? {=for ~while ~if}

::Range:: ¿Qué imprime for i in range(2)\\: print(i)? {=0 y 1 ~1 y 2 ~0, 1 y 2}

::Bucle:: ¿Cuál de estos es un bucle en Python? {=for ~while ~def}

::Break:: ¿Qué hace break dentro de un bucle? {=Sale del bucle ~Salta a la siguiente vuelta ~Termina el programa}

::Return:: ¿Qué devuelve una función que no tiene return? {=None ~0 ~Una cadena vacía}`;
// Each student's answers, by question (found by these words in its text): the strongest miss the flawed
// one, the weakest get it right.
const REVIEW_QUESTIONS = ["número fijo", "range(2)", "es un bucle", "break", "return"];
const REVIEW_ANSWERS = {
  "profile-sara": ["for", "0 y 1", "while", "Sale del bucle", "None"],
  "profile-lucia": ["for", "0 y 1", "while", "Sale del bucle", "0"],
  "profile-student": ["for", "0 y 1", "for", "Salta a la siguiente vuelta", "0"],
  "profile-marcos": ["for", "1 y 2", "for", "Termina el programa", "Una cadena vacía"],
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
  if (!existing.some((a) => a.name === GLOSSARY)) {
    await t.call("create_activity", {
      courseId: COURSE,
      sectionId: firstSection.id,
      type: "glossary",
      name: GLOSSARY,
      visibility: "shown",
      description: "<p>Las palabras de la unidad, definidas por vosotros. Cada entrada espera a que el profesor la apruebe.</p>",
      settings: { defaultapproval: 0 },
    });
  }
  let review = existing.find((a) => a.name === REVIEW)?.id;
  review ??= (await t.call("create_activity", { courseId: COURSE, sectionId: firstSection.id, type: "quiz", name: REVIEW, visibility: "shown", description: "<p>Cinco preguntas para repasar la unidad.</p>" }))?.activityId;
  // Its questions go in its own bank, whose id is the quiz's.
  if (!(await t.call("get_quiz_structure", { quizId: review }))?.slots?.length) {
    const imported = await t.call("import_questions", { bankId: review, format: "gift", text: REVIEW_GIFT });
    // In the file's order: the import returns them in another one, their ids in the order made.
    await t.call("add_questions_to_quiz", { quizId: review, questionIds: imported.questions.map((q) => q.id).sort((a, b) => a - b) });
  }
  await t.close();
  // Each student's attempt, once: the statistics need finished attempts, and these stay.
  for (const [profile, answers] of Object.entries(REVIEW_ANSWERS)) {
    const st = await open(profile);
    if (!(await st.call("get_quiz_info", { quizId: review }))?.attempts?.some((a) => !a.inProgress)) {
      const attempt = await st.call("start_quiz_attempt", { quizId: review });
      const responses = attempt.questions.map((q) => {
        const field = q.fields[0];
        const answer = answers[REVIEW_QUESTIONS.findIndex((words) => q.text.includes(words))];
        const option = field.options.find((o) => o.label.trim() === answer);
        if (!option) throw new Error(`No option "${answer}" in: ${q.text}`);
        return { slot: q.slot, responses: { [field.name]: option.value } };
      });
      await st.call("answer_quiz_questions", { attemptId: attempt.attemptId, answers: responses });
      await st.call("finish_quiz_attempt", { attemptId: attempt.attemptId });
    }
    await st.close();
  }
} else if (command === "reset" && data) {
  const t = await open("profile-teacher");
  const all = await activities(t);
  for (const a of all) if ([data.quiz, data.page, data.lesson, data.feedback].includes(a.name)) await t.call("delete_activity", { courseId: COURSE, activityId: a.id });
  // The glossary starts empty each run: the student's entries come again, waiting.
  const glossary = all.find((a) => a.name === GLOSSARY);
  if (glossary) {
    for (const pending of [false, true]) {
      const entries = (await t.call("list_glossary_entries", { glossaryId: glossary.id, pending, limit: 100 }))?.entries ?? [];
      for (const e of entries) await t.call("delete_glossary_entry", { glossaryId: glossary.id, entryId: e.id });
    }
  }
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
  if (glossary) for (const [concept, definition] of ENTRIES) await s.call("add_glossary_entry", { glossaryId: glossary.id, concept, definition });
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
