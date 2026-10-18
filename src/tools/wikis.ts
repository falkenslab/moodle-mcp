// A wiki's pages: listed, read with their history, created and edited by teachers and students.
// Authors as aliases under pseudonymize; pages others wrote redacted.
import { z } from "zod";
import type { BrowserContext } from "playwright-core";
import { createWikiPage, editWikiPage, wikiPage, wikiPages, type WikiPage } from "@falkenslab/moodle-driver";
import type { Config } from "../config.js";
import { requireSiteUrl } from "../config.js";
import { people, personFields, pseudonymizing, refuseAliases, shown, targetUserId, text } from "../people.js";
import { more, pageInputs, pagedText } from "./paging.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const wikiId = z.number().int().positive().describe("The wiki's id (course module id), as get_course_structure gives it");
const pageId = z.number().int().positive().describe("The page's id, as list_wiki_pages gives it");
const link = z.object({ title: z.string(), pageId: z.number().int().optional().describe("None for a page not created yet") });
const subwiki = {
  groupId: z.number().int().positive().optional().describe("A group's subwiki, in a wiki with groups; the person's own when missing"),
  participant: z.string().optional().describe("A participant's subwiki in an individual wiki, by alias when the server pseudonymizes"),
  participantId: z.number().int().positive().optional().describe("Or by user id, when the server shows names"),
};
const summary = { id: z.number().int(), title: z.string(), links: z.array(link), version: z.number().int().describe("0 for a page never saved"), modified: z.string().optional(), author: z.object(personFields).optional().describe("Its last version's") };
const pageSchema = z.object({
  ...summary,
  subwikiId: z.number().int().optional(),
  html: z.string().describe("As Moodle renders it; others' redacted when the server pseudonymizes"),
  text: z.string(),
  sections: z.array(z.string()).describe("Its headings, which edit_wiki_page's section takes"),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional().describe("Download them with download_file"),
  media: z.array(z.object({ kind: z.string(), url: z.string(), title: z.string().optional() })).optional(),
  history: z.array(z.object({ version: z.number().int(), modified: z.string().optional(), author: z.object(personFields) })).optional().describe("Every version, newest first"),
});

/** The user id behind the agent's participant, when one is given. */
async function participantOf(config: Config, { participant, participantId }: { participant?: string; participantId?: number }) {
  return participant !== undefined || participantId !== undefined ? targetUserId(config, requireSiteUrl(config), { user: participant, userId: participantId }) : undefined;
}

/** A page as tools give it: authors as aliases or names, someone else's text redacted. */
async function shownPage(config: Config, context: BrowserContext, siteUrl: string, p: WikiPage) {
  const authors = [...(p.authorId !== undefined ? [{ userId: p.authorId, fullName: p.authorName ?? "" }] : []), ...(p.history ?? []).map((v) => ({ userId: v.authorId, fullName: v.authorName }))];
  const who = await people(config, context, siteUrl, authors);
  const as = new Map(authors.map((a, i) => [a.userId, shown(who[i]!)]));
  const others = pseudonymizing(config) && authors.some((_, i) => who[i]!.alias);
  const redact = (value: string) => (others ? text(config, siteUrl, value) : value);
  return {
    id: p.id,
    title: await redact(p.title),
    links: p.links,
    version: p.version,
    ...(p.modified && { modified: p.modified }),
    ...(p.authorId !== undefined && { author: as.get(p.authorId) }),
    ...(p.subwikiId !== undefined && { subwikiId: p.subwikiId }),
    html: await redact(p.html),
    text: await redact(p.text),
    sections: p.sections,
    ...(p.images && { images: p.images }),
    ...(p.media && { media: p.media }),
    ...(p.history && { history: p.history.map((v) => ({ version: v.version, ...(v.modified && { modified: v.modified }), author: as.get(v.authorId)! })) }),
  };
}

const embed = z.array(z.string()).optional().describe('Absolute local files to embed in the content (HTML pages), which names each by its file name: <img src="shot.png">');
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerListWikiPages: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_wiki_pages",
    {
      title: "List a wiki's pages",
      description: `List the pages of a wiki's subwiki by title: each one's id, the pages it links to (those not created yet without an id) and its latest version (number, date, author as an alias when the server pseudonymizes). The person's subwiki unless groupId or participant choose another. Empty while it has no pages. ${pagedText("pages", 50)}`,
      inputSchema: { wikiId, ...subwiki, ...pageInputs("pages", 50, 200) },
      outputSchema: { pages: z.array(z.object(summary)), more },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ wikiId: id, groupId, participant, participantId, limit = 50, offset }) => {
      const userId = await participantOf(config, { participant, participantId });
      const [context, siteUrl] = await onSite(config, browser);
      const page = await wikiPages(context, siteUrl, id, { groupId, userId, limit, offset });
      const withAuthor = page.items.filter((p) => p.authorId !== undefined);
      const who = await people(config, context, siteUrl, withAuthor.map((p) => ({ userId: p.authorId!, fullName: p.authorName ?? "" })));
      const as = new Map(withAuthor.map((p, i) => [p.authorId!, who[i]!]));
      const pages = await Promise.all(
        page.items.map(async (p) => {
          const author = p.authorId !== undefined ? as.get(p.authorId) : undefined;
          return { id: p.id, title: author?.alias ? await text(config, siteUrl, p.title) : p.title, links: p.links, version: p.version, ...(p.modified && { modified: p.modified }), ...(author && { author: shown(author) }) };
        }),
      );
      return reply({ pages, more: page.more });
    },
  );
};

export const registerGetWikiPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_wiki_page",
    {
      title: "Read a wiki page",
      description: "Read a wiki page: its content (HTML as Moodle renders it, its text, images and media), its sections, the pages it links to and its latest version; with history, every version, newest first. Authors as aliases, and pages others wrote redacted, when the server pseudonymizes.",
      inputSchema: { wikiId, pageId, history: z.boolean().optional().describe("Every version too") },
      outputSchema: pageSchema.shape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ wikiId: id, pageId: which, history }) => {
      const [context, siteUrl] = await onSite(config, browser);
      return reply(await shownPage(config, context, siteUrl, await wikiPage(context, siteUrl, id, which, { history })));
    },
  );
};

export const registerCreateWikiPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "create_wiki_page",
    {
      title: "Create a wiki page",
      description:
        "Create a page in a wiki's subwiki as the person, with its content (HTML in an HTML wiki, Moodle's default, or the wiki's markup; [[Title]] links to another page): the person's subwiki unless groupId or participant choose another. A subwiki's first page must have the wiki's first page title. Returns the page. Others in the course read it: confirm with the person first.",
      inputSchema: { wikiId, title: z.string().min(1), content: z.string().min(1).describe("No aliases in it"), embed, ...subwiki },
      outputSchema: { changed: z.string(), pageId: z.number().int(), page: pageSchema },
      annotations: writes,
    },
    async ({ wikiId: id, participant, participantId, ...input }) => {
      refuseAliases(config, input.title, input.content);
      const userId = await participantOf(config, { participant, participantId });
      const [context, siteUrl] = await onSite(config, browser);
      const result = await createWikiPage(context, siteUrl, id, { ...input, userId });
      return reply({ changed: result.changed, pageId: result.pageId, page: await shownPage(config, context, siteUrl, result.page) });
    },
  );
};

export const registerEditWikiPage: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_wiki_page",
    {
      title: "Edit a wiki page",
      description:
        "Change a wiki page's content, the whole page or one section (a heading, as get_wiki_page's sections lists them), as its editor does: a new version, by the person. Refused while someone else has the page open in its editor: try again later. Returns the page. Confirm with the person first.",
      inputSchema: { wikiId, pageId, content: z.string().min(1).describe("Replaces the page's, or the section's; no aliases in it"), section: z.string().optional(), embed },
      outputSchema: { changed: z.string(), pageId: z.number().int(), page: pageSchema },
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ wikiId: id, pageId: which, ...changes }) => {
      refuseAliases(config, changes.content);
      const [context, siteUrl] = await onSite(config, browser);
      const result = await editWikiPage(context, siteUrl, id, which, changes);
      return reply({ changed: result.changed, pageId: result.pageId, page: await shownPage(config, context, siteUrl, result.page) });
    },
  );
};
