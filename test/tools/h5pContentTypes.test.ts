import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Route } from "playwright-core";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

// A made-up content bank whose "Add" menu offers two H5P types, as Moodle 5.2 renders it.
const add = (library: string, title: string) => `<a class="dropdown-item" href="${SITE}contentbank/edit.php?contextid=77&amp;plugin=h5p&amp;library=${encodeURIComponent(library)}">${title}</a>`;
const BANK = `<div data-region="contentbank"><div class="dropdown-menu">${add("H5P.MultiChoice 1.16", "Multiple Choice")}${add("H5P.DragQuestion 1.14", "Drag and Drop")}</div></div>`;

async function connect(canInstall: boolean): Promise<Client> {
  const context = await browser!.newContext();
  await serveFakeMoodle(context, { user: { id: 3, fullName: "T" }, bodies: { "/contentbank/index.php": BANK } });
  // The course page names its context; the libraries page opens only for whoever may install them.
  await context.route(`${SITE}course/view.php**`, (route: Route) => route.fulfill({ status: 200, contentType: "text/html", body: moodlePage({ userId: 3, contextId: 77, bodyClass: "course-5" }) }));
  await context.route(`${SITE}h5p/libraries.php**`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: moodlePage({ userId: 3, bodyId: canInstall ? "page-h5p-libraries" : "page-site-index" }) }),
  );
  const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("list_h5p_content_types", { skip: !browser && "no system browser" }, () => {
  it("lists the content bank's H5P types and whether the person may install more", async () => {
    const client = await connect(false);
    const result = await client.callTool({ name: "list_h5p_content_types", arguments: { courseId: 5 } });
    assert.equal(result.isError, undefined, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, {
      types: [
        { library: "H5P.MultiChoice", version: "1.16", title: "Multiple Choice" },
        { library: "H5P.DragQuestion", version: "1.14", title: "Drag and Drop" },
      ],
      canInstall: false,
    });
    assert.equal(((await (await connect(true)).callTool({ name: "list_h5p_content_types", arguments: { courseId: 5 } })).structuredContent as { canInstall: boolean }).canInstall, true);
  });

  it("is a teacher's read", async () => {
    const client = await connect(false);
    const tool = (await client.listTools()).tools.find((t) => t.name === "list_h5p_content_types");
    assert.deepEqual(tool?.annotations, { readOnlyHint: true, openWorldHint: true });
  });
});
