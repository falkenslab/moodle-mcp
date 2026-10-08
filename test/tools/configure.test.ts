import assert from "node:assert/strict";
import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserManager } from "../../src/browser.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { moodlePage } from "../helpers/fakeMoodle.js";

// A site that answers like Moodle under /moodle, and like something else elsewhere.
let site: Server;
let origin: string;
before(async () => {
  site = createHttpServer((request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(request.url?.startsWith("/moodle") ? moodlePage({ userId: 0, wwwroot: `${origin}/moodle` }) : "<html>Not Moodle</html>");
  });
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(site.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((resolve) => site.close(() => resolve())));

async function connect(config: Config) {
  let closes = 0;
  const browser: BrowserManager = {
    context: () => Promise.reject(new Error("no browser in these tests")),
    openChannel: () => undefined,
    saveSession: async () => undefined,
    close: async () => void closes++,
  };
  const server = createServer({ config, browser });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, closes: () => closes };
}

function unconfigured(): Config {
  return { moodleUrl: undefined, profileDir: path.resolve("/profiles/a"), channel: undefined, headless: true, sources: { profileDir: "default", channel: "default", headless: "default" } };
}

describe("configure", () => {
  it("is needed before any tool that uses the site", async () => {
    const { client } = await connect(unconfigured());
    for (const name of ["login", "list_courses"]) {
      const result = await client.callTool({ name, arguments: {} });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result.content), /call configure/i);
    }
  });

  it("sets the site from any of its pages, in memory", async () => {
    const config = unconfigured();
    const { client, closes } = await connect(config);
    const result = await client.callTool({ name: "configure", arguments: { url: `${origin}/moodle/course/view.php?id=4` } });
    const info = result.structuredContent as { moodleUrl: string; sources: Record<string, string> };
    assert.equal(info.moodleUrl, `${origin}/moodle/`);
    assert.equal(info.sources.moodleUrl, "configure");
    assert.equal(config.moodleUrl, `${origin}/moodle/`);
    assert.equal(closes(), 0);
  });

  it("refuses a site that isn't Moodle and keeps the previous configuration", async () => {
    const config = { ...unconfigured(), moodleUrl: "http://localhost:8080/" };
    const { client } = await connect(config);
    const result = await client.callTool({ name: "configure", arguments: { url: `${origin}/other`, headless: false } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /doesn't look like a Moodle/);
    assert.equal(config.moodleUrl, "http://localhost:8080/");
    assert.equal(config.headless, true);
  });

  it("closes the browser only when the profile or the mode changes", async () => {
    const config = unconfigured();
    const { client, closes } = await connect(config);
    await client.callTool({ name: "configure", arguments: { headless: true, profileDir: "/profiles/a" } });
    assert.equal(closes(), 0);
    await client.callTool({ name: "configure", arguments: { headless: false } });
    assert.equal(closes(), 1);
    await client.callTool({ name: "configure", arguments: { profileDir: "/profiles/b" } });
    assert.equal(closes(), 2);
    assert.equal(config.headless, false);
    assert.match(config.profileDir, /profiles[\\/]b$/);
    assert.equal(config.sources.profileDir, "configure");
  });

  it("refuses a profile inside the server's folder", async () => {
    const { client } = await connect(unconfigured());
    const result = await client.callTool({ name: "configure", arguments: { profileDir: "./profile" } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /server's folder/);
  });
});
