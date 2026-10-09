import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import type { Trail } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { readingSeconds } from "../../src/moodle/pace.js";
import { readTexts } from "../../src/moodle/text.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

// Made-up pages shaped like Moodle 5.2's, one per content type (ids: page 5, book 6, url 7, label 8, file 9, folder 10).
const BODIES: Record<string, string> = {
  "/mod/page/view.php": `<div id="region-main"><div class="box generalbox"><h3>Loops</h3><p>A loop repeats.</p><ul><li>for</li><li>while</li></ul></div></div>`,
  "/mod/url/view.php": `<div id="region-main"><div class="urlworkaround">Click on <a href="https://docs.example.org/tutorial">Docs</a> to open the resource.</div></div>`,
  "/mod/resource/view.php": `<div id="region-main"><div class="resourceworkaround">Click <a href="${SITE}pluginfile.php/35/mod_resource/content/0/brief.txt">brief.txt</a> link.</div></div>`,
  "/mod/folder/view.php": `<div id="region-main"><div class="foldertree"><a href="${SITE}pluginfile.php/36/mod_folder/content/0/a.py?forcedownload=1">a.py</a><a href="${SITE}pluginfile.php/36/mod_folder/content/0/b.py?forcedownload=1">b.py</a></div></div>`,
  "/mod/label/view.php": `<ul><li data-for="cmitem" data-id="8"><div class="activity-altcontent"><p><strong>Note:</strong> due Friday.</p></div></li></ul>`,
  "/mod/book/tool/print/index.php": `<div class="book_chapter" id="ch2"><h2>1. Parameters</h2><p>They take values.</p></div><div class="book_chapter" id="ch1"><h2>2. Defining</h2><p>Use def.</p></div>`,
};

/** The book's chapter pages, chained by "next" links, keyed by chapter id (none for the first). */
function bookPage(chapterId: string | null): string {
  const chapters: Record<string, { title: string; text: string; next?: string }> = {
    first: { title: "1. Parameters", text: "They take values.", next: "2" },
    "2": { title: "2. Defining", text: "Use def." },
  };
  const chapter = chapters[chapterId ?? "first"]!;
  const next = chapter.next ? `<a class="btn btn-link btn-next" href="${SITE}mod/book/view.php?id=6&chapterid=${chapter.next}">Next</a>` : "";
  return `<div id="region-main"><div class="box generalbox book_content"><h3>${chapter.title}</h3><p>${chapter.text}</p></div>${next}</div>`;
}

describe("readTexts", { skip: !browser && "no system browser" }, () => {
  it("keeps paragraphs, line breaks, lists and code, and leaves scripts out", async () => {
    const page = await browser!.newPage();
    await page.setContent(`<div class="x"><p>One <b>two</b></p><p>Three<br>four</p><ul><li>a</li><li>b</li></ul><pre>x = 1\n  y = 2</pre><script>bad()</script></div><div class="x">Second</div>`);
    assert.deepEqual(await readTexts(page, ".x"), ["One two\n\nThree\nfour\n\n- a\n- b\n\nx = 1\ny = 2", "Second"]);
    await page.close();
  });
});

describe("readingSeconds", () => {
  it("is about 240 words a minute, between 3 and 90 seconds", () => {
    assert.equal(readingSeconds("word ".repeat(120)), 30);
    assert.equal(readingSeconds("short"), 3);
    assert.equal(readingSeconds("word ".repeat(10_000)), 90);
  });
});

describe("get_activity_content", { skip: !browser && "no system browser" }, () => {
  async function connect(trail: Trail, state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    // The book's view page depends on its chapter id, which the fake's per-path bodies can't express.
    await context.route(`${SITE}mod/book/view.php**`, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: `<script>var M={cfg:{userId:3}}</script><a href="${SITE}login/logout.php">Log out</a>${bookPage(new URL(route.request().url()).searchParams.get("chapterid"))}` }),
    );
    const server = createServer({ config: testConfig({ moodleUrl: SITE, trail }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  async function read(client: Client, activityId: number, type: string) {
    const result = await client.callTool({ name: "get_activity_content", arguments: { activityId, type } });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    return JSON.parse(JSON.stringify(result.structuredContent)) as Record<string, unknown>;
  }

  it("reads every content type fast, the book from its print page", async () => {
    const { client, context } = await connect("fast", { user: { id: 3, fullName: "S" }, bodies: BODIES });
    assert.equal((await read(client, 5, "page")).text, "Loops\n\nA loop repeats.\n\n- for\n- while");
    assert.deepEqual((await read(client, 6, "book")).chapters, [
      { title: "1. Parameters", text: "They take values." },
      { title: "2. Defining", text: "Use def." },
    ]);
    assert.equal((await read(client, 7, "url")).url, "https://docs.example.org/tutorial");
    assert.equal((await read(client, 8, "label")).text, "Note: due Friday.");
    assert.deepEqual((await read(client, 9, "resource")).files, [{ name: "brief.txt", url: `${SITE}pluginfile.php/35/mod_resource/content/0/brief.txt` }]);
    assert.deepEqual(((await read(client, 10, "folder")).files as { name: string }[]).map((f) => f.name), ["a.py", "b.py"]);
    await context.close();
  });

  it("reads a book chapter by chapter with the realistic trail, pausing to read", async () => {
    const { client, context } = await connect("realistic", { user: { id: 3, fullName: "S" }, bodies: BODIES });
    const book = await read(client, 6, "book");
    assert.deepEqual(book.chapters, [
      { title: "1. Parameters", text: "They take values." },
      { title: "2. Defining", text: "Use def." },
    ]);
    assert.equal(book.trail, "realistic");
    assert.equal(book.readingSeconds, 6);
    await context.close();
  });

  it("explains a wrong type, and is read-only", async () => {
    // Moodle answers a module of another type with an error page, without the folder's tree.
    const bodies = { ...BODIES, "/mod/folder/view.php": `<div id="region-main"><p>Invalid course module ID</p></div>` };
    const { client, context } = await connect("fast", { user: { id: 3, fullName: "S" }, bodies });
    const result = await client.callTool({ name: "get_activity_content", arguments: { activityId: 5, type: "folder" } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /isn't a folder you can view/);
    const tool = (await client.listTools()).tools.find((t) => t.name === "get_activity_content");
    assert.equal(tool?.annotations?.readOnlyHint, true);
    await context.close();
  });
});
