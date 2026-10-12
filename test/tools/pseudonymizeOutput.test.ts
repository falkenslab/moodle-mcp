import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { remember } from "@falkenslab/pseudonym";
import { z } from "zod";
import type { Config } from "../../src/config.js";
import { serviceOf } from "../../src/people.js";
import { pseudonymizeTools } from "../../src/tools/pseudonymizeOutput.js";
import { reply } from "../../src/tools/reply.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

// Never the person's real key and directory.
const home = mkdtempSync(path.join(tmpdir(), "pseudonym-net-"));
process.env.PSEUDONYM_HOME = home;
after(() => rmSync(home, { recursive: true, force: true }));

const SITE = "http://moodle.test/";
const ada = await remember({ service: serviceOf(SITE), identifiers: { serviceUserId: "7" }, displayName: "Ada Lovelace" });

/** A server with the net and three made-up tools: one that lets names slip, one that fails naming a user, and get_me. */
async function connect(config: Config): Promise<Client> {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  pseudonymizeTools(server, { config, browser: fakeBrowserManager() });
  server.registerTool(
    "leaky",
    { outputSchema: { changed: z.string(), group: z.object({ name: z.string(), notes: z.array(z.string()), link: z.string() }) } },
    async () =>
      reply({
        changed: "Added users 7, 8 to group 3.",
        group: { name: "Ada Lovelace's team", notes: ["Write to ada@example.org", "Ada Lovelace said hi"], link: `${SITE}user/view.php?id=7&course=3` },
      }),
  );
  server.registerTool("failing", {}, async () => {
    throw new Error("Moodle didn't send the message to user 7: Ada Lovelace has blocked you");
  });
  server.registerTool("get_me", { outputSchema: { fullName: z.string(), email: z.string() } }, async () => reply({ fullName: "Teacher Smith", email: "teacher@example.org" }));
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("the pseudonymization net", () => {
  it("redacts every string of every tool's output, and its JSON text with it", async () => {
    const client = await connect(testConfig({ moodleUrl: SITE, studentData: "pseudonymize" }));
    const result = await client.callTool({ name: "leaky", arguments: {} });
    const out = result.structuredContent as { changed: string; group: { name: string; notes: string[]; link: string } };
    assert.equal(out.changed, "Added users [user] to group 3.");
    assert.equal(out.group.name, `${ada}'s team`);
    assert.deepEqual(out.group.notes, ["Write to [EMAIL_1]", `${ada} said hi`]);
    // A link loses the user id and keeps working as a link.
    assert.equal(out.group.link, `${SITE}user/view.php?id=[user]&course=3`);
    const text = JSON.stringify(result.content);
    assert.doesNotMatch(text, /Lovelace|ada@example|id=7|users 7/);
  });

  it("redacts errors, and leaves the person's own session alone", async () => {
    const client = await connect(testConfig({ moodleUrl: SITE, studentData: "pseudonymize" }));
    const failed = await client.callTool({ name: "failing", arguments: {} });
    assert.equal(failed.isError, true);
    assert.match(JSON.stringify(failed.content), new RegExp(`user \\[user\\]: ${ada} has blocked you`));
    assert.deepEqual((await client.callTool({ name: "get_me", arguments: {} })).structuredContent, { fullName: "Teacher Smith", email: "teacher@example.org" });
  });

  it("is off with names in clear", async () => {
    const client = await connect(testConfig({ moodleUrl: SITE, studentData: "clear" }));
    const out = (await client.callTool({ name: "leaky", arguments: {} })).structuredContent as { group: { name: string } };
    assert.equal(out.group.name, "Ada Lovelace's team");
    assert.match(JSON.stringify((await client.callTool({ name: "failing", arguments: {} })).content), /user 7: Ada Lovelace/);
  });
});
