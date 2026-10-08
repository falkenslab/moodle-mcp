import { registerLogin } from "./login.js";
import { registerServerInfo } from "./serverInfo.js";
import type { RegisterTool } from "./types.js";

/** Every tool the server exposes, in the order clients list them. */
export const TOOLS: RegisterTool[] = [registerLogin, registerServerInfo];
