import assert from "node:assert/strict";
import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/createServer.js";
import { fileNameFor } from "../../src/tools/downloadFile.js";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";
import { launchTestBrowser } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
let site: Server;
let origin: string;
let dir: string;
before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "moodle-mcp-download-"));
  // A made-up site: a file with a Content-Disposition, one without, a protected one, a missing one.
  site = createHttpServer((request, response) => {
    if (request.url === "/pluginfile.php/1/mod_resource/content/0/brief.txt") {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": "inline; filename*=UTF-8''enunciado%20final.txt" });
      return response.end("Write a program.\n");
    }
    if (request.url === "/pluginfile.php/2/mod_folder/content/0/a.py?forcedownload=1") {
      response.writeHead(200, { "Content-Type": "text/x-python" });
      return response.end("print('a')\n");
    }
    if (request.url?.startsWith("/pluginfile.php/3/")) {
      response.writeHead(303, { Location: "/login/index.php" });
      return response.end();
    }
    if (request.url === "/login/index.php") {
      response.writeHead(200, { "Content-Type": "text/html" });
      return response.end("<html>Log in</html>");
    }
    response.writeHead(404, { "Content-Type": "text/html" });
    response.end("Not found");
  });
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(site.address() as AddressInfo).port}/`;
});
after(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => site.close(() => resolve()));
  await rm(dir, { recursive: true, force: true });
});

describe("fileNameFor", () => {
  it("takes Content-Disposition's name, else the URL's, never a path", () => {
    assert.equal(fileNameFor(new URL("http://x/pluginfile.php/1/a/b/c.pdf"), "attachment; filename*=UTF-8''informe%20final.pdf"), "informe final.pdf");
    assert.equal(fileNameFor(new URL("http://x/pluginfile.php/1/a/b/c.pdf"), 'attachment; filename="notas.docx"'), "notas.docx");
    assert.equal(fileNameFor(new URL("http://x/pluginfile.php/1/a/b/c%20d.pdf?forcedownload=1"), undefined), "c d.pdf");
    assert.equal(fileNameFor(new URL("http://x/f"), 'attachment; filename="../../evil.sh"'), "evil.sh");
    assert.equal(fileNameFor(new URL("http://x/f"), 'attachment; filename=".."'), "download");
  });
});

describe("download_file", { skip: !browser && "no system browser" }, () => {
  async function connect() {
    const context = await browser!.newContext();
    const server = createServer({ config: testConfig({ moodleUrl: origin }), browser: fakeBrowserManager({ context: async () => context }) });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    return { client, context };
  }

  it("saves files without overwriting, and explains what it can't fetch", async () => {
    const { client, context } = await connect();
    const download = (url: string) => client.callTool({ name: "download_file", arguments: { url, destDir: dir } });
    const first = (await download(`${origin}pluginfile.php/1/mod_resource/content/0/brief.txt`)).structuredContent as { path: string; name: string; size: number; contentType: string };
    assert.deepEqual([first.name, first.size, first.contentType], ["enunciado final.txt", 17, "text/plain"]);
    assert.equal(await readFile(first.path, "utf8"), "Write a program.\n");
    const second = (await download(`${origin}pluginfile.php/1/mod_resource/content/0/brief.txt`)).structuredContent as { name: string };
    assert.equal(second.name, "enunciado final (2).txt");
    assert.equal(((await download(`${origin}pluginfile.php/2/mod_folder/content/0/a.py?forcedownload=1`)).structuredContent as { name: string }).name, "a.py");
    assert.match(JSON.stringify((await download("https://example.org/x.pdf")).content), /isn't the site/);
    assert.match(JSON.stringify((await download(`${origin}pluginfile.php/3/private.pdf`)).content), /no Moodle session/);
    assert.match(JSON.stringify((await download(`${origin}pluginfile.php/9/missing.txt`)).content), /answered 404/);
    const relative = await client.callTool({ name: "download_file", arguments: { url: `${origin}pluginfile.php/2/mod_folder/content/0/a.py?forcedownload=1`, destDir: "downloads" } });
    assert.match(JSON.stringify(relative.content), /absolute path/);
    await context.close();
  });
});
