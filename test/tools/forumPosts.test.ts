import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext, Route } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
let dir: string;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-posts-"));
  await writeFile(path.join(dir, "shot.txt"), "a screenshot\n");
});
after(async () => {
  await browser?.close();
  await rm(dir, { recursive: true, force: true });
});

/** Moodle's post form, reduced; made up. */
function postForm(subject: string): string {
  return `<form class="mform" action="${SITE}mod/forum/post.php" method="post">
<input type="hidden" name="forum" value="2"><input type="hidden" name="reply" value="0"><input type="hidden" name="sesskey" value="s1">
<input type="text" name="subject" value="${subject}"><textarea name="message[text]" id="id_message"></textarea>
<input type="hidden" name="discussionsubscribe" value="0"><input type="checkbox" name="discussionsubscribe" value="1" checked>
<input type="hidden" name="attachments" value="555"><input type="submit" name="submitbutton" value="Post to forum"></form>
<script>var fp = {"repositories":{"5":{"id":"5","name":"Upload a file","type":"upload"}}};</script>`;
}

/** A row of the forum page's discussion list, reduced. */
const row = (id: number) => `<tr data-region="discussion-list-item" data-discussionid="${id}" data-forumid="2"><th><a href="${SITE}mod/forum/discuss.php?d=${id}">D${id}</a></th><td><span>0</span></td></tr>`;

describe("reply_to_post and create_discussion", { skip: !browser && "no system browser" }, () => {
  async function connect() {
    const posts: URLSearchParams[] = [];
    const uploads: string[] = [];
    const discussions = [1];
    const context: BrowserContext = await browser!.newContext();
    await serveFakeMoodle(context, { user: { id: 4, fullName: "Student" } });
    const page = (body: string, bodyId = "") => moodlePage({ userId: 4, body, bodyId });
    await context.route(`${SITE}mod/forum/view.php**`, (route: Route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: page(`<form action="${SITE}mod/forum/post.php"><input type="hidden" name="forum" value="2"></form><table>${discussions.map(row).join("")}</table>`, "page-mod-forum-view") }),
    );
    await context.route(`${SITE}mod/forum/post.php**`, (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: page(postForm(url.searchParams.get("reply") ? "Re: Welcome" : "")) });
      const form = new URLSearchParams(request.postData() ?? "");
      posts.push(form);
      if (form.get("reply") === "0") discussions.push(7);
      // Moodle lands on the discussion at the new post; Playwright can't follow a fulfilled redirect, so the page is served at a URL with the anchor.
      return route.fulfill({ status: 200, contentType: "text/html", body: `<script>location.replace("${SITE}mod/forum/discuss.php?d=1#p42")</script>` });
    });
    await context.route(`${SITE}mod/forum/discuss.php**`, (route: Route) => route.fulfill({ status: 200, contentType: "text/html", body: page("<p>Discussion</p>") }));
    await context.route(`${SITE}repository/repository_ajax.php**`, (route: Route) => {
      uploads.push(/filename="([^"]+)"/.exec(route.request().postData() ?? "")?.[1] ?? "");
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context, posts, uploads };
  }

  it("replies through the post form, keeping Moodle's subject, with attachments", async () => {
    const { client, context, posts, uploads } = await connect();
    const result = await client.callTool({ name: "reply_to_post", arguments: { postId: 4, message: "<p>Hello</p>", files: [path.join(dir, "shot.txt")], subscribe: false } });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    assert.deepEqual(result.structuredContent, { changed: "Replied to post 4 with post 42.", postId: 42, discussionId: 1 });
    assert.equal(posts[0]?.get("subject"), "Re: Welcome");
    assert.equal(posts[0]?.get("message[text]"), "<p>Hello</p>");
    assert.deepEqual(posts[0]?.getAll("discussionsubscribe"), ["0"]);
    assert.deepEqual(uploads, ["shot.txt"]);
    await context.close();
  });

  it("starts a discussion in the forum's instance and returns its id", async () => {
    const { client, context, posts } = await connect();
    const result = await client.callTool({ name: "create_discussion", arguments: { forumId: 9, subject: "Help", message: "<p>It fails</p>" } });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    assert.equal((result.structuredContent as { discussionId: number }).discussionId, 7);
    assert.equal(posts[0]?.get("forum"), "2");
    assert.equal(posts[0]?.get("subject"), "Help");
    await context.close();
  });

  it("refuses an empty message before posting anything", async () => {
    const { client, context, posts } = await connect();
    const result = await client.callTool({ name: "reply_to_post", arguments: { postId: 4, message: "<p> &nbsp; </p>" } });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /message is empty/);
    assert.equal(posts.length, 0);
    await context.close();
  });
});
