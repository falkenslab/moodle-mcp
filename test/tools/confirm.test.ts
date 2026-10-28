import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { CONFIRMED, CONFIRM_SENTENCE, localeLanguage } from "../../src/tools/confirm.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

/** A client that answers the server's questions with `answer`, or one without elicitation. */
async function connect(config: Config, answer?: { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> }) {
  const server = createServer({ config, browser: fakeBrowserManager() });
  const client = new Client({ name: "test", version: "0.0.0" }, answer ? { capabilities: { elicitation: {} } } : {});
  const asked: string[] = [];
  const fields: unknown[] = [];
  if (answer)
    client.setRequestHandler(ElicitRequestSchema, (request) => {
      asked.push(request.params.message);
      fields.push((request.params as { requestedSchema?: { properties?: Record<string, unknown> } }).requestedSchema?.properties?.confirm);
      return answer;
    });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const call = async (name: string, args: Record<string, unknown>) => JSON.stringify((await client.callTool({ name, arguments: args })).content);
  return { client, call, asked, fields };
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

  it("asks in the person's language, from the locale", async () => {
    assert.equal(localeLanguage({ LANG: "es_ES.UTF-8" }), "es");
    assert.equal(localeLanguage({ LANG: "es" }), "es");
    assert.equal(localeLanguage({ LC_ALL: "C", LANG: "es_ES.UTF-8" }), "en");
    assert.equal(localeLanguage({ LC_MESSAGES: "es_MX.UTF-8", LANG: "en_US.UTF-8" }), "es");
    assert.equal(localeLanguage({ LC_ALL: "", LANG: "es_AR" }), "es");
    assert.equal(localeLanguage({ LANG: "en_GB.UTF-8" }), "en");
    assert.equal(localeLanguage({ LANG: "eu_ES.UTF-8" }), "en");
    assert.equal(localeLanguage({}), "en");

    const saved = { LC_ALL: process.env.LC_ALL, LC_MESSAGES: process.env.LC_MESSAGES, LANG: process.env.LANG };
    Object.assign(process.env, { LC_ALL: "", LC_MESSAGES: "", LANG: "es_ES.UTF-8" });
    try {
      const no = await connect(testConfig({ moodleUrl: site, confirm: "elicit" }), { action: "decline" });
      // What the agent reads stays in English.
      assert.match(await no.call("delete_activity", { courseId: 3, activityId: 5 }), /said no to delete_activity/);
      assert.equal(no.asked[0], "Borrar la actividad 5 del curso 3, con todo lo que los participantes hicieron en ella (entregas, intentos, mensajes, calificaciones). No se puede deshacer. ¿Seguimos?");
      assert.deepEqual(no.fields[0], { type: "boolean", title: "Sí, hazlo", description: "Déjalo sin marcar, o rechaza, para no cambiar nada" });
      assert.equal(((await no.client.callTool({ name: "server_info", arguments: {} })).structuredContent as { confirmLanguage: string }).confirmLanguage, "es");
    } finally {
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("has every question in English and Spanish", () => {
    const args = { courseId: 3, activityId: 5, sectionId: 7, intoCourseId: 3, mode: "replace", userId: 9, questionIds: [1, 2], bankId: 4, categoryId: 6, moveTo: 8, name: "elsewhere" };
    for (const [name, rule] of Object.entries(CONFIRMED)) {
      const { en, es } = rule.what(args);
      assert.ok(en && es && en !== es, name);
    }
    assert.match(CONFIRMED.unenrol_user!.what({ courseId: 3, userId: 9 }).es, /Dar de baja al usuario 9 del curso 3/);
    assert.match(CONFIRMED.unenrol_user!.what({ courseId: 3, user: "A-7KQ2XM" }).es, /Dar de baja a A-7KQ2XM del curso 3/);
  });
});
