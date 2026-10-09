import { z } from "zod";
import { requireSiteUrl } from "../config.js";
import { courseActivityTypes, publicSiteInfo } from "../moodle/siteInfo.js";
import type { RegisterTool } from "./types.js";

export const registerGetSiteInfo: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_site_info",
    {
      title: "Get the Moodle site's info",
      description:
        "What the Moodle site says about itself: its name, URL, language, how people log in (its own form, guest access, single sign-on providers) and whether it's in maintenance; readable before logging in. With courseId, also the activity and resource types the person can add to that course (none if they can't edit it): take the type for create_activity from here. Moodle shows its version only to administrators, so it isn't given.",
      inputSchema: { courseId: z.number().int().positive().optional().describe("A course to list the activity types that can be added to it") },
      outputSchema: {
        name: z.string(),
        url: z.string(),
        language: z.string().optional(),
        languages: z.array(z.string()).optional().describe("The languages offered, when the site limits them"),
        login: z.object({
          appLogin: z.enum(["app", "browser", "embedded"]).optional().describe("How Moodle's app is told to log in: embedded or browser mean a single sign-on page"),
          guestAccess: z.boolean(),
          identityProviders: z.array(z.string()).describe("Single sign-on providers offered on the login page"),
        }),
        maintenance: z.string().optional().describe("The maintenance message, when the site is in maintenance"),
        supportPage: z.string().optional(),
        activityTypes: z.array(z.object({ type: z.string(), title: z.string(), purpose: z.string().optional() })).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => {
      const siteUrl = requireSiteUrl(config);
      const info = await publicSiteInfo(siteUrl);
      const output = courseId === undefined ? info : { ...info, activityTypes: await courseActivityTypes(await browser.context(), siteUrl, courseId) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
