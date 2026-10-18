import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MoodleError } from "@falkenslab/moodle-driver";
import { explain } from "../src/tools/errors.js";

describe("explain", () => {
  it("tells the agent what a site's Moodle or administrator doesn't allow, and not to work around it", () => {
    const tooOld = explain(new MoodleError("activitiesOverview needs Moodle 5.0 or later; this site runs 4.5", "not-available")) as Error;
    assert.match(tooOld.message, /needs Moodle 5\.0.*don't try another way/);
    assert.match((explain(new MoodleError("Notes are disabled on this site.", "notes-disabled")) as Error).message, /administrator turns it on/);
  });

  it("leaves other errors as they are", () => {
    const other = new MoodleError("No such section.", "invalid-input");
    assert.equal(explain(other), other);
  });
});
