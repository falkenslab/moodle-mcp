import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { CONFIRMED, CONFIRM_SENTENCE } from "../../src/tools/confirm.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

/** A client that answers the server's questions with `answer`, or one without elicitation. */
async function connect(config: Config, answer?: { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> }) {
  const server = createServer({ config, browser: fakeBrowserManager() });
  const client = new Client({ name: "test", version: "0.0.0" }, answer ? { capabilities: { elicitation: {} } } : {});
  const asked: string[] = [];
  if (answer)
    client.setRequestHandler(ElicitRequestSchema, (request) => {
      asked.push(request.params.message);
      return answer;
    });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const call = async (name: string, args: Record<string, unknown>) => JSON.stringify((await client.callTool({ name, arguments: args })).content);
  return { client, call, asked };
}
const site = "http://moodle.test/";

describe("what can't be undone, confirmed by the person (ADR-023)", () => {
  it("covers real tools, and says so in their descriptions", async () => {
    const { client } = await connect(testConfig({ moodleUrl: site, advanced: true, confirm: "elicit" }));
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.description ?? ""]));
    for (const name of Object.keys(CONFIRMED)) {
      assert.ok(tools.has(name), `${name} isn't a tool`);
      assert.ok(tools.get(name)!.endsWith(CONFIRM_SENTENCE), name);
    }
    assert.ok(!tools.get("grade_submission")!.includes(CONFIRM_SENTENCE));
  });

  it("asks the person, runs on yes and does nothing on no", async () => {
    // remove_site needs no Moodle: reaching it shows as its own error about the unknown site.
    const yes = await connect(testConfig({ moodleUrl: site, confirm: "elicit" }), { action: "accept", content: { confirm: true } });
    assert.match(await yes.call("remove_site", { name: "elsewhere" }), /elsewhere/);
    assert.doesNotMatch(await yes.call("remove_site", { name: "elsewhere" }), /said no/);
    assert.match(yes.asked[0]!, /Remove the site "elsewhere".*can't be undone/);

    const no = await connect(testConfig({ moodleUrl: site, confirm: "elicit" }), { action: "decline" });
    assert.match(await no.call("remove_site", { name: "elsewhere" }), /said no to remove_site: nothing was done/);
    const unticked = await connect(testConfig({ moodleUrl: site, confirm: "elicit" }), { action: "accept", content: { confirm: false } });
    assert.match(await unticked.call("delete_activity", { courseId: 3, activityId: 5 }), /said no/);
    assert.match(unticked.asked[0]!, /Delete activity 5 from course 3/);
  });

  it("refuses without elicitation unless the person trusts the client to have asked", async () => {
    const refused = await connect(testConfig({ moodleUrl: site, confirm: "elicit" }));
    assert.match(await refused.call("remove_site", { name: "elsewhere" }), /needs the person's confirmation.*MOODLE_MCP_CONFIRM=client/);
    const trusted = await connect(testConfig({ moodleUrl: site, confirm: "client" }));
    const result = await trusted.call("remove_site", { name: "elsewhere" });
    assert.match(result, /elsewhere/);
    assert.doesNotMatch(result, /confirmation/);
  });

  it("asks only for the calls that can't be undone", async () => {
    // A restore that merges adds to a course: no question, the tool runs (and fails here, with no browser).
    const ask = await connect(testConfig({ moodleUrl: site, confirm: "elicit" }), { action: "decline" });
    assert.doesNotMatch(await ask.call("restore_course", { file: "/tmp/b.mbz", intoCourseId: 3, mode: "merge" }), /said no/);
    assert.match(await ask.call("restore_course", { file: "/tmp/b.mbz", intoCourseId: 3, mode: "replace" }), /said no/);
    assert.equal(ask.asked.length, 1);
    assert.match(ask.asked[0]!, /Replace course 3's content/);
  });
});
