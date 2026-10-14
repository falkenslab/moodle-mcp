import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ConfigError, loadConfig, type Config } from "../../src/config.js";
import { createServer } from "../../src/createServer.js";
import { loadRuntimeSites, resolveConfiguredSites } from "../../src/sites.js";
import { moodlePage } from "@falkenslab/moodle-driver/testing";
import { fakeBrowserManager, testConfig } from "../helpers/fixtures.js";

const ROOT = path.resolve("/opt/moodle-mcp");
const load = (env: NodeJS.ProcessEnv, argv: string[] = []) => loadConfig(argv, env, ROOT) as Config;

describe("sites in the configuration", () => {
  it("keeps MOODLE_URL alone as one site, on today's profile", () => {
    const config = load({ MOODLE_URL: "https://campus.example.org" });
    assert.deepEqual(config.sites, [{ name: "campus.example.org", url: "https://campus.example.org/", origin: "configuration", profileDir: path.join(homedir(), ".moodle-mcp", "profile") }]);
    assert.equal(config.activeSite, "campus.example.org");
    assert.equal(config.moodleUrl, "https://campus.example.org/");
  });

  it("reads a list of URLs and name=url items, each other site on its own profile", () => {
    const config = load({ MOODLE_MCP_SITES: "campus=https://campus.example.org, https://uni.example.es/moodle/?lang=es" });
    assert.deepEqual(
      config.sites.map((s) => [s.name, s.url]),
      [
        ["campus", "https://campus.example.org/"],
        ["uni.example.es", "https://uni.example.es/moodle/"],
      ],
    );
    assert.equal(config.sites[1]!.profileDir, path.join(homedir(), ".moodle-mcp", "sites", "uni.example.es", "profile"));
    assert.equal(config.sources.moodleUrl, "environment");
  });

  it("reads JSON, a site as a URL or as an object with its url", () => {
    const config = load({}, ["--sites", '{"campus": "https://campus.example.org", "uni": {"url": "https://uni.example.es"}}']);
    assert.deepEqual(config.sites.map((s) => s.name), ["campus", "uni"]);
    assert.equal(config.sources.moodleUrl, "argument");
  });

  it("puts MOODLE_URL first, unless the list already has it", () => {
    assert.deepEqual(load({ MOODLE_URL: "https://a.example.org", MOODLE_MCP_SITES: "b=https://b.example.org" }).sites.map((s) => s.name), ["a.example.org", "b"]);
    assert.deepEqual(load({ MOODLE_URL: "https://a.example.org", MOODLE_MCP_SITES: "b=https://b.example.org,a=https://a.example.org" }).sites.map((s) => s.name), ["b", "a"]);
  });

  it("refuses two sites with one name, bad JSON and items that are neither", () => {
    assert.throws(() => load({ MOODLE_MCP_SITES: "https://a.example.org,https://a.example.org" }), /name them/);
    assert.throws(() => load({ MOODLE_MCP_SITES: "{not json" }), ConfigError);
    assert.throws(() => load({ MOODLE_MCP_SITES: '{"a": 3}' }), /needs a URL/);
    assert.throws(() => load({ MOODLE_MCP_SITES: "campus" }), /neither a URL nor name=url/);
    assert.throws(() => load({ MOODLE_MCP_SITES: "bad name!=https://a.example.org" }), /letters, digits/);
  });

  it("keeps its data in the plugin's folder when it runs as a plugin", () => {
    const data = path.resolve("/plugins/data/moodle");
    const config = load({ CLAUDE_PLUGIN_DATA: data, MOODLE_MCP_SITES: "a=https://a.example.org,b=https://b.example.org" });
    assert.equal(config.dataDir, data);
    assert.deepEqual(config.sites.map((s) => s.profileDir), [path.join(data, "profile"), path.join(data, "sites", "b", "profile")]);
    // MOODLE_MCP_PROFILE_DIR is still the first site's.
    assert.equal(load({ CLAUDE_PLUGIN_DATA: data, MOODLE_URL: "https://a.example.org", MOODLE_MCP_PROFILE_DIR: path.resolve("/p") }).profileDir, path.resolve("/p"));
  });
});

// Two sites that answer like Moodle, at /one and /two.
let moodle: Server;
let origin: string;
before(async () => {
  moodle = createHttpServer((request, response) => {
    response.setHeader("Content-Type", "text/html");
    const base = request.url?.match(/^\/(one|two)/)?.[0];
    response.end(base ? moodlePage({ userId: 0, wwwroot: `${origin}${base}` }) : "<html>Not Moodle</html>");
  });
  await new Promise<void>((resolve) => moodle.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(moodle.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((resolve) => moodle.close(() => resolve())));

async function connect(config: Config) {
  let closes = 0;
  const server = createServer({ config, browser: fakeBrowserManager({ close: async () => void closes++ }) });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const call = async (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args });
  return { call, closes: () => closes };
}

function fresh(): Config {
  const dataDir = mkdtempSync(path.join(tmpdir(), "moodle-mcp-sites-"));
  const config = testConfig({ moodleUrl: undefined, dataDir, profileDir: path.join(dataDir, "profile") });
  delete config.sources.moodleUrl;
  return config;
}

type Listed = { sites: { name: string; url: string; active: boolean; origin: string }[] };

describe("a configured site's base URL", () => {
  it("is found from any page of it, once, and an unreachable one stays as given", async () => {
    const config = load({ MOODLE_URL: `${origin}/one/course/view.php?id=2`, MOODLE_MCP_SITES: "gone=http://127.0.0.1:9/moodle/course/view.php" });
    assert.equal(config.moodleUrl, `${origin}/one/course/view.php/`);
    await resolveConfiguredSites(config);
    assert.equal(config.moodleUrl, `${origin}/one/`);
    assert.equal(config.sites[0]!.url, `${origin}/one/`);
    assert.equal(config.sites[1]!.url, "http://127.0.0.1:9/moodle/course/view.php/");
  });
});

describe("list_sites, add_site, use_site and remove_site", () => {
  it("add sites that survive a restart, the first on today's profile, and switch between them", async () => {
    const config = fresh();
    const { call, closes } = await connect(config);
    assert.deepEqual((await call("list_sites")).structuredContent, { sites: [] });
    // The first site comes from configure, as today; it takes the profile in use.
    await call("configure", { url: `${origin}/one/course/view.php?id=2` });
    const added = (await call("add_site", { url: `${origin}/two/`, name: "second" })).structuredContent as Listed;
    assert.deepEqual(
      added.sites.map((s) => [s.name, s.active, s.origin]),
      [
        ["127.0.0.1-" + new URL(origin).port, true, "run-time"],
        ["second", false, "run-time"],
      ],
    );
    assert.equal(config.sites[0]!.profileDir, path.join(config.dataDir, "profile"));
    assert.equal(config.sites[1]!.profileDir, path.join(config.dataDir, "sites", "second", "profile"));

    await call("use_site", { name: "second" });
    assert.equal(config.moodleUrl, `${origin}/two/`);
    assert.equal(config.profileDir, config.sites[1]!.profileDir);
    assert.equal(closes(), 1);
    assert.equal(((await call("server_info")).structuredContent as { site: string }).site, "second");

    // Saved: a new server on the same data folder knows both, the first active.
    const saved = JSON.parse(readFileSync(path.join(config.dataDir, "sites.json"), "utf8")) as { name: string }[];
    assert.deepEqual(saved.map((s) => s.name), [config.sites[0]!.name, "second"]);
    const restarted = testConfig({ moodleUrl: undefined, dataDir: config.dataDir, profileDir: path.join(config.dataDir, "profile") });
    loadRuntimeSites(restarted);
    assert.deepEqual(restarted.sites.map((s) => s.name), saved.map((s) => s.name));
    assert.equal(restarted.activeSite, config.sites[0]!.name);
  });

  it("refuse what isn't Moodle, a known site, an unknown name, and removing the active or a configured site", async () => {
    const config = fresh();
    config.sites.push({ name: "campus", url: `${origin}/one/`, profileDir: config.profileDir, origin: "configuration" });
    config.activeSite = "campus";
    config.moodleUrl = `${origin}/one/`;
    const { call } = await connect(config);
    const error = async (name: string, args: Record<string, unknown>, pattern: RegExp) => {
      const result = await call(name, args);
      assert.equal(result.isError, true, name);
      assert.match(JSON.stringify(result.content), pattern);
    };
    await error("add_site", { url: `${origin}/elsewhere` }, /Moodle/i);
    await error("add_site", { url: `${origin}/one/` }, /already known, as \\"campus\\"/);
    // Another account on the same site is another site, with a name.
    assert.equal((await call("add_site", { url: `${origin}/one/`, name: "campus-student" })).isError, undefined);
    await error("use_site", { name: "nowhere" }, /known ones are campus/);
    await error("remove_site", { name: "campus" }, /person's configuration/);
    await call("add_site", { url: `${origin}/two/`, name: "other" });
    await call("use_site", { name: "other" });
    await error("remove_site", { name: "other" }, /active site/);
  });

  it("remove_site forgets a run-time site and deletes its own profile", async () => {
    const config = fresh();
    const { call } = await connect(config);
    await call("configure", { url: `${origin}/one/` });
    await call("add_site", { url: `${origin}/two/`, name: "other" });
    const own = path.join(config.dataDir, "sites", "other");
    mkdirSync(path.join(own, "profile"), { recursive: true });
    const result = (await call("remove_site", { name: "other" })).structuredContent as Listed;
    assert.deepEqual(result.sites.map((s) => s.name), [config.sites[0]!.name]);
    assert.equal(existsSync(own), false);
    // Today's profile, the first site's, is never deleted with another.
    assert.equal(config.sites[0]!.profileDir, path.join(config.dataDir, "profile"));
  });

  it("copy_between_sites refuses one site twice, an unknown site, and a part of a course into a new one, before any browser", async () => {
    const config = fresh();
    config.sites.push({ name: "a", url: `${origin}/one/`, profileDir: config.profileDir, origin: "configuration" }, { name: "b", url: `${origin}/two/`, profileDir: path.join(config.dataDir, "sites", "b", "profile"), origin: "configuration" });
    config.activeSite = "a";
    config.moodleUrl = `${origin}/one/`;
    const { call, closes } = await connect(config);
    const refused = async (args: Record<string, unknown>, pattern: RegExp) => {
      const result = await call("copy_between_sites", { fromSite: "a", courseId: 3, toSite: "b", ...args });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result.content), pattern);
    };
    await refused({ toSite: "a", toCourseId: 4 }, /same site/);
    await refused({ toSite: "c", toCourseId: 4 }, /No site is named \\"c\\"/);
    await refused({}, /Say where to copy it/);
    await refused({ activityIds: [5], toCategoryId: 1 }, /existing course/);
    assert.equal(closes(), 0);
    assert.equal(config.activeSite, "a");
  });

  it("are session tools, there under every limit", async () => {
    const { call } = await connect(testConfig({ role: "student", access: "read", studentData: "block", scopes: ["content"] }));
    for (const name of ["list_sites", "add_site", "use_site", "remove_site"]) {
      const result = await call(name, {});
      assert.doesNotMatch(JSON.stringify(result.content), /not available|isn't allowed|out of scope/i, name);
    }
  });
});
