import { z } from "zod";
import { redactUrl, requireSiteUrl } from "../config.js";
import { logIn } from "@falkenslab/moodle-driver";
import type { RegisterTool } from "./types.js";

const DEFAULT_TIMEOUT_SECONDS = 300;
const PROGRESS_EVERY_MS = 5000;

const inputSchema = {
  timeoutSeconds: z
    .number()
    .int()
    .min(10)
    .max(1800)
    .optional()
    .describe(`How long to wait for the person to log in, in seconds (default ${DEFAULT_TIMEOUT_SECONDS})`),
};

const outputSchema = {
  status: z.enum(["already-logged-in", "logged-in"]),
  userId: z.number().int(),
  fullName: z.string(),
  siteUrl: z.string(),
};

export const registerLogin: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "login",
    {
      title: "Log in to Moodle",
      description:
        "Make sure there is a Moodle session. If there is one, returns the logged-in user at once. Otherwise opens a browser window at the site's login page and waits until the person logs in there themselves (the server never sees their password), then returns the user. Call it when another tool reports a missing or expired session.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ timeoutSeconds = DEFAULT_TIMEOUT_SECONDS }, extra) => {
      const siteUrl = requireSiteUrl(config);
      // Clients that pass a progress token keep waiting while progress arrives.
      const progressToken = extra._meta?.progressToken;
      let lastProgress = 0;
      const onWait = (elapsedMs: number) => {
        if (progressToken === undefined || elapsedMs - lastProgress < PROGRESS_EVERY_MS) return;
        lastProgress = elapsedMs;
        void extra
          .sendNotification({
            method: "notifications/progress",
            params: { progressToken, progress: Math.round(elapsedMs / 1000), total: timeoutSeconds, message: "Waiting for the person to log in in the browser window" },
          })
          .catch(() => undefined);
      };
      const user = await logIn(browser, siteUrl, { timeoutMs: timeoutSeconds * 1000, onWait });
      const output = { ...user, siteUrl: redactUrl(siteUrl) };
      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }], structuredContent: output };
    },
  );
};
