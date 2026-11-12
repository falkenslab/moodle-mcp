// A Board activity's (mod_board) columns: reading them with their notes counted, and naming, adding,
// locking and removing them, as the board's own menus do.
import { z } from "zod";
import { addBoardColumn, boardColumns, editBoardColumn, removeBoardColumn, setBoardColumns } from "../driver.js";
import { onSite, reply } from "./reply.js";
import type { RegisterTool } from "./types.js";

const boardId = z.number().int().positive().describe("The board's id (course module id), as get_course_structure gives it");
const columnId = z.number().int().positive().describe("The column's id, as get_board_columns gives it");
const name = z.string().min(1).max(100).describe("Its heading, up to 100 characters");

const columns = z
  .array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      colour: z.string().describe("The colour the board paints its heading with: the site's, by the column's place; read only"),
      locked: z.boolean().describe("Participants can't add notes to it"),
      notes: z.number().int().describe("How many notes it has"),
    }),
  )
  .describe("The board's columns, in order");

const deleteNotes = z.boolean().optional().describe("Remove columns that have notes too, losing their notes with their comments and ratings; refused otherwise");

export const registerGetBoardColumns: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "get_board_columns",
    {
      title: "Get a board's columns",
      description:
        "A Board activity's columns, in order: each one's id, heading, colour, whether it's locked and how many notes it has (in every group when the person manages the board; one group's with groupId). Read before changing them.",
      inputSchema: { boardId, groupId: z.number().int().positive().optional().describe("Count only this group's notes, in a board with groups") },
      outputSchema: { columns },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ boardId, groupId }) => reply({ columns: await boardColumns(...(await onSite(config, browser)), boardId, groupId === undefined ? {} : { groupId }) }),
  );
};

export const registerSetBoardColumns: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "set_board_columns",
    {
      title: "Set a board's columns",
      description:
        'Make a Board activity\'s columns these, in this order: its columns renamed in place, the missing ones added at the end, the extra ones removed from the end. A new board (create_activity) comes with three columns all titled "Heading": set them right after creating it. Renaming keeps a column\'s notes; removing a column with notes is refused before anything changes, unless deleteNotes. Returns the columns afterwards. Changes the course: confirm with the person first.',
      inputSchema: {
        boardId,
        columns: z
          .array(z.object({ name, locked: z.boolean().optional().describe("Locked, so participants can't add notes to it; as it is (unlocked for a new one) when missing") }))
          .min(1)
          .describe("The columns, in order"),
        deleteNotes,
      },
      outputSchema: { changed: z.string(), columns },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ boardId, columns, deleteNotes }) => reply(await setBoardColumns(...(await onSite(config, browser)), boardId, columns, deleteNotes === undefined ? {} : { deleteNotes })),
  );
};

export const registerAddBoardColumn: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "add_board_column",
    {
      title: "Add a column to a board",
      description: "Add a column at the end of a Board activity, locked if asked. Returns its id and the columns afterwards. Changes the course: confirm with the person first.",
      inputSchema: { boardId, name, locked: z.boolean().optional().describe("Locked, so participants can't add notes to it") },
      outputSchema: { changed: z.string(), columnId: z.number().int(), columns },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ boardId, ...column }) => reply(await addBoardColumn(...(await onSite(config, browser)), boardId, column)),
  );
};

export const registerEditBoardColumn: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "edit_board_column",
    {
      title: "Rename or lock a board's column",
      description: "Rename a Board activity's column, or lock or unlock it; only what is given changes, and its notes stay. Returns the columns afterwards. Changes the course: confirm with the person first.",
      inputSchema: { boardId, columnId, name: name.optional(), locked: z.boolean().optional().describe("Locked, so participants can't add notes to it") },
      outputSchema: { changed: z.string(), columnId: z.number().int(), columns },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ boardId, columnId, ...changes }) => {
      if (changes.name === undefined && changes.locked === undefined) throw new Error("Give a new name, locked, or both.");
      return reply(await editBoardColumn(...(await onSite(config, browser)), boardId, columnId, changes));
    },
  );
};

export const registerRemoveBoardColumn: RegisterTool = (server, { config, browser }) => {
  server.registerTool(
    "remove_board_column",
    {
      title: "Remove a board's column",
      description:
        "Remove a column from a Board activity. A column with notes is refused unless deleteNotes: Moodle then deletes its notes, with their comments and ratings, and there's no undo. Returns the columns afterwards. Changes the course: confirm with the person first.",
      inputSchema: { boardId, columnId, deleteNotes: z.boolean().optional().describe("Remove it even with notes, losing them") },
      outputSchema: { changed: z.string(), columnId: z.number().int(), columns },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({ boardId, columnId, deleteNotes }) => reply(await removeBoardColumn(...(await onSite(config, browser)), boardId, columnId, deleteNotes === undefined ? {} : { deleteNotes })),
  );
};
