// The H5P content types a site can run (#52): what an H5P package needs before it's built and uploaded.
import { z } from "zod";
import { h5pContentTypes } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

export const registerListH5PContentTypes: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_h5p_content_types",
    {
      title: "List the H5P content types the site can run",
      description:
        "List the H5P content types the site can run, as a course's content bank offers them to create: each one's main library (its machine name, as an H5P package's h5p.json names it), version and title, and whether you may install new ones. Check it before building an H5P package that ships only its content: it plays only where its main library is one of these (unless you may install new ones, and the package carries its libraries). Then create_activity with type h5pactivity uploads it. Empty when the site has no H5P libraries, or you can't create content in that course's bank.",
      inputSchema: { courseId: z.number().int().positive().describe("A course you teach, from list_courses: its content bank is where the types are read") },
      outputSchema: {
        types: z.array(
          z.object({
            library: z.string().describe('The main library\'s machine name: "H5P.MultiChoice"…'),
            version: z.string().describe('Its newest version on the site, major.minor: "1.16"'),
            title: z.string().describe("Its title, as the library gives it"),
          }),
        ),
        canInstall: z.boolean().describe("Whether you may install H5P libraries: only then does a package whose libraries the site lacks deploy, by uploading it"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ courseId }) => reply(await h5pContentTypes(...(await onSite(config, browser)), courseId)),
  );
};
