// The tools and their tokens for each row of the limits page: starts the built server (dist/server.mjs)
// with each row's settings, lists its tools, and counts what their descriptions take with Anthropic's
// token counting endpoint when ANTHROPIC_API_KEY is set (never stored; without it, only the tools).
//   npm run build && node scripts/tool-tokens.mjs [--model claude-opus-5-5]
// tools/list opens no browser, so this runs on the host.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROWS = [
  ["all", {}],
  ["teacher", { MOODLE_MCP_ROLE: "teacher" }],
  ["student", { MOODLE_MCP_ROLE: "student" }],
  ["all, read only", { MOODLE_MCP_ACCESS: "read" }],
  ["teacher, read only", { MOODLE_MCP_ROLE: "teacher", MOODLE_MCP_ACCESS: "read" }],
  ["student, read only", { MOODLE_MCP_ROLE: "student", MOODLE_MCP_ACCESS: "read" }],
  ["teacher, content scope", { MOODLE_MCP_ROLE: "teacher", MOODLE_MCP_SCOPES: "content" }],
  ["all, advanced", { MOODLE_MCP_ADVANCED: "true" }],
];
const model = process.argv.includes("--model") ? process.argv[process.argv.indexOf("--model") + 1] : "claude-opus-5-5";
const key = process.env.ANTHROPIC_API_KEY;

async function listTools(settings) {
  const env = { ...process.env, MOODLE_URL: "https://campus.example.org", ...settings };
  const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/server.mjs"], env, stderr: "ignore" });
  const client = new Client({ name: "tool-tokens", version: "0.0.0" });
  await client.connect(transport);
  try {
    return (await client.listTools()).tools;
  } finally {
    await client.close();
  }
}

// What a request with these tools counts, as a model would be sent them.
async function countTokens(tools) {
  const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Hi" }],
      ...(tools.length && { tools: tools.map((t) => ({ name: t.name, description: t.description ?? "", input_schema: t.inputSchema })) }),
    }),
  });
  if (!response.ok) throw new Error(`count_tokens: ${response.status} ${await response.text()}`);
  return (await response.json()).input_tokens;
}

const base = key ? await countTokens([]) : 0;
console.log(key ? `Tokens of the tools' descriptions, for ${model}:` : "ANTHROPIC_API_KEY isn't set: tools only.");
for (const [name, settings] of ROWS) {
  const tools = await listTools(settings);
  const tokens = key ? `${((await countTokens(tools)) - base).toLocaleString("en")} tokens` : "";
  console.log(`${name.padEnd(24)} ${String(tools.length).padStart(4)} tools  ${tokens}`);
}
