// A book's chapters, as its teacher writes them: listed, added, changed, moved, shown or hidden, deleted.
import { z } from "zod";
import { addBookChapter, bookChapters, deleteBookChapter, editBookChapter, moveBookChapter, setBookChapterVisible } from "@falkenslab/moodle-driver";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const bookId = z.number().int().positive().describe("The book's id (course module id), as get_course_structure gives it");
const chapterId = z.number().int().positive().describe("The chapter's id, as list_book_chapters gives it");
const embed = z.array(z.string()).optional().describe('Absolute local files (images…) to embed in the content, which names each by its file name: <img src="shot.png">');

const chapter = z.object({
  id: z.number().int(),
  title: z.string(),
  subchapter: z.boolean().describe("A subchapter of the chapter before it"),
  hidden: z.boolean().describe("Hidden from students (a chapter's subchapters with it)"),
  position: z.number().int().describe("Its place in the book, from 1, subchapters counted"),
  content: z.string().optional().describe("With content: its HTML"),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional().describe("With content: its images, which download_file saves"),
});

/** Every change answers with the chapter and the book's chapters afterwards, to check it. */
const changeSchema = {
  changed: z.string(),
  chapterId: z.number().int(),
  chapters: z.array(chapter).describe("The book's chapters afterwards, in order"),
};
const writes = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

export const registerListBookChapters: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "list_book_chapters",
    {
      title: "List a book's chapters",
      description:
        "List a book's chapters in order: id, title, whether each is a subchapter or hidden, and its place; with content, each chapter's HTML and images too (one page read per chapter, logged by Moodle as a view). A teacher sees hidden chapters, a student doesn't. The chapter ids are what the other book tools take.",
      inputSchema: { bookId, content: z.boolean().optional().describe("Also each chapter's HTML and images") },
      outputSchema: { chapters: z.array(chapter) },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ bookId: id, content }) => reply({ chapters: await bookChapters(...(await onSite(config, browser)), id, { content }) }),
  );
};

export const registerAddBookChapter: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_book_chapter",
    {
      title: "Add a chapter to a book",
      description:
        "Add a chapter to a book through Moodle's chapter form: its title and content (HTML, with local images embedded), at the end or after another chapter, as a subchapter of the chapter before it if asked, hidden if asked (shown by default, as Moodle adds it: hide it while the book is visible and the chapter isn't ready). Returns the new chapter's id and the chapters. Changes the course: confirm with the person first.",
      inputSchema: {
        bookId,
        title: z.string().min(1),
        content: z.string().min(1).describe("Its content (HTML); Moodle requires some"),
        subchapter: z.boolean().optional().describe("A subchapter of the chapter before it (not for the first)"),
        hidden: z.boolean().optional().describe("Hidden from students"),
        afterChapterId: chapterId.optional().describe("The chapter it goes after; at the end without it"),
        embed,
      },
      outputSchema: changeSchema,
      annotations: writes,
    },
    async ({ bookId: id, ...input }) => reply(await addBookChapter(...(await onSite(config, browser)), id, input)),
  );
};

export const registerEditBookChapter: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_book_chapter",
    {
      title: "Change a book's chapter",
      description:
        "Change a chapter's title, content (HTML, with local images embedded) or whether it is a subchapter, through its form: only what is given changes. move_book_chapter moves it, set_book_chapter_visibility shows or hides it. Returns the chapters afterwards. Changes the course: confirm with the person first.",
      inputSchema: { bookId, chapterId, title: z.string().min(1).optional(), content: z.string().min(1).optional(), subchapter: z.boolean().optional(), embed },
      outputSchema: changeSchema,
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ bookId: id, chapterId: chapter, ...input }) => reply(await editBookChapter(...(await onSite(config, browser)), id, chapter, input)),
  );
};

export const registerMoveBookChapter: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "move_book_chapter",
    {
      title: "Move a book's chapter up or down",
      description:
        "Move a chapter one place up or down, as the table of contents' arrows do: a chapter moves with its subchapters, past the whole chapter before or after it; a subchapter moves alone. Call it again to move further. Returns the chapters afterwards. Changes the course: confirm with the person first.",
      inputSchema: { bookId, chapterId, direction: z.enum(["up", "down"]) },
      outputSchema: changeSchema,
      annotations: writes,
    },
    async ({ bookId: id, chapterId: chapter, direction }) => reply(await moveBookChapter(...(await onSite(config, browser)), id, chapter, { direction })),
  );
};

export const registerSetBookChapterVisibility: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_book_chapter_visibility",
    {
      title: "Show or hide a book's chapter",
      description:
        "Show a chapter to students or hide it from them, as the table of contents' eye does: a chapter's subchapters go with it, and a subchapter of a hidden chapter stays hidden. Returns the chapters afterwards. Changes what students see: confirm with the person first.",
      inputSchema: { bookId, chapterId, visible: z.boolean() },
      outputSchema: changeSchema,
      annotations: { ...writes, idempotentHint: true },
    },
    async ({ bookId: id, chapterId: chapter, visible }) => reply(await setBookChapterVisible(...(await onSite(config, browser)), id, chapter, { visible })),
  );
};

export const registerDeleteBookChapter: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "delete_book_chapter",
    {
      title: "Delete a book's chapter",
      description: "Delete a chapter with its files; deleting a chapter (not a subchapter) deletes its subchapters too. Returns the chapters afterwards. Can't be undone: confirm with the person first.",
      inputSchema: { bookId, chapterId },
      outputSchema: changeSchema,
      annotations: { ...writes, destructiveHint: true, idempotentHint: true },
    },
    async ({ bookId: id, chapterId: chapter }) => reply(await deleteBookChapter(...(await onSite(config, browser)), id, chapter)),
  );
};
