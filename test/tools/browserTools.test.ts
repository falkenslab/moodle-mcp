import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Page } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { SNAPSHOT_LIMIT, onSite } from "../../src/tools/browserTools.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Made-up pages: a form with every kind of field, a link off the site, and text that shows late.
const FORM = `<div id="region-main"><h2>Settings</h2>
<form method="post" action="${SITE}save.php">
<label for="n">Name</label><input id="n" name="name" type="text">
<label for="p">Password</label><input id="p" name="pw" type="password">
<label for="c">Colour</label><select id="c" name="colour"><option value="r">Red</option><option value="g">Green</option></select>
<label for="f">File</label><input id="f" name="file" type="file">
<button type="submit">Save</button></form>
<a href="https://elsewhere.example.org/">Elsewhere</a>
<script>setTimeout(() => document.querySelector("#region-main").insertAdjacentHTML("beforeend", "<p>Ready now</p>"), 300)</script></div>`;

describe("onSite", () => {
  it("is the site's origin only", () => {
    assert.equal(onSite(`${SITE}pluginfile.php/1/a.mp4`, SITE), true);
    assert.equal(onSite("https://elsewhere.example.org/", SITE), false);
    assert.equal(onSite("not a url", SITE), false);
  });
});

describe("browser tools", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext; page: Page; posts: URLSearchParams[] }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const posts: URLSearchParams[] = [];
    // The form posts here; the fake answers with a page saying so.
    await context.route(`${SITE}save.php`, (route) => {
      posts.push(new URLSearchParams(route.request().postData() ?? ""));
      return route.fulfill({ status: 200, contentType: "text/html", body: `<script>var M={cfg:{userId:3}}</script><div id="region-main">Saved</div>` });
    });
    const page = await context.newPage();
    const manager = fakeBrowserManager({ context: async () => context, tab: async () => page });
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: manager });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, page, posts };
  }
  const logged: FakeMoodleState = { user: { id: 3, fullName: "T" }, bodies: { "/form.php": FORM, "/big.php": `<div id="region-main">${"<p>Lorem ipsum dolor sit amet</p>".repeat(3000)}</div>` } };

  async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    return { error: result.isError ? JSON.stringify(result.content) : undefined, out: result.structuredContent as Record<string, unknown>, content: result.content as { type: string }[] };
  }
  /** The ref of the first element whose snapshot line matches. */
  const refOf = (snapshot: string, line: RegExp) => /\[ref=(\w+)\]/.exec(snapshot.split("\n").find((l) => line.test(l)) ?? "")?.[1] ?? "";

  it("opens site pages only, and reads the main region with refs", async () => {
    const { client, context } = await connect(logged);
    assert.match((await call(client, "browser_navigate", { url: "https://elsewhere.example.org/" })).error ?? "", /isn't the site/);
    assert.equal((await call(client, "browser_navigate", { url: "form.php" })).out.url, `${SITE}form.php`);
    const { snapshot, truncated } = (await call(client, "browser_snapshot")).out as { snapshot: string; truncated: boolean };
    assert.match(snapshot, /textbox "Name" \[ref=\w+\]/);
    assert.doesNotMatch(snapshot, /Log out/);
    assert.equal(truncated, false);
    assert.match(((await call(client, "browser_snapshot", { scope: "page" })).out.snapshot as string), /Log out/);
    await call(client, "browser_navigate", { url: "big.php" });
    const big = (await call(client, "browser_snapshot")).out as { snapshot: string; truncated: boolean };
    assert.equal(big.truncated, true);
    assert.ok(big.snapshot.length <= SNAPSHOT_LIMIT);
    await context.close();
  });

  it("types, selects, chooses files and clicks, but never into a password field or off the site", async () => {
    const { client, context, page, posts } = await connect(logged);
    await call(client, "browser_navigate", { url: "form.php" });
    const snapshot = (await call(client, "browser_snapshot")).out.snapshot as string;
    assert.match((await call(client, "browser_type", { ref: refOf(snapshot, /textbox "Password"/), text: "x" })).error ?? "", /never types passwords/);
    assert.equal((await call(client, "browser_type", { ref: refOf(snapshot, /textbox "Name"/), text: "Ada" })).error, undefined);
    assert.deepEqual((await call(client, "browser_select", { ref: refOf(snapshot, /combobox "Colour"/), options: ["Green"] })).out.selected, ["g"]);
    const dir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-upload-"));
    await writeFile(path.join(dir, "notes.txt"), "hi");
    assert.equal((await call(client, "browser_upload", { ref: refOf(snapshot, /button "File"|"File"/), paths: [path.join(dir, "notes.txt")] })).error, undefined);
    assert.equal(await page.locator("#f").evaluate((el) => (el as unknown as { files: { name: string }[] }).files[0]?.name), "notes.txt");
    await rm(dir, { recursive: true, force: true });

    const off = await call(client, "browser_click", { ref: refOf(snapshot, /link "Elsewhere"/) });
    assert.match(off.error ?? "", /outside the site: not followed/);
    assert.equal(page.url(), `${SITE}form.php`);
    const saved = await call(client, "browser_click", { ref: refOf(snapshot, /button "Save"/) });
    assert.equal(saved.out.url, `${SITE}save.php`);
    assert.deepEqual([posts[0]?.get("name"), posts[0]?.get("colour")], ["Ada", "g"]);
    assert.match((await call(client, "browser_click", { ref: "e999" })).error ?? "", /new browser_snapshot/);
    await context.close();
  });

  it("reads and acts inside a frame, as a SCORM package runs in the player, and waits for its text", async () => {
    // Made up: content in an iframe that answers a click a moment later.
    const inner = `<button onclick="setTimeout(() => document.body.insertAdjacentHTML('beforeend', '<p>Done in the frame</p>'), 300)">Send</button>`;
    const { client, context } = await connect({ ...logged, bodies: { ...logged.bodies, "/player.php": `<div id="region-main"><iframe srcdoc="${inner.replace(/"/g, "&quot;")}"></iframe></div>` } });
    await call(client, "browser_navigate", { url: "player.php" });
    const snapshot = (await call(client, "browser_snapshot")).out.snapshot as string;
    const send = refOf(snapshot, /button "Send"/);
    assert.match(send, /^f\d+e\d+$/);
    assert.equal((await call(client, "browser_click", { ref: send })).error, undefined);
    assert.equal((await call(client, "browser_wait", { text: "Done in the frame", seconds: 5 })).error, undefined);
    assert.equal((await call(client, "browser_wait", { textGone: "Done in the frame", seconds: 1 })).error?.includes("didn't go"), true);
    await context.close();
  });

  it("waits for text, takes screenshots, and names login when the session is gone", async () => {
    const { client, context } = await connect(logged);
    await call(client, "browser_navigate", { url: "form.php" });
    assert.equal((await call(client, "browser_wait", { text: "Ready now", seconds: 5 })).error, undefined);
    assert.match((await call(client, "browser_wait", { text: "Never", seconds: 1 })).error ?? "", /didn't show within 1 s/);
    assert.equal((await call(client, "browser_screenshot")).content[0]?.type, "image");
    await context.close();
    const out = await connect({});
    assert.match((await call(out.client, "browser_navigate", { url: "form.php" })).error ?? "", /login tool/);
    await out.context.close();
  });

  it("marks reading tools read-only and clicks destructive", async () => {
    const { client, context } = await connect(logged);
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    for (const name of ["browser_snapshot", "browser_screenshot", "browser_wait"]) assert.equal(tools.get(name)?.readOnlyHint, true, name);
    assert.equal(tools.get("browser_click")?.destructiveHint, true);
    assert.equal(tools.get("browser_navigate")?.readOnlyHint, false);
    await context.close();
  });
});
