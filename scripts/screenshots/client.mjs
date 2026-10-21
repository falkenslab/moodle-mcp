// In the container: an MCP client of the built server, as the sandbox's teacher or student, on a
// profile in the state folder (/state, see run.mjs). Prints each call's outcome in one line.
import { rmSync } from "node:fs";
import { Client } from "/work/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "/work/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";

export const SITE = "http://localhost:8080";

/** The server's command for a profile, as both this client and the AI clients start it. */
export function serverArgs(profile) {
  return ["/work/dist/server.mjs", "--url", SITE, "--profile-dir", `/state/${profile}`, "--channel", "chromium", "--trail", "fast"];
}

/** A browser killed with an earlier container leaves its profile locked to that container's host name. */
export function unlock(profile) {
  for (const f of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) rmSync(`/state/${profile}/${f}`, { force: true });
}

export async function open(profile) {
  unlock(profile);
  const client = new Client({ name: "screenshots", version: "0" });
  // The SDK's default environment drops PLAYWRIGHT_BROWSERS_PATH: the server would download Chromium.
  // This client can't ask anyone, and whoever runs these scripts chose what they delete: --confirm client
  // (the AI clients' sessions still ask, ADR-023).
  await client.connect(new StdioClientTransport({ command: "node", args: [...serverArgs(profile), "--confirm", "client"], env: { ...process.env, PSEUDONYM_HOME: "/state/pseudonym-home" }, stderr: "ignore" }));
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 240_000 }).catch((e) => ({ isError: true, content: [{ text: `client: ${e.message}` }] }));
    console.log(`${r.isError ? "✗" : "✓"} ${name} ${JSON.stringify(args).slice(0, 100)}${r.isError ? `: ${r.content[0].text.slice(0, 200)}` : ""}`);
    return r.isError ? undefined : r.structuredContent;
  };
  return { call, close: () => client.close() };
}
