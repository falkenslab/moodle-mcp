import { z } from "zod";
import type { RegisterTool } from "./types.js";

export const registerShowBrowser: RegisterTool = (server, { browser }) => {
  server.registerTool(
    "show_browser",
    {
      title: "Show or hide the browser",
      description:
        "Show the browser to the person, so they can watch what the tools do: the window opens now (the session is kept) and each tool brings the Moodle page it works on to the front. Or hide it again: the window closes and tools go on without one. Only when the person asks to watch or to stop watching. Open tabs don't survive the switch; what was saved in Moodle does. Changes nothing in Moodle.",
      inputSchema: { visible: z.boolean().describe("true to show the browser and follow the tools in it, false to hide it") },
      outputSchema: { visible: z.boolean() },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ visible }) => {
      await browser.setVisible(visible);
      const output = { visible: browser.visible() };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    },
  );
};
