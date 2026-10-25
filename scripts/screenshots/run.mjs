// Regenerates the documentation's screenshots against the Moodle sandbox, in Docker: each use case in
// the real Claude Code and Codex, in English then Spanish, and Moodle's pages with their results.
// Nothing opens on the desktop. See the site's developers/testing page.
//
//   MOODLE_MCP_SHOTS_STATE=<folder> node scripts/screenshots/run.mjs [--langs en,es] [--only id,…] [--moodle-only] [--setup]
//
// The state folder stays outside the repository: profile-teacher and profile-student (logged in to the
// sandbox, as the sandbox-check skill does), pseudonym-home, and the sessions' transcripts. The
// clients' credentials (~/.claude/.credentials.json, ~/.codex/auth.json) are copied into it for the
// run, read-only in the container, and deleted afterwards, whatever happens.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPO = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const STATE = process.env.MOODLE_MCP_SHOTS_STATE;
const { values } = parseArgs({ options: { langs: { type: "string", default: "en,es" }, only: { type: "string" }, "moodle-only": { type: "boolean" }, setup: { type: "boolean" } } });
if (!STATE || !existsSync(path.join(STATE, "profile-teacher")) || !existsSync(path.join(STATE, "profile-student"))) {
  console.error("Set MOODLE_MCP_SHOTS_STATE to a folder with profile-teacher and profile-student logged in to the sandbox.");
  process.exit(2);
}
const scenarios = JSON.parse(readFileSync(path.join(REPO, "scripts/screenshots/scenarios.json"), "utf8"));
const only = values.only?.split(",");
const pick = (profile) => Object.keys(scenarios).filter((id) => (scenarios[id].profile ?? "profile-teacher") === profile && (!only || only.includes(id)));

// A script of this folder in the test container, the state folder at /state.
function inDocker(script, ...args) {
  const result = spawnSync("node", ["scripts/in-docker.mjs", "node", `/work/scripts/screenshots/${script}`, ...args], { cwd: REPO, stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1", MOODLE_MCP_DOCKER_MOUNT: `${STATE}:/state` } });
  if (result.status !== 0) throw new Error(`${script} ${args.join(" ")} failed`);
}

// The sessions: Playwright's image with Claude Code, Codex and ttyd added (kept in a volume), the
// sandbox's network, and the diagram the page use case uploads where its prompt says it is.
function sessions(pairs) {
  if (pairs.length === 0) return;
  const script = [
    "set -e",
    "export PATH=/tools/bin:$PATH NPM_CONFIG_PREFIX=/tools",
    "command -v claude >/dev/null || npm i -g --no-audit --no-fund @anthropic-ai/claude-code @openai/codex >/dev/null",
    "[ -x /tools/bin/ttyd ] || node -e \"fetch('https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64').then(r=>r.arrayBuffer()).then(b=>require('fs').writeFileSync('/tools/bin/ttyd',Buffer.from(b),{mode:0o755}))\"",
    "node scripts/docker-proxy.mjs 8080 webserver:80 & sleep 0.5",
    `node scripts/screenshots/tui.mjs ${pairs.join(" ")}`,
  ].join("\n");
  const args = ["run", "--rm", "--init", "-v", `${REPO}:/work`, "-v", "moodle-mcp-node-modules:/work/node_modules", "-v", "moodle-mcp-shots-tools:/tools", "-v", `${STATE}:/state`];
  args.push("-v", `${path.join(REPO, "scripts/screenshots/files")}:/home/teacher/Pictures:ro`, "-w", "/work", "-e", "DISPLAY=", "-e", "WAYLAND_DISPLAY=", "--network", "moodle-sandbox_default");
  args.push("mcr.microsoft.com/playwright:v1.64.1-noble", "bash", "-c", script);
  const result = spawnSync("docker", args, { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  if (result.status !== 0) throw new Error("the sessions' container failed");
}

const creds = path.join(STATE, ".creds");
try {
  if (values.setup) inDocker("seed.mjs", "setup");
  if (!values["moodle-only"]) {
    mkdirSync(creds, { recursive: true });
    copyFileSync(path.join(homedir(), ".claude", ".credentials.json"), path.join(creds, "claude-credentials.json"));
    copyFileSync(path.join(process.env.CODEX_HOME ?? path.join(homedir(), ".codex"), "auth.json"), path.join(creds, "codex-auth.json"));
    for (const lang of values.langs.split(",")) {
      // The teacher's sessions start from a known state; reset deletes that language's quiz and page.
      const teacher = pick("profile-teacher");
      if (teacher.length) inDocker("seed.mjs", "reset", lang);
      sessions(teacher.flatMap((id) => [id, lang]));
      // The quiz review needs an attempt at the quiz the teacher's session made.
      if (teacher.includes("quiz-from-questions") && (!only || only.includes("quiz-review"))) inDocker("seed.mjs", "attempt", lang);
      sessions(pick("profile-student").flatMap((id) => [id, lang]));
    }
  }
  inDocker("moodle.mjs");
} finally {
  rmSync(creds, { recursive: true, force: true });
}
