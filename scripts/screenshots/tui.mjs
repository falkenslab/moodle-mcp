/* global window, document */
// In the container (run.mjs starts it): runs use cases in the real Claude Code or Codex interface, in a
// web terminal (ttyd), typing each turn as a person would and waiting for the answer, and photographs
// the terminal into docs/static/img/sessions/<id>.<lang>.png. The clients' credentials are temporary
// read-only copies in /state/.creds; what each session showed is kept in /state/transcripts.
//   node tui.mjs <scenario> <en|es> [<scenario> <en|es> …]
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "/work/node_modules/playwright-core/index.mjs";
import { serverArgs, unlock } from "./client.mjs";

const scenarios = JSON.parse(readFileSync(new URL("./scenarios.json", import.meta.url), "utf8"));
const OUT = "/work/docs/static/img/sessions";
const RUN = "/tmp/run";
const HOME = "/tmp/home";
const BACKGROUND = "#16181d";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The moodle-mcp server as an MCP client starts it: the scenario's profile and extra settings.
function server(scenario) {
  const env = { MOODLE_MCP_HEADLESS: "true", PSEUDONYM_HOME: "/state/pseudonym-home", DISPLAY: "", PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright" };
  for (const pair of scenario.env ?? []) {
    const [key, ...value] = pair.split("=");
    env[key] = value.join("=");
  }
  return { command: "node", args: serverArgs(scenario.profile ?? "profile-teacher"), env };
}

// A fresh home for the client, already past its first-run questions, replying in the session's language.
function setUp(scenario, lang) {
  unlock("profile-teacher");
  unlock("profile-student");
  for (const dir of [HOME, RUN]) rmSync(dir, { recursive: true, force: true });
  for (const dir of [`${HOME}/.claude`, `${HOME}/.codex`, RUN]) mkdirSync(dir, { recursive: true });
  const moodle = server(scenario);
  if (scenario.client === "claude") {
    copyFileSync("/state/.creds/claude-credentials.json", `${HOME}/.claude/.credentials.json`);
    writeFileSync(`${HOME}/.claude.json`, JSON.stringify({ hasCompletedOnboarding: true, theme: "dark", numStartups: 10, projects: { [RUN]: { hasTrustDialogAccepted: true, hasCompletedProjectOnboarding: true } } }));
    writeFileSync(`${RUN}/moodle.mcp.json`, JSON.stringify({ mcpServers: { moodle } }));
    const language = { en: "Reply in English.", es: "Responde en español." }[lang];
    return ["claude", "--mcp-config", `${RUN}/moodle.mcp.json`, "--strict-mcp-config", "--allowedTools", "mcp__moodle", "--tools", "", "--append-system-prompt", language];
  }
  copyFileSync("/state/.creds/codex-auth.json", `${HOME}/.codex/auth.json`);
  const language = { en: "Always reply in English.", es: "Responde siempre en español." }[lang];
  const toml = (v) => JSON.stringify(v);
  writeFileSync(
    `${HOME}/.codex/config.toml`,
    [
      'model = "gpt-6-sol"',
      'model_reasoning_effort = "medium"',
      'approval_policy = "never"',
      'sandbox_mode = "read-only"',
      `developer_instructions = ${toml(language)}`,
      "",
      `[projects.${toml(RUN)}]`,
      'trust_level = "trusted"',
      "",
      "[mcp_servers.moodle]",
      `command = ${toml(moodle.command)}`,
      `args = [${moodle.args.map(toml).join(", ")}]`,
      "startup_timeout_sec = 120",
      "tool_timeout_sec = 600",
      'default_tools_approval_mode = "approve"',
      `env = { ${Object.entries(moodle.env)
        .map(([k, v]) => `${k} = ${toml(v)}`)
        .join(", ")} }`,
      "",
    ].join("\n"),
  );
  return ["codex"];
}

async function screenText(page) {
  return page.evaluate(() => {
    const b = window.term.buffer.active;
    const lines = [];
    for (let i = 0; i < b.length; i++) lines.push(b.getLine(i)?.translateToString(true) ?? "");
    return lines.join("\n");
  });
}

// Settled: the screen hasn't changed for a while and nothing on it says the client is still working.
async function settle(page, { quiet = 8000, timeout = 900_000 } = {}) {
  const start = Date.now();
  let last = "";
  let since = Date.now();
  while (Date.now() - start < timeout) {
    await sleep(1000);
    const text = await screenText(page);
    if (text !== last) {
      last = text;
      since = Date.now();
    } else if (Date.now() - since >= quiet && !/esc to interrupt/i.test(text)) return text;
  }
  return last;
}

const pairs = process.argv.slice(2);
mkdirSync("/state/transcripts", { recursive: true });
for (let i = 0; i < pairs.length; i += 2) {
  const [id, lang] = [pairs[i], pairs[i + 1]];
  const scenario = scenarios[id];
  const command = setUp(scenario, lang);
  // The DOM renderer: WebGL doesn't paint a terminal this tall, and the DOM keeps the text measurable.
  const ttyd = spawn(
    "/tools/bin/ttyd",
    ["-p", "7681", "-W", "-o", "-t", "fontSize=15", "-t", "fontFamily=Liberation Mono", "-t", "rendererType=dom", "-t", `theme={"background":"${BACKGROUND}"}`, "-t", "disableLeaveAlert=true", "-t", "disableResizeOverlay=true", ...command],
    { cwd: RUN, detached: true, env: { ...process.env, HOME, CODEX_HOME: `${HOME}/.codex`, TERM: "xterm-256color", COLORTERM: "truecolor", LANG: "C.UTF-8" }, stdio: "ignore" },
  );
  await sleep(1500);
  const browser = await chromium.launch();
  // Tall enough for a whole session: the clients draw at the bottom and push older lines up.
  const page = await browser.newPage({ viewport: { width: 1180, height: 4200 }, deviceScaleFactor: 1.5 });
  await page.goto("http://localhost:7681");
  await page.waitForFunction(() => window.term);
  await settle(page, { quiet: 6000 });
  // A notice about a newer model, if Codex shows one: keep the configured model.
  if (/Use existing model/.test(await screenText(page))) {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await settle(page, { quiet: 4000 });
  }
  for (const turn of scenario.turns[lang]) {
    await page.evaluate((text) => {
      window.term.focus();
      window.term.paste(text);
    }, turn);
    await sleep(3000);
    // Sent once the client says it's working: a paste still being taken in can swallow the first Enter.
    for (let tries = 0; tries < 4; tries++) {
      await page.keyboard.press("Enter");
      let working = false;
      for (let s = 0; s < 10 && !working; s++) {
        await sleep(1000);
        working = /esc to interrupt/i.test(await screenText(page));
      }
      if (working) break;
    }
    await settle(page);
    console.log(`${id}.${lang}: turn done`);
  }
  // The blank rows between the conversation and the input box at the bottom are hidden, all but two.
  const scrolled = await page.evaluate(() => {
    const b = window.term.buffer.active;
    const blank = [];
    for (let r = 0; r < window.term.rows; r++) blank.push(!(b.getLine(b.viewportY + r)?.translateToString(true) ?? "").trim());
    let widest = [0, 0];
    for (let r = 0; r < blank.length; ) {
      if (!blank[r]) {
        r++;
        continue;
      }
      let end = r;
      while (end < blank.length && blank[end]) end++;
      if (end - r > widest[1] - widest[0]) widest = [r, end];
      r = end;
    }
    const rows = [...document.querySelectorAll(".xterm-rows > div")];
    for (let r = widest[0] + 2; r < widest[1]; r++) if (rows[r]) rows[r].style.display = "none";
    document.querySelector(".xterm-screen").style.height = "auto";
    document.querySelector(".xterm-rows").style.position = "static";
    return b.viewportY;
  });
  if (scrolled) console.log(`${id}.${lang}: ${scrolled} lines scrolled out of view`);
  await page.locator(".xterm-screen").screenshot({ path: `${OUT}/${id}.${lang}.png` });
  writeFileSync(`/state/transcripts/${id}.${lang}.txt`, await screenText(page));
  console.log(`${id}.${lang}: saved`);
  await browser.close();
  // The client, its moodle-mcp server and Codex's background daemon all go before the next session.
  try {
    process.kill(-ttyd.pid, "SIGTERM");
  } catch {
    // Already gone.
  }
  spawn("pkill", ["-f", "/work/dist/server.mjs|app-server"]);
  await sleep(1000);
  for (const dir of readdirSync("/tmp")) if (dir.startsWith("codex-daemon")) rmSync(`/tmp/${dir}`, { recursive: true, force: true });
  await sleep(4000);
}
rmSync(HOME, { recursive: true, force: true });
