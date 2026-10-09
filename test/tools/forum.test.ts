import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { SITE, ServiceFailure, launchTestBrowser, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";

const browser = await launchTestBrowser();
after(() => browser?.close());

/** A discussion row as Moodle 5.2's forum page renders it, reduced; the data is made up. */
function row(id: number, subject: string, author: string, started: number, last: { author: string; time: number; post: number }, replies: number, locked = false): string {
  return `<tr data-region="discussion-list-item" data-discussionid="${id}" data-forumid="1">
<td><a data-type="favorite-toggle" data-discussionid="${id}" href=""></a></td>
<th scope="row"><a href="${SITE}mod/forum/discuss.php?d=${id}"> ${subject} </a><span data-region="locked-label"${locked ? "" : " hidden"}>Locked</span></th>
<td><div><img alt="Picture of ${author}"></div><div><div>${author}</div><div><time data-timestamp="${started}">2 Oct</time></div></div></td>
<td><div><div>${last.author}</div><div><a href="${SITE}mod/forum/discuss.php?d=${id}&amp;parent=${last.post}"><time data-timestamp="${last.time}">3 Oct</time></a></div></div></td>
<td><span>${replies}</span></td>
<td><input type="checkbox" data-type="subscription-toggle"><label>Subscribe</label></td>
</tr>`;
}

const FORUM_PAGE = `<table>${row(2, "Can a variable change?", "Ada Lovelace", 1_790_000_000, { author: "Alan Turing", time: 1_790_000_600, post: 3 }, 1)}${row(1, "Bool question", "Grace Hopper", 1_789_000_000, { author: "Grace Hopper", time: 1_789_000_000, post: 1 }, 0, true)}</table>`;


describe("forum tools", { skip: !browser && "no system browser" }, () => {
  async function connect(state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const server = createServer({ config: testConfig({ moodleUrl: SITE }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  const services = {
    mod_forum_get_discussion_posts: ({ discussionid }: Record<string, unknown>) => {
      if (discussionid !== 2) throw new ServiceFailure("generalexceptionmessage");
      return {
        forumid: 1,
        courseid: 5,
        posts: [
          { id: 2, subject: "Can a variable change?", message: "<p>If I set <code>x = 1</code>…</p><p>can I change it?</p>", author: { id: 6, fullname: "Ada Lovelace" }, parentid: null, timecreated: 1_790_000_000, timemodified: 1_790_000_000, isprivatereply: false, unread: null, attachments: [] },
          { id: 3, subject: "Re: Can a variable change?", message: "<p>Yes &amp; no.</p>", author: { id: 7, fullname: "Alan Turing" }, parentid: 2, timecreated: 1_790_000_600, timemodified: 1_790_000_900, isprivatereply: false, unread: true, attachments: [{ filename: "proof.pdf", url: `${SITE}pluginfile.php/1/mod_forum/attachment/3/proof.pdf` }] },
        ],
      };
    },
  };

  it("lists a forum's discussions, and refuses a page that isn't a forum", async () => {
    const { client, context } = await connect({ user: { id: 3, fullName: "T" }, bodies: { "/mod/forum/view.php": FORUM_PAGE } });
    const result = await client.callTool({ name: "list_discussions", arguments: { forumId: 4 } });
    const { discussions } = result.structuredContent as { discussions: { id: number; replies: number; started?: string }[] };
    assert.deepEqual(discussions.map((d) => [d.id, d.replies]), [[2, 1], [1, 0]]);
    assert.equal(discussions[0]?.started, new Date(1_790_000_000_000).toISOString());
    await context.close();

    // Another activity's page has another body id.
    const other = await connect({ user: { id: 3, fullName: "T" }, bodies: { "/mod/page/view.php": FORUM_PAGE } });
    await other.context.route(`${SITE}mod/forum/view.php**`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: `<body id="page-mod-page-view"><script>var M={cfg:{userId:3}}</script><a href="${SITE}login/logout.php">x</a></body>` }));
    const refused = await other.client.callTool({ name: "list_discussions", arguments: { forumId: 5 } });
    assert.equal(refused.isError, true);
    assert.match(JSON.stringify(refused.content), /isn't a forum/);
    await other.context.close();
  });

  it("reads a discussion's posts as text, and explains a missing one", async () => {
    const { client, context } = await connect({ user: { id: 3, fullName: "T" }, services });
    const result = await client.callTool({ name: "get_discussion", arguments: { discussionId: 2 } });
    const output = JSON.parse(JSON.stringify(result.structuredContent)) as { discussion: unknown; posts: Record<string, unknown>[] };
    assert.deepEqual(output.discussion, { id: 2, forumId: 1, courseId: 5 });
    assert.equal(output.posts[0]?.text, "If I set x = 1…\n\ncan I change it?");
    assert.equal(output.posts[0]?.parentId, undefined);
    assert.equal(output.posts[1]?.parentId, 2);
    assert.equal(output.posts[1]?.text, "Yes & no.");
    assert.equal(output.posts[1]?.modified, new Date(1_790_000_900_000).toISOString());
    assert.deepEqual(output.posts[1]?.attachments, [{ name: "proof.pdf", url: `${SITE}pluginfile.php/1/mod_forum/attachment/3/proof.pdf` }]);
    const missing = await client.callTool({ name: "get_discussion", arguments: { discussionId: 9 } });
    assert.equal(missing.isError, true);
    assert.match(JSON.stringify(missing.content), /doesn't exist or you can't see it/);
    for (const name of ["list_discussions", "get_discussion"]) {
      const tool = (await client.listTools()).tools.find((t) => t.name === name);
      assert.equal(tool?.annotations?.readOnlyHint, true);
    }
    await context.close();
  });
});
