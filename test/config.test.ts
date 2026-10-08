import assert from "node:assert/strict";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { ConfigError, loadConfig, redactUrl, type Config } from "../src/config.js";

const ROOT = path.join(tmpdir(), "moodle-mcp-root");
const PROFILE = path.join(tmpdir(), "moodle-mcp-profile");

function load(argv: string[], env: NodeJS.ProcessEnv = {}): Config {
  const result = loadConfig(argv, env, ROOT);
  assert.equal(typeof result, "object");
  return result as Config;
}

describe("loadConfig", () => {
  it("reads environment variables", () => {
    const config = load([], {
      MOODLE_URL: "https://moodle.example.org/campus",
      MOODLE_MCP_PROFILE_DIR: PROFILE,
      MOODLE_MCP_CHANNEL: "Chrome",
      MOODLE_MCP_HEADLESS: "false",
    });
    assert.deepEqual(config, { moodleUrl: "https://moodle.example.org/campus/", profileDir: PROFILE, channel: "chrome", headless: false });
  });

  it("lets arguments override environment variables", () => {
    const config = load(["--url", "http://localhost:8080", "--channel", "msedge", "--headed"], {
      MOODLE_URL: "https://other.example.org",
      MOODLE_MCP_CHANNEL: "chrome",
      MOODLE_MCP_HEADLESS: "true",
    });
    assert.equal(config.moodleUrl, "http://localhost:8080/");
    assert.equal(config.channel, "msedge");
    assert.equal(config.headless, false);
  });

  it("defaults to a profile under the home folder, any channel and headless", () => {
    const config = load([], { MOODLE_URL: "http://localhost:8080/" });
    assert.equal(config.profileDir, path.join(homedir(), ".moodle-mcp", "profile"));
    assert.equal(config.channel, undefined);
    assert.equal(config.headless, true);
  });

  it("drops the query and fragment from the site URL", () => {
    assert.equal(load(["--url", "http://localhost:8080/my/?x=1#top"]).moodleUrl, "http://localhost:8080/my/");
  });

  it("requires an http or https URL", () => {
    assert.throws(() => load([]), ConfigError);
    assert.throws(() => load(["--url", "not a url"]), ConfigError);
    assert.throws(() => load(["--url", "ftp://moodle.example.org"]), ConfigError);
  });

  it("refuses a profile inside the server's folder", () => {
    assert.throws(() => load(["--url", "http://localhost:8080", "--profile-dir", ROOT]), ConfigError);
    assert.throws(() => load(["--url", "http://localhost:8080", "--profile-dir", path.join(ROOT, "dist", "profile")]), /server's folder/);
  });

  it("rejects unknown channels, headless values and options", () => {
    assert.throws(() => load(["--url", "http://localhost:8080", "--channel", "firefox"]), ConfigError);
    assert.throws(() => load(["--url", "http://localhost:8080"], { MOODLE_MCP_HEADLESS: "maybe" }), ConfigError);
    assert.throws(() => load(["--password", "x"]), ConfigError);
  });

  it("answers --help and --version without a URL", () => {
    assert.equal(loadConfig(["--help"], {}, ROOT), "help");
    assert.equal(loadConfig(["--version"], {}, ROOT), "version");
  });
});

describe("redactUrl", () => {
  it("removes the user and password", () => {
    assert.equal(redactUrl("https://user:secret@moodle.example.org/"), "https://moodle.example.org/");
  });
});
