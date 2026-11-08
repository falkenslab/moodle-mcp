import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as moodle from "@falkenslab/moodle-driver";
import * as driver from "../../src/driver.js";
import { pageFor } from "../../src/tools/follow.js";
import { testConfig } from "../helpers/fixtures.js";

const site = "http://moodle.test/";

describe("each tool's page (_meta.page)", () => {
  it("records every driver function that has a page", () => {
    for (const name of Object.keys(moodle.FOLLOWED_PAGES)) {
      const fn = (moodle as Record<string, unknown>)[name];
      if (typeof fn === "function") assert.notEqual((driver as Record<string, unknown>)[name], fn, `${name} isn't recorded in src/driver.ts`);
    }
  });

  it("gives the page of the tool's own call, not of what it looked up besides", () => {
    const config = testConfig({ moodleUrl: site });
    const conversation: driver.DriverCall = { name: "conversation", args: [12], result: {} };
    const lookup: driver.DriverCall = { name: "userById", args: [7], result: {} };
    assert.equal(pageFor("get_conversation", [conversation, lookup], config), `${site}message/index.php?convid=12`);
    const made: driver.DriverCall = { name: "createActivity", args: [{ courseId: 3, type: "page" }], result: { activityId: 40 } };
    assert.equal(pageFor("create_activity", [made], config), `${site}mod/page/view.php?id=40`);
    assert.equal(pageFor("create_activity", [], config), undefined);
    // A result not as the map expects: no page, rather than an error.
    assert.equal(pageFor("edit_note", [{ name: "editNote", args: [], result: undefined }], config), undefined);
  });

  it("gives no page that names a person unless others' data is clear", () => {
    const graded: driver.DriverCall[] = [{ name: "gradeSubmission", args: [41, 7], result: {} }];
    const profile: driver.DriverCall[] = [{ name: "userById", args: [7], result: {} }];
    assert.match(pageFor("grade_submission", graded, testConfig({ moodleUrl: site }))!, /userid=7/);
    for (const studentData of ["pseudonymize", "block"] as const) {
      const config = testConfig({ moodleUrl: site, studentData });
      assert.equal(pageFor("grade_submission", graded, config), `${site}mod/assign/view.php?id=41&action=grading`);
      assert.equal(pageFor("send_message", [{ name: "sendMessage", args: [7, "Hi"], result: {} }], config), `${site}message/index.php`);
      assert.equal(pageFor("get_me", profile, config), undefined);
      assert.equal(pageFor("get_course_structure", [{ name: "courseStructure", args: [3], result: [] }], config), `${site}course/view.php?id=3`);
    }
  });
});
