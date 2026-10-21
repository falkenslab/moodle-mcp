import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

// A made-up bank page with its "Create a new question" chooser: two types that ask something (one a
// plugin) and a description apart, as Moodle groups them.
const option = (type: string, name: string, summary: string) =>
  `<div class="option"><input type="radio" name="qtype" value="${type}"><span class="typename">${name}</span><span class="typesummary">${summary}</span></div>`;
const BANK = `<div class="questionbankwindow"></div><form id="chooserform">
<fieldset>${option("multichoice", "Multiple choice", "Choose one or more answers.")}${option("coderunner", "CodeRunner", "Runs the answer's code.")}</fieldset>
<fieldset>${option("description", "Description", "Not a question: text shown in the quiz.")}</fieldset></form>`;

async function connect(state: FakeMoodleState): Promise<Client> {
  const context = await browser!.newContext();
  await serveFakeMoodle(context, state);
  const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("list_question_types", { skip: !browser && "no system browser" }, () => {
  it("lists the chooser's types, plugins marked and the description apart", async () => {
    const client = await connect({ user: { id: 3, fullName: "T" }, bodies: { "/question/edit.php": BANK } });
    const result = await client.callTool({ name: "list_question_types", arguments: { bankId: 7 } });
    assert.equal(result.isError, undefined, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, {
      types: [
        { type: "multichoice", name: "Multiple choice", summary: "Choose one or more answers.", plugin: false, group: "question" },
        { type: "coderunner", name: "CodeRunner", summary: "Runs the answer's code.", plugin: true, group: "question" },
        { type: "description", name: "Description", summary: "Not a question: text shown in the quiz.", plugin: false, group: "other" },
      ],
    });
  });

  it("says so when the bank can't be opened", async () => {
    const client = await connect({ user: { id: 3, fullName: "T" } });
    const result = await client.callTool({ name: "list_question_types", arguments: { bankId: 7 } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /7/);
  });

  it("is a read", async () => {
    const client = await connect({ user: { id: 3, fullName: "T" } });
    const tool = (await client.listTools()).tools.find((t) => t.name === "list_question_types");
    assert.deepEqual(tool?.annotations, { readOnlyHint: true, openWorldHint: true });
  });
});
