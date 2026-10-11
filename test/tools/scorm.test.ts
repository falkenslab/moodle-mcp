import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Page } from "playwright-core";
import { SITE, launchTestBrowser, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

/** A made-up SCORM (cmid 43) as Moodle 5.2 renders it, reduced: the "Enter" form, one finished attempt, one SCO. */
const VIEW = `<div data-activityname="Check what you know"></div><div role="main"><div id="intro" class="box"><p>Two questions.</p></div>
<div class="scorm-center"><form id="scormviewform" method="post" action="${SITE}mod/scorm/player.php"><button name="mode" id="n" value="normal">Enter</button>
<input type="hidden" name="scoid" value="2" /><input type="hidden" name="cm" value="43" /><input type="hidden" name="currentorg" value="org1" /></form></div>
<div class="box py-3 generalbox"><p>Number of attempts allowed: Unlimited<br />Number of attempts you have made: 1<br />Grade for attempt 1: 50%<br />Grading method: Highest attempt<br />Grade reported: 50%<br /></p></div></div>`;
const TOC = `<ul><li><a data-scoid="2" title="a=1&amp;scoid=2"><i class="icon fa-check fa-fw" title="Passed"></i>&nbsp;Questions&nbsp;(Score:&nbsp;50)</a></li></ul>`;
// The player with its init call kept inert, and the SCO's frame: the package's own page.
const PLAYER = `<script type="text/plain" src="${SITE}mod/scorm/datamodels/scorm_12.js"></script>
<script type="text/plain">M.scorm_api.init({"2":{}}, {}, {}, "^.*$", "^.*$", false, 0, "1", "http:\\/\\/moodle.test", "s1", "3", 2, "normal", "43", "org1", false, false, "0");</script>
<iframe id="scorm_object" src="${SITE}pluginfile.php/1/mod_scorm/content/1/index.html"></iframe>`;
const SCO = `<h1>Check what you know</h1><label><input type="radio" name="q1" value="for"> for</label><button onclick="document.body.insertAdjacentHTML('beforeend', '<p>Your score: 100</p>')">Send</button>`;

async function connect(config: Config): Promise<{ client: Client; context: BrowserContext; tab: Page }> {
  const context = await browser!.newContext();
  await serveFakeMoodle(context, {
    user: { id: 5, fullName: "Student" },
    bodies: { "/mod/scorm/view.php": VIEW, "/mod/scorm/prereqs.php": TOC, "/mod/scorm/player.php": PLAYER, "/pluginfile.php/1/mod_scorm/content/1/index.html": SCO },
  });
  const tab = await context.newPage();
  const server = createServer({ config, browser: fakeBrowserManager({ context: async () => context, tab: async () => tab }) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, context, tab };
}

const call = async (client: Client, name: string, args: Record<string, unknown> = {}) => {
  const result = await client.callTool({ name, arguments: args });
  return { error: result.isError ? JSON.stringify(result.content) : undefined, out: result.structuredContent as Record<string, unknown> };
};

describe("SCORM tools", { skip: !browser && "no system browser" }, () => {
  it("read a SCORM, open its player, and leave its package to the browser tools", async () => {
    const { client, context, tab } = await connect(testConfig({ moodleUrl: SITE, studentData: "pseudonymize" }));
    const read = await call(client, "get_scorm", { activityId: 43 });
    assert.equal(read.error, undefined, read.error);
    assert.deepEqual([read.out.attemptsMade, read.out.grade, read.out.scos], [1, "50%", [{ id: 2, title: "Questions", status: "passed", score: 50 }]]);

    const opened = await call(client, "open_scorm", { activityId: 43, newAttempt: true });
    assert.equal(opened.error, undefined, opened.error);
    // The SCO and version the player says it opened (its init call), not the ones asked for.
    assert.deepEqual([opened.out.scoId, opened.out.version], [3, "SCORM 1.2"]);
    assert.equal(tab.url(), opened.out.url);

    // The package, inside the player's frame, through the fallback tools on the same tab.
    const snapshot = (await call(client, "browser_snapshot", { scope: "page" })).out.snapshot as string;
    const send = /button "Send" \[ref=(f\d+e\d+)\]/.exec(snapshot)?.[1];
    assert.ok(send, snapshot);
    assert.equal((await call(client, "browser_click", { ref: send })).error, undefined);
    assert.equal((await call(client, "browser_wait", { text: "Your score: 100", seconds: 5 })).error, undefined);
    await context.close();
  });

  it("are declared for what they do, and open_scorm goes with the browser tools", async () => {
    const { client, context } = await connect(testConfig({ moodleUrl: SITE }));
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    assert.equal(tools.get("get_scorm")?.readOnlyHint, true);
    assert.deepEqual([tools.get("open_scorm")?.readOnlyHint, tools.get("open_scorm")?.idempotentHint], [false, false]);
    await context.close();
    const blocked = await connect(testConfig({ moodleUrl: SITE, studentData: "block" }));
    const names = (await blocked.client.listTools()).tools.map((t) => t.name);
    assert.ok(names.includes("get_scorm") && !names.includes("open_scorm") && !names.includes("browser_click"));
    await blocked.context.close();
  });
});
