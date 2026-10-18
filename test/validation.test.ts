import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/createServer.js";
import { validateGift, validateHtml } from "../src/validation.js";
import { fakeBrowserManager, testConfig } from "./helpers/fixtures.js";

const folder = mkdtempSync(path.join(tmpdir(), "validate-"));
after(() => rmSync(folder, { recursive: true, force: true }));

const GIFT = `// Unit 2
$CATEGORY: Bucles

::Q1:: What does range(3) give? {=0 1 2 ~1 2 3#Not quite ~0 1 2 3}

::Q2:: 2+2 = {#4}

::Q3:: Broken {=yes ~no

::Q4:: Weights {~%45%a ~%55%b}

::Q5:: None right {~a ~b}

::Q6:: One pair {=a -> 1}

Python is compiled {F}
`;

describe("validateGift", () => {
  it("lists the good questions and each problem with its line", () => {
    const { questions, problems } = validateGift(GIFT);
    assert.deepEqual(
      questions.map((q) => [q.line, q.type, q.title]),
      [
        [2, "category", "Bucles"],
        [4, "multichoice", "Q1"],
        [6, "numerical", "Q2"],
        [10, "multichoice", "Q4"],
        [12, "multichoice", "Q5"],
        [14, "match", "Q6"],
        [16, "truefalse", undefined],
      ],
    );
    assert.deepEqual(questions[1]!.answers?.[1], { text: "1 2 3", feedback: "Not quite" });
    assert.equal(questions[2]!.text, "2+2 =");
    const at = (line: number) => problems.filter((p) => p.line === line).map((p) => p.message).join(" | ");
    assert.match(at(8), /won't read this question/);
    assert.match(at(10), /weight 45% isn't one Moodle takes/);
    assert.match(at(12), /No answer is right/);
    assert.match(at(14), /two pairs at least/);
    assert.equal(problems.length, 5, JSON.stringify(problems));
  });

  it("reads an ordering question in its own GIFT, as Moodle exports it", () => {
    const { questions, problems } = validateGift("::Order a loop::[html]<p>Put in order</p>{>2 ALL VERTICAL ABSOLUTE_POSITION SHOW none\nfor i in range(3):\nprint(i)\n}\n");
    assert.deepEqual(problems, []);
    assert.deepEqual([questions[0]!.type, questions[0]!.title, questions[0]!.answers?.length], ["ordering", "Order a loop", 2]);
  });

  it("says when there's nothing to import", () => {
    assert.match(validateGift("// only a comment\n").problems[0]!.message, /No question found/);
  });
});

describe("validateHtml", () => {
  it("reports what Moodle's cleaning removes, tags left open and files", () => {
    const shot = path.join(folder, "shot.png");
    writeFileSync(shot, "png");
    const html = `<p>Loops<p>repeat</p>
<div onclick="go()">Go <b>now</div>
<script>alert(1)</script>
<img src="loop.png"><img src="shot.png"><a href="javascript:void(0)">x</a><a href="https://docs.python.org">ok</a>`;
    const { problems, images } = validateHtml(html, [shot, path.join(folder, "missing.png")]);
    const messages = problems.map((p) => `${p.line}: ${p.message}`).join("\n");
    assert.match(messages, /2: The onclick attribute of <div> is removed/);
    assert.match(messages, /2: <b> isn't closed/);
    assert.match(messages, /3: <script> is removed/);
    assert.match(messages, /4: A javascript: link in <a> is removed/);
    assert.match(messages, /"loop.png" isn't a URL nor a file in embed/);
    assert.match(messages, /missing.png doesn't exist/);
    assert.match(messages, /missing.png isn't named in the HTML/);
    assert.doesNotMatch(messages, /<p> isn't closed|shot.png isn't|docs.python.org|"javascript/);
    assert.deepEqual(images, ["loop.png", "shot.png"]);
  });

  it("finds nothing wrong in clean HTML", () => {
    assert.deepEqual(validateHtml('<h3>Loops</h3><p>A <strong>for</strong> loop:</p><ul><li>one<li>two</ul><a href="https://python.org">Python</a>').problems, []);
  });
});

describe("validate_gift and validate_html", () => {
  async function connect(extra = {}) {
    const server = createServer({ config: testConfig({ moodleUrl: "http://moodle.test/", ...extra }), browser: fakeBrowserManager() });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(b), client.connect(a)]);
    return client;
  }

  it("check without Moodle, also with read-only access, from text or a file", async () => {
    const client = await connect({ access: "read" });
    const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t.annotations]));
    assert.equal(tools.get("validate_gift")?.readOnlyHint, true);
    assert.equal(tools.get("validate_html")?.openWorldHint, false);
    const file = path.join(folder, "unit.gift");
    writeFileSync(file, GIFT);
    const gift = (await client.callTool({ name: "validate_gift", arguments: { file } })).structuredContent as { valid: boolean; count: number };
    assert.deepEqual([gift.valid, gift.count], [false, 6]);
    const html = (await client.callTool({ name: "validate_html", arguments: { text: "<p>Fine</p>" } })).structuredContent as { valid: boolean };
    assert.equal(html.valid, true);
    assert.match(JSON.stringify((await client.callTool({ name: "validate_gift", arguments: {} })).content), /either as text or as a file/);
  });
});
