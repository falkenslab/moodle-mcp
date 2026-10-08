import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { NotLoggedInError, isLoggedIn, openSitePage, readSessionFacts } from "../../src/moodle/session.js";
import { SITE, launchTestBrowser, moodlePage, serveFakeMoodle } from "../helpers/fakeMoodle.js";

const browser = await launchTestBrowser();
after(() => browser?.close());

describe("isLoggedIn", () => {
  const user = { notLoggedIn: false, userId: 5, hasLogoutLink: true };

  it("accepts a site page with a real user", () => {
    assert.equal(isLoggedIn(`${SITE}my/`, SITE, user), true);
  });

  it("rejects the login page, other sites, logged-out pages and guests", () => {
    assert.equal(isLoggedIn(`${SITE}login/index.php`, SITE, user), false);
    assert.equal(isLoggedIn("https://sso.example.org/", SITE, user), false);
    assert.equal(isLoggedIn(`${SITE}my/`, SITE, { notLoggedIn: true, userId: 0, hasLogoutLink: false }), false);
    assert.equal(isLoggedIn(`${SITE}my/`, SITE, { notLoggedIn: false, userId: 1, hasLogoutLink: false }), false);
    assert.equal(isLoggedIn(`${SITE}my/`, SITE, { ...user, userId: null }), false);
  });
});

describe("readSessionFacts", { skip: !browser && "no system browser" }, () => {
  // A new page each time: `setContent` keeps the window, and with it the previous page's `M`.
  async function factsOf(html: string) {
    const page = await browser!.newPage();
    await page.setContent(html);
    const facts = await readSessionFacts(page);
    await page.close();
    return facts;
  }

  it("reads a logged-in page, a login page and a page that isn't Moodle's", async () => {
    assert.deepEqual(await factsOf(moodlePage({ userId: 7 })), { notLoggedIn: false, userId: 7, hasLogoutLink: true });
    assert.deepEqual(await factsOf(moodlePage({ userId: 0 })), { notLoggedIn: true, userId: 0, hasLogoutLink: false });
    assert.equal((await factsOf("<html><body>An identity provider</body></html>")).userId, null);
  });
});

describe("openSitePage", { skip: !browser && "no system browser" }, () => {
  it("opens a page with a session and refuses one without", async () => {
    const context = await browser!.newContext();
    const state: { user?: { id: number; fullName: string } } = {};
    await serveFakeMoodle(context, state);
    await assert.rejects(openSitePage(context, SITE, "my/"), NotLoggedInError);
    assert.equal(context.pages().length, 0);
    state.user = { id: 3, fullName: "Ada Lovelace" };
    const page = await openSitePage(context, SITE, "my/");
    assert.equal(page.url(), `${SITE}my/`);
    await context.close();
  });
});
