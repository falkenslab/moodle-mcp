import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BrowserLostError, MoodleError, ProfilePathTooLongError } from "@falkenslab/moodle-driver";
import { explain } from "../src/tools/errors.js";

describe("explain", () => {
  it("tells the agent what a site's Moodle or administrator doesn't allow, and not to work around it", () => {
    const tooOld = explain(new MoodleError("activitiesOverview needs Moodle 5.0 or later; this site runs 4.5", "not-available")) as Error;
    assert.match(tooOld.message, /needs Moodle 5\.0.*don't try another way/);
    assert.match((explain(new MoodleError("Notes are disabled on this site.", "notes-disabled")) as Error).message, /administrator turns it on/);
  });

  it("says the browser was lost, whichever way the error comes, and that Moodle refused nothing", () => {
    for (const lost of [new BrowserLostError(), new Error("page.goto: Target page, context or browser has been closed")]) {
      const told = explain(lost) as Error;
      assert.match(told.message, /closed or crashed during this call/);
      assert.match(told.message, /Moodle refused nothing/);
      assert.match(told.message, /MOODLE_MCP_CHANNEL/);
    }
  });

  it("leaves a browser that couldn't start out of 'lost'", () => {
    const launch = new Error("browserType.launchPersistentContext: Target page, context or browser has been closed");
    assert.equal(explain(launch), launch);
  });

  it("sends a long profile path to the person, not to configure on its own", () => {
    const told = explain(new ProfilePathTooLongError(240)) as Error;
    assert.match(told.message, /may be too long for Windows \(240 characters\)/);
    assert.match(told.message, /Tell the person.*MOODLE_MCP_PROFILE_DIR.*asks them first/);
  });

  it("leaves other errors as they are", () => {
    const other = new MoodleError("No such section.", "invalid-input");
    assert.equal(explain(other), other);
  });
});
