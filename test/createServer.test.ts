import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserManager } from "../src/browser.js";
import { createServer } from "../src/createServer.js";

const browser: BrowserManager = {
  context: () => Promise.reject(new Error("server_info must not open the browser")),
  openChannel: () => undefined,
  saveSession: async () => undefined,
  close: async () => undefined,
};

async function connect() {
  const config = { moodleUrl: "https://user:secret@moodle.example.org/", profileDir: "/profiles/moodle", channel: undefined, headless: true, sources: { moodleUrl: "environment" as const, profileDir: "default" as const, channel: "default" as const, headless: "default" as const } };
  const server = createServer({ config, browser });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("createServer", () => {
  it("sends its instructions", async () => {
    const client = await connect();
    assert.match(client.getInstructions() ?? "", /never handles passwords/);
  });

  it("lists server_info as read-only", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "server_info");
    assert.ok(tool);
    assert.equal(tool.annotations?.readOnlyHint, true);
  });

  it("returns the configuration without credentials", async () => {
    const client = await connect();
    const result = await client.callTool({ name: "server_info", arguments: {} });
    const info = result.structuredContent as Record<string, unknown>;
    assert.equal(info.moodleUrl, "https://moodle.example.org/");
    assert.equal(info.channel, "auto");
    assert.equal(info.browserOpen, false);
    assert.doesNotMatch(JSON.stringify(result), /secret/);
  });
});
