import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { BrowserContext } from "playwright-core";
import { PANEL, SITE, launchTestBrowser, moodlePage, serveFakeMoodle, type FakeMoodleState } from "@falkenslab/moodle-driver/testing";
import type { Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

// Never the person's real key and directory: a folder of this run's own.
const home = mkdtempSync(path.join(tmpdir(), "pseudonym-"));
process.env.PSEUDONYM_HOME = home;
const browser = await launchTestBrowser();
after(async () => {
  await browser?.close();
  rmSync(home, { recursive: true, force: true });
});

const ALIAS = /^A-[0-9A-HJKMNP-TV-Z]{6,12}$/;

/** A made-up course: the teacher (user 3), Ada (7) and Alan (8), an assignment and a forum. */
function moodle(): { state: FakeMoodleState; graded: Record<string, unknown>[] } {
  const graded: Record<string, unknown>[] = [];
  const state: FakeMoodleState = {
    user: { id: 3, fullName: "Teacher Smith" },
    bodies: {
      "/mod/assign/view.php": `<div data-assignmentid="410" data-contextid="4100"></div>`,
      "/mod/forum/view.php": `<table><tr data-region="discussion-list-item" data-discussionid="2" data-forumid="1"><td></td><th scope="row"><a href="${SITE}mod/forum/discuss.php?d=2"> Ada's question </a><span data-region="locked-label" hidden>Locked</span></th>
<td><div><div>Ada Lovelace</div><div><time data-timestamp="1790000000">2 Oct</time></div></div></td><td><div><div>Grace Hopper</div><div><a href="${SITE}mod/forum/discuss.php?d=2&amp;parent=3"><time data-timestamp="1790000600">3 Oct</time></a></div></div></td><td><span>2</span></td></tr></table>`,
    },
    services: {
      // The teacher (the person) by default; anyone by id when asked.
      core_user_get_users_by_field: ({ values }) => {
        const names: Record<number, string> = { 3: "Teacher Smith", 7: "Ada Lovelace", 8: "Alan Turing" };
        return ((values as number[] | undefined) ?? [3]).map((id) => ({ id: Number(id), username: `u${id}`, fullname: names[Number(id)] ?? "Someone" }));
      },
      tool_mobile_get_public_config: () => ({ sitename: "Test campus" }),
      mod_assign_list_participants: () => [
        { id: 7, fullname: "Ada Lovelace", submitted: true, requiregrading: true, grantedextension: false, submissionstatus: "submitted" },
        { id: 8, fullname: "Alan Turing", submitted: false, requiregrading: false, grantedextension: false, submissionstatus: "" },
      ],
      mod_assign_get_participant: () => ({ allowsubmissionsfromdate: 0, duedate: 0, cutoffdate: 0 }),
      // The grader panel: Ada's submission (naming her) and the grade form.
      core_get_fragment: () => ({ html: `${PANEL.replace("Short answer.", "Short answer by Ada Lovelace.")}<form class="gradeform mform"><input type="hidden" name="id" value="41"><input type="hidden" name="userid" value="0"><input type="hidden" name="sesskey" value="s1"><input type="text" name="grade" value=""></form>`, javascript: "" }),
      mod_assign_submit_grading_form: (args) => {
        graded.push(args);
        return [];
      },
      mod_forum_get_discussion_posts: () => ({
        forumid: 1,
        courseid: 5,
        posts: [
          { id: 2, subject: "Ada's question", message: "<p>I am Ada Lovelace, write me at ada@example.org</p>", author: { id: 7, fullname: "Ada Lovelace" }, parentid: null, timecreated: 1_790_000_000, timemodified: 1_790_000_000, isprivatereply: false, unread: null, attachments: [{ filename: "ada-lovelace.pdf", url: `${SITE}pluginfile.php/1/mod_forum/attachment/2/ada-lovelace.pdf` }] },
          { id: 3, subject: "Re: Ada's question", message: "<p>Alan Turing knows, ask him</p>", author: { id: 8, fullname: "Alan Turing" }, parentid: 2, timecreated: 1_790_000_600, timemodified: 1_790_000_600, isprivatereply: false, unread: false, attachments: [] },
          { id: 4, subject: "Re: Ada's question", message: "<p>Thanks both</p>", author: { id: 3, fullname: "Teacher Smith" }, parentid: 2, timecreated: 1_790_000_900, timemodified: 1_790_000_900, isprivatereply: false, unread: false, attachments: [] },
        ],
      }),
    },
  };
  return { state, graded };
}

async function connect(config: Config, state: FakeMoodleState): Promise<{ client: Client; context: BrowserContext }> {
  const context = await browser!.newContext();
  await serveFakeMoodle(context, state);
  const server = createServer({ config, browser: fakeBrowserManager({ context: async () => context }) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, context };
}

const pseudonymous = () => testConfig({ moodleUrl: SITE, studentData: "pseudonymize" });
const text = (result: Record<string, unknown>) => JSON.stringify([result.content, result.structuredContent]);

describe("pseudonymous mode", { skip: !browser && "no system browser" }, () => {
  it("gives participants as stable aliases, without their names or ids, and grades by alias", async () => {
    const { state, graded } = moodle();
    const { client, context } = await connect(pseudonymous(), state);
    const read = async () => (await client.callTool({ name: "get_submissions", arguments: { assignmentId: 41 } })) as unknown as { structuredContent: { submissions: Record<string, unknown>[] } };
    const first = await read();
    const users = first.structuredContent.submissions.map((s) => s.user as string);
    assert.ok(users.every((u) => ALIAS.test(u)) && users[0] !== users[1], users.join());
    assert.doesNotMatch(text(first), /Lovelace|Turing|"userId"|"fullName"/);
    assert.deepEqual((await read()).structuredContent.submissions.map((s) => s.user), users);

    const result = await client.callTool({ name: "grade_submission", arguments: { assignmentId: 41, user: users[0], grade: "8" } });
    assert.equal(result.isError, undefined, text(result));
    assert.equal(graded[0]?.userid, 7);
    assert.doesNotMatch(text(result), /user 7|Lovelace/);
    assert.match(text(result), new RegExp(users[0]!));

    // An id where an alias is due, or an alias in text students read: refused before Moodle is touched.
    assert.match(text(await client.callTool({ name: "grade_submission", arguments: { assignmentId: 41, userId: 7, grade: "8" } })), /give the participant as user/);
    assert.match(text(await client.callTool({ name: "grade_submission", arguments: { assignmentId: 41, user: users[0], feedback: `<p>Well done ${users[0]}</p>` } })), /an alias: Moodle would show it/);
    assert.match(text(await client.callTool({ name: "reply_to_post", arguments: { postId: 2, message: `Thanks ${users[1]}` } })), /an alias/);
    assert.equal(graded.length, 1);
    await context.close();
  });

  it("names forum authors by alias, keeps the person's own posts, and redacts what others wrote", async () => {
    const { state } = moodle();
    const { client, context } = await connect(pseudonymous(), state);
    const before = await client.callTool({ name: "list_discussions", arguments: { forumId: 4 } });
    const ada = (await client.callTool({ name: "get_submissions", arguments: { assignmentId: 41, includeContent: false } })) as unknown as { structuredContent: { submissions: { user: string }[] } };
    const aliasOfAda = ada.structuredContent.submissions[0]!.user;

    const result = await client.callTool({ name: "get_discussion", arguments: { discussionId: 2 } });
    const { posts } = result.structuredContent as { posts: { author: Record<string, unknown>; text: string; attachments: Record<string, unknown>[] }[] };
    assert.deepEqual(posts[0]?.author, { alias: aliasOfAda });
    assert.ok(ALIAS.test(String(posts[1]?.author.alias)));
    assert.deepEqual(posts[2]?.author, { id: 3, fullName: "Teacher Smith" });
    assert.doesNotMatch(text(result), /Lovelace|Turing|ada@example\.org|"id":7|"id":8/);
    assert.match(posts[0]!.text, new RegExp(`I am ${aliasOfAda}`));
    assert.deepEqual(Object.keys(posts[0]!.attachments[0]!), ["name"]);

    // Ada is known now; Grace never came through with her id.
    const after = (await client.callTool({ name: "list_discussions", arguments: { forumId: 4 } })).structuredContent as { discussions: { author: string; lastPost: { author: string } }[] };
    assert.deepEqual([after.discussions[0]?.author, after.discussions[0]?.lastPost.author], [aliasOfAda, "[participant]"]);
    assert.doesNotMatch(text(before), /Lovelace|Hopper/);
    await context.close();
  });

  it("gives no one else's files, since their content can't be pseudonymized", async () => {
    const { state } = moodle();
    const { client, context } = await connect(pseudonymous(), state);
    const refused = await client.callTool({ name: "download_file", arguments: { url: `${SITE}pluginfile.php/1/mod_forum/attachment/2/ada-lovelace.pdf`, destDir: home } });
    assert.match(text(refused), /pseudonymizes students' data/);
    await context.close();
  });

  it("keeps the browser tools off people's pages, and gives the people on other pages as aliases", async () => {
    const { state } = moodle();
    // A plugin's page that names people the way Moodle does, with links to their profiles.
    state.bodies!["/mod/glossary/view.php"] = `<div id="region-main"><p>Entry by <a href="${SITE}user/view.php?id=7&amp;course=5">Ada Lovelace</a></p>
<p>Reviewed by <a href="${SITE}user/view.php?id=3&amp;course=5">Teacher Smith</a></p><a href="${SITE}user/index.php?id=5">Participants</a>
<form method="post" action="${SITE}save.php"><button type="submit">Save</button></form></div>`;
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    let saved = 0;
    // Saving goes back to a people's page, as a grading form does (a script here: the fake can't follow an HTTP redirect).
    await context.route(`${SITE}save.php`, (route) => {
      saved++;
      return route.fulfill({ status: 200, contentType: "text/html", body: `<script>location.href = "${SITE}user/index.php?id=5"</script>` });
    });
    const page = await context.newPage();
    const server = createServer({ config: pseudonymous(), browser: fakeBrowserManager({ context: async () => context, tab: async () => page }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const call = (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args });

    const tools = (await client.listTools()).tools.map((t) => t.name);
    assert.ok(tools.includes("browser_snapshot") && !tools.includes("browser_screenshot"));
    for (const url of ["user/index.php?id=5", "grade/report/grader/index.php?id=5", "mod/forum/discuss.php?d=2", "course/user.php?id=5&user=7", "mod/assign/view.php?id=4&action=grading"]) {
      assert.match(text(await call("browser_navigate", { url })), /pseudonymizes them/, url);
    }
    assert.equal((await call("browser_navigate", { url: "mod/glossary/view.php?id=9" })).isError, undefined);
    const read = await call("browser_snapshot");
    const snapshot = (read.structuredContent as { snapshot: string }).snapshot;
    assert.doesNotMatch(text(read), /Lovelace|id=7/);
    assert.match(snapshot, /Entry by.*A-[0-9A-Z]{6}/s);
    assert.match(snapshot, /Teacher Smith/);

    const refOf = (line: RegExp) => /\[ref=(\w+)\]/.exec(snapshot.split("\n").find((l) => line.test(l)) ?? "")?.[1] ?? "";
    assert.match(text(await call("browser_click", { ref: refOf(/link "Participants"/) })), /pseudonymizes them/);
    assert.equal(page.url(), `${SITE}mod/glossary/view.php?id=9`);
    assert.match(text(await call("browser_click", { ref: refOf(/button "Save"/) })), /took effect.*pseudonymizes them/);
    assert.equal(saved, 1);
    assert.match(text(await call("browser_screenshot")), /disabled|outside what this server allows/);
    await context.close();
  });

  it("gives participants and grades as aliases, the person themselves by name", async () => {
    const { state } = moodle();
    const people = [
      { id: 3, name: "Teacher Smith", roles: [3], groups: [] as number[] },
      { id: 7, name: "Ada Lovelace", roles: [5], groups: [1] },
      { id: 8, name: "Alan Turing", roles: [5], groups: [] as number[] },
    ];
    state.bodies!["/grade/report/grader/index.php"] = `<table id="user-grades"><tbody><tr class="heading"><th id="studentheader">Name</th><th class="item catlevel2 i12" data-itemid="12"><a class="gradeitemheader" href="${SITE}mod/quiz/view.php?id=27">Quiz one</a></th></tr>
${people.slice(1).map((p) => `<tr class="userrow" data-uid="${p.id}"><th><a class="username" href="${SITE}user/view.php?id=${p.id}&amp;course=5">${p.name}</a></th><td class="gradecell" data-itemid="12"><span class="gradevalue">7.00</span></td></tr>`).join("")}</tbody></table>`;
    Object.assign(state.services!, {
      core_table_get_dynamic_table_content: (args: Record<string, unknown>) => {
        const filters = args.filters as { name: string; values: number[] }[];
        const value = (name: string) => filters.find((f) => f.name === name)?.values[0];
        const rows = people.filter((p) => (value("roles") === undefined || p.roles.includes(value("roles")!)) && (value("groups") === undefined || p.groups.includes(value("groups")!)));
        const tr = rows.map((p) => `<tr><td><input id="user${p.id}" type="checkbox" class="usercheckbox"></td><th scope="row"><a href="${SITE}user/view.php?id=${p.id}&amp;course=5">${p.name}</a></th></tr>`).join("");
        return { html: `<div data-table-total-rows="${rows.length}"><table><tbody>${tr}</tbody></table></div>`, warnings: [] };
      },
      core_group_get_groups_for_selector: () => ({ groups: [{ id: 1, name: "Ada's team" }] }),
      core_group_get_course_groups: () => [{ id: 1, name: "Ada's team" }],
      core_group_get_group_members: () => [{ groupid: 1, userids: [7] }],
    });
    const context = await browser!.newContext();
    await serveFakeMoodle(context, state);
    const filters = `<select data-field-name="roles"><option value="3">Teacher</option><option value="5">Student</option></select><select data-field-name="groups"><option value="1">Ada's team</option></select>`;
    await context.route(`${SITE}user/index.php**`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: moodlePage({ userId: 3, heading: "Participants", bodyId: "page-course-view-participants", body: filters }) }));
    const server = createServer({ config: pseudonymous(), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const listed = await client.callTool({ name: "list_participants", arguments: { courseId: 5 } });
    assert.equal(listed.isError, undefined, text(listed));
    const found = (listed.structuredContent as { participants: { user?: string; fullName?: string }[] }).participants;
    assert.equal(found.length, 3);
    assert.equal(found.find((p) => p.fullName)?.fullName, "Teacher Smith");
    assert.equal(found.filter((p) => p.user && ALIAS.test(p.user)).length, 2);
    assert.doesNotMatch(text(listed), /Lovelace|Turing|Ada's|"userId":[78]/);

    const report = await client.callTool({ name: "get_grader_report", arguments: { courseId: 5 } });
    assert.equal(report.isError, undefined, text(report));
    const rows = (report.structuredContent as { rows: { user?: string; grades: unknown[] }[] }).rows;
    assert.deepEqual(rows.map((r) => r.user).sort(), found.filter((p) => p.user).map((p) => p.user).sort());
    assert.doesNotMatch(text(report), /Lovelace|Turing/);
    await context.close();
  });

  it("gives senders and conversation members as aliases, and sends by alias", async () => {
    const { state } = moodle();
    const sent: Record<string, unknown>[] = [];
    Object.assign(state.services!, {
      message_popup_get_popup_notifications: () => ({
        notifications: [{ id: 16, useridfrom: 7, subject: "Ada Lovelace posted in Loops", fullmessage: "Ada Lovelace (ada@example.org) asks about loops.", smallmessage: "", contexturl: `${SITE}mod/forum/discuss.php?d=4`, timecreated: 1_790_000_100, read: false, component: "mod_forum", eventtype: "posts" }],
        unreadcount: 1,
      }),
      // Every member, the person included; the messages' own members are only their senders.
      core_message_get_conversation_members: () => [
        { id: 3, fullname: "Teacher Smith" },
        { id: 8, fullname: "Alan Turing" },
      ],
      core_message_get_conversation_messages: ({ convid }: Record<string, unknown>) => ({
        id: convid,
        members: [
          { id: 8, fullname: "Alan Turing" },
          { id: 3, fullname: "Teacher Smith" },
        ],
        messages: [
          { id: 1, useridfrom: 8, text: "<p>I'm Alan Turing, can I hand in late?</p>", timecreated: 1_790_000_200 },
          { id: 2, useridfrom: 3, text: "<p>Yes.</p>", timecreated: 1_790_000_300 },
        ],
      }),
      core_message_send_instant_messages: ({ messages }: Record<string, unknown>) => {
        sent.push(...(messages as Record<string, unknown>[]));
        return [{ msgid: 3, conversationid: 6, text: "x", timecreated: 1 }];
      },
    });
    const { client, context } = await connect(pseudonymous(), state);
    const listed = await client.callTool({ name: "list_notifications", arguments: {} });
    assert.equal(listed.isError, undefined, text(listed));
    const [note] = (listed.structuredContent as { notifications: { from: { user?: string }; subject: string; text: string }[] }).notifications;
    assert.ok(ALIAS.test(note!.from.user ?? ""), JSON.stringify(note));
    assert.match(note!.subject, new RegExp(`^${note!.from.user} posted`));
    assert.doesNotMatch(text(listed), /Lovelace|ada@example\.org|"userId":7/);

    const read = await client.callTool({ name: "get_conversation", arguments: { conversationId: 6 } });
    assert.equal(read.isError, undefined, text(read));
    const conv = read.structuredContent as { members: { user?: string }[]; messages: { from: Record<string, unknown> }[] };
    const alan = conv.members[0]!.user!;
    assert.ok(ALIAS.test(alan));
    assert.deepEqual(conv.messages.map((m) => m.from), [{ user: alan }, { userId: 3, fullName: "Teacher Smith" }]);
    assert.doesNotMatch(text(read), /Turing/);

    assert.match(text(await client.callTool({ name: "send_message", arguments: { user: alan, text: `Hi ${alan}` } })), /an alias/);
    const ok = await client.callTool({ name: "send_message", arguments: { user: alan, text: "Yes, until Friday." } });
    assert.equal(ok.isError, undefined, text(ok));
    assert.equal(sent[0]?.touserid, 8);
    assert.doesNotMatch(text(ok), /user 8|Turing/);
    await context.close();
  });

  it("shows names as Moodle does with clear, and configure tightens clear to pseudonymize", async () => {
    const { state } = moodle();
    const { client, context } = await connect(testConfig({ moodleUrl: SITE }), state);
    const clear = await client.callTool({ name: "get_submissions", arguments: { assignmentId: 41, includeContent: false } });
    assert.match(text(clear), /Ada Lovelace/);
    assert.equal((await client.callTool({ name: "configure", arguments: { studentData: "pseudonymize" } })).isError, undefined);
    const tightened = await client.callTool({ name: "get_submissions", arguments: { assignmentId: 41, includeContent: false } });
    assert.doesNotMatch(text(tightened), /Lovelace/);
    assert.ok(!(await client.listTools()).tools.some((t) => t.name === "browser_screenshot"));
    await context.close();
  });
});
