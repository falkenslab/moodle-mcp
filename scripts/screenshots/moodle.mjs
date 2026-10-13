// In the container: the use cases' results as Moodle shows them, photographed with the sandbox's
// teacher and student sessions, into docs/static/img/moodle/<name>.png. The activities, discussion and
// attempt are found by name, as the English sessions left them (the Spanish pages show the same images).
//   node moodle.mjs [name …]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "/work/node_modules/playwright-core/index.mjs";
import { SITE, open } from "./client.mjs";

const OUT = "/work/docs/static/img/moodle";
mkdirSync(OUT, { recursive: true });
const wanted = new Set(process.argv.slice(2));

// The ids the pages need, looked up through moodle-mcp itself (get_quiz_info lists attempts newest first).
const t = await open("profile-teacher");
const activities = (await t.call("get_course_structure", { courseId: 3 })).sections.flatMap((s) => s.activities);
const byName = (name) => activities.find((a) => a.name === name)?.id;
const quiz = byName("Loops: quick check");
const page = byName("How a for loop works");
const notes = byName("Apuntes: bucles");
const scorm = byName("SCORM MCP (prueba)");
await t.close();
const s = await open("profile-student");
const attempt = quiz ? (await s.call("get_quiz_info", { quizId: quiz }))?.attempts?.[0]?.id : undefined;
await s.close();

const SHOTS = {
  teacher: {
    grading: `${SITE}/mod/assign/view.php?id=35&action=grader`,
    "quiz-edit": `${SITE}/mod/quiz/edit.php?cmid=${quiz}`,
    "forum-reply": `${SITE}/mod/forum/view.php?id=37`,
    "page-with-image": `${SITE}/mod/page/view.php?id=${page}`,
  },
  student: {
    // The conversation with the teacher (user 3), open: the reminder the falling-behind session sent.
    messages: `${SITE}/message/index.php?id=3`,
    upcoming: `${SITE}/calendar/view.php?view=upcoming&course=1`,
    "study-page": `${SITE}/mod/page/view.php?id=${notes}`,
    scorm: `${SITE}/mod/scorm/view.php?id=${scorm}`,
    "quiz-review": `${SITE}/mod/quiz/review.php?attempt=${attempt}`,
  },
};
const FULL_PAGE = ["page-with-image", "quiz-review", "study-page", "upcoming"];

async function shoot(tab, name, url) {
  if (wanted.size && !wanted.has(name)) return;
  if (url.includes("undefined")) return console.log(`${name}: skipped, its activity or attempt isn't there`);
  await tab.goto(url, { waitUntil: "networkidle" }).catch(() => undefined);
  await tab.waitForTimeout(name === "grading" ? 4000 : name === "messages" ? 2500 : 800);
  // The forum's newest discussion is the question the English session answered.
  if (name === "forum-reply") {
    await tab.getByRole("link", { name: "¿Qué hace range(1, 10, 2)?" }).first().click();
    await tab.waitForLoadState("networkidle");
  }
  // The grader without its preview panel: the rubric gets the width.
  if (name === "grading") {
    await tab.locator("button.collapse-review-panel").click().catch(() => undefined);
    await tab.waitForTimeout(1500);
  }
  await tab.screenshot({ path: `${OUT}/${name}.png`, fullPage: FULL_PAGE.includes(name) });
  console.log(name, tab.url());
}

for (const [who, shots] of Object.entries(SHOTS)) {
  // The driver keeps the session cookie in the profile's moodle-session.json.
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 });
  await context.addCookies(JSON.parse(readFileSync(`/state/profile-${who}/moodle-session.json`, "utf8")));
  const tab = await context.newPage();
  // One page that fails says so and leaves the others to go on.
  for (const [name, url] of Object.entries(shots)) await shoot(tab, name, url).catch((e) => console.log(`${name}: failed, ${e.message.split("\n")[0]}`));
  await browser.close();
}
const browser = await chromium.launch();
await shoot(await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 }), "login", `${SITE}/login/index.php`);
await browser.close();
