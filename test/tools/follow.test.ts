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

  it("takes the last call that has a page, as an absolute URL", () => {
    const config = testConfig({ moodleUrl: site });
    const calls: driver.DriverCall[] = [
      { name: "courseStructure", args: [3], result: [] },
      { name: "createActivity", args: [{ courseId: 3, type: "page" }], result: { activityId: 40 } },
      { name: "siteName", args: [], result: "Site" },
    ];
    assert.equal(pageFor(calls, config), `${site}mod/page/view.php?id=40`);
    assert.equal(pageFor([], config), undefined);
    // A result not as the map expects: no page, rather than an error.
    assert.equal(pageFor([{ name: "editNote", args: [], result: undefined }], config), undefined);
  });

  it("gives no page that names a person unless others' data is clear", () => {
    const graded: driver.DriverCall[] = [{ name: "gradeSubmission", args: [41, 7], result: {} }];
    const profile: driver.DriverCall[] = [{ name: "userById", args: [7], result: {} }];
    assert.match(pageFor(graded, testConfig({ moodleUrl: site }))!, /userid=7/);
    for (const studentData of ["pseudonymize", "block"] as const) {
      const config = testConfig({ moodleUrl: site, studentData });
      assert.equal(pageFor(graded, config), undefined);
      assert.equal(pageFor(profile, config), undefined);
      assert.equal(pageFor([{ name: "courseStructure", args: [3], result: [] }], config), `${site}course/view.php?id=3`);
    }
  });
});
