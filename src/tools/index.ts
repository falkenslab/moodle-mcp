import { registerConfigure } from "./configure.js";
import { registerGetActivityContent } from "./getActivityContent.js";
import { registerGetCourseStructure } from "./getCourseStructure.js";
import { registerGetDiscussion } from "./getDiscussion.js";
import { registerGetMe } from "./getMe.js";
import { registerGetSubmissions } from "./getSubmissions.js";
import { registerListAssignments } from "./listAssignments.js";
import { registerListCourses } from "./listCourses.js";
import { registerListDiscussions } from "./listDiscussions.js";
import { registerLogin } from "./login.js";
import { registerServerInfo } from "./serverInfo.js";
import type { RegisterTool } from "./types.js";

/** Every tool the server exposes, in the order clients list them. */
export const TOOLS: RegisterTool[] = [registerConfigure, registerLogin, registerGetMe, registerListCourses, registerGetCourseStructure, registerGetActivityContent, registerListAssignments, registerGetSubmissions, registerListDiscussions, registerGetDiscussion, registerServerInfo];
