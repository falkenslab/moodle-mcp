import { z } from "zod";
import { logOut } from "@falkenslab/moodle-driver";
import { onSite } from "./reply.js";
import type { RegisterTool } from "./types.js";
import { forgetSelf } from "../people.js";

export const registerLogout: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "logout",
    {
      title: "Log out of Moodle",
      description:
        "End the person's Moodle session in the server's browser, so someone else can log in (another account: login opens the window again). Only Moodle's session ends: a single sign-on provider may keep its own and log the same person back in. Only when the person asks.",
      outputSchema: { status: z.enum(["logged-out", "not-logged-in"]) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      forgetSelf();
      const ended = await logOut(...(await onSite(config, browser)));
      // The saved session cookies follow (ADR-007): a restart doesn't bring the old session back.
      await browser.saveSession();
      const output = { status: ended ? ("logged-out" as const) : ("not-logged-in" as const) };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    },
  );
};
