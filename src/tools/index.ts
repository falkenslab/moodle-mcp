import { registerCreateActivity, registerUpdateActivity } from "./activityForms.js";
import { registerCreateEvent, registerDeleteEvent, registerListEvents } from "./calendar.js";
import { registerGetAssignment, registerSaveSubmission, registerSubmitAssignment } from "./assignSubmission.js";
import { BROWSER_TOOLS } from "./browserTools.js";
import { registerConfigure } from "./configure.js";
import { registerGetActivitiesOverview, registerGetCourseUpdates, registerListDeadlines } from "./courseOverview.js";
import { registerGetActivitySettings, registerUpdateCourse } from "./courseSettings.js";
import { registerAddSection, registerDeleteActivity, registerDeleteSection, registerDuplicateActivity, registerEditActivity, registerEditSection } from "./courseLayout.js";
import { registerDownloadFile } from "./downloadFile.js";
import { registerCreateDiscussion, registerReplyToPost } from "./forumPosts.js";
import { registerGetActivityContent } from "./getActivityContent.js";
import { registerGetCourseStructure } from "./getCourseStructure.js";
import { registerGetDiscussion } from "./getDiscussion.js";
import { registerGetMe } from "./getMe.js";
import { registerGetSiteInfo } from "./getSiteInfo.js";
import { registerGetMyGrades } from "./getMyGrades.js";
import { registerGetRubric } from "./getRubric.js";
import { registerGetSubmissions } from "./getSubmissions.js";
import { registerAddGradeCategory, registerGetGradebookSetup, registerUpdateGradeItem } from "./gradebook.js";
import { registerGradeSubmission } from "./gradeSubmission.js";
import { registerListAssignments } from "./listAssignments.js";
import { registerListCourses } from "./listCourses.js";
import { registerListDiscussions } from "./listDiscussions.js";
import { registerListPending } from "./listPending.js";
import { registerLogin } from "./login.js";
import { registerLogout } from "./logout.js";
import { registerAnswerQuizQuestions, registerFinishQuizAttempt, registerGetAttemptReview, registerGetQuizAttempt, registerGetQuizInfo, registerStartQuizAttempt } from "./quizAttempts.js";
import { registerCreateQuestion, registerImportQuestions, registerListQuestionBanks, registerListQuestions } from "./questionBank.js";
import { registerAddQuestionsToQuiz, registerGetQuizStructure } from "./quizStructure.js";
import { registerServerInfo } from "./serverInfo.js";
import { registerShowBrowser } from "./showBrowser.js";
import { registerGetSurvey, registerSubmitSurvey } from "./surveys.js";
import type { RegisterTool } from "./types.js";

/** Every tool the server exposes, in the order clients list them. */
export const TOOLS: RegisterTool[] = [
  registerConfigure,
  registerLogin,
  registerLogout,
  registerGetMe,
  registerGetSiteInfo,
  registerListCourses,
  registerGetCourseStructure,
  registerGetActivityContent,
  registerListAssignments,
  registerGetSubmissions,
  registerListDiscussions,
  registerGetDiscussion,
  registerGetMyGrades,
  registerDownloadFile,
  registerGetSurvey,
  registerSubmitSurvey,
  registerListPending,
  registerGetActivitiesOverview,
  registerListDeadlines,
  registerGetCourseUpdates,
  registerGetQuizInfo,
  registerStartQuizAttempt,
  registerGetQuizAttempt,
  registerAnswerQuizQuestions,
  registerFinishQuizAttempt,
  registerGetAttemptReview,
  registerGetAssignment,
  registerSaveSubmission,
  registerSubmitAssignment,
  registerGetRubric,
  registerGradeSubmission,
  registerReplyToPost,
  registerCreateDiscussion,
  registerCreateActivity,
  registerUpdateActivity,
  registerGetActivitySettings,
  registerEditActivity,
  registerDuplicateActivity,
  registerDeleteActivity,
  registerAddSection,
  registerEditSection,
  registerDeleteSection,
  registerUpdateCourse,
  registerListQuestionBanks,
  registerListQuestions,
  registerImportQuestions,
  registerCreateQuestion,
  registerGetQuizStructure,
  registerAddQuestionsToQuiz,
  registerGetGradebookSetup,
  registerUpdateGradeItem,
  registerAddGradeCategory,
  registerListEvents,
  registerCreateEvent,
  registerDeleteEvent,
  registerShowBrowser,
  ...BROWSER_TOOLS,
  registerServerInfo,
];
