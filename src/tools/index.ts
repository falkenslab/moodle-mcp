import { registerGrantExtension, registerOverrideCompletion, registerSetDiscussionState, registerSetQuizOverride } from "./actOnParticipants.js";
import { registerCreateActivity, registerUpdateActivity } from "./activityForms.js";
import { registerCreateEvent, registerDeleteEvent, registerGetEvent, registerListEvents, registerUpdateEvent } from "./calendar.js";
import { registerGetAssignment, registerSaveSubmission, registerSubmitAssignment } from "./assignSubmission.js";
import { BROWSER_TOOLS } from "./browserTools.js";
import { registerConfigure } from "./configure.js";
import { registerGetCompletionReport, registerGetGraderReport, registerGetQuizResults, registerListGroups, registerListParticipants } from "./courseParticipants.js";
import { registerGetActivitiesOverview, registerGetCourseUpdates, registerListDeadlines } from "./courseOverview.js";
import { registerGetActivitySettings, registerUpdateCourse } from "./courseSettings.js";
import { registerAddSection, registerDeleteActivity, registerDeleteSection, registerDuplicateActivity, registerEditActivity, registerEditSection } from "./courseLayout.js";
import { registerDownloadFile } from "./downloadFile.js";
import { registerCreateDiscussion, registerDeletePost, registerEditPost, registerReplyToPost, registerSetDiscussionSubscription } from "./forumPosts.js";
import { registerGetActivityContent } from "./getActivityContent.js";
import { registerGetCourseStructure } from "./getCourseStructure.js";
import { registerGetDiscussion } from "./getDiscussion.js";
import { registerGetMe } from "./getMe.js";
import { registerGetSiteInfo } from "./getSiteInfo.js";
import { registerGetMyGrades } from "./getMyGrades.js";
import { registerGetRubric } from "./getRubric.js";
import { registerGetSubmissions } from "./getSubmissions.js";
import { registerAddGradeCategory, registerAddGradeItem, registerDeleteGradeCategory, registerDeleteGradeItem, registerGetGradebookSetup, registerUpdateGradeCategory, registerUpdateGradeItem } from "./gradebook.js";
import { registerGradeSubmission } from "./gradeSubmission.js";
import { registerListAssignments } from "./listAssignments.js";
import { registerListCourses } from "./listCourses.js";
import { registerListDiscussions } from "./listDiscussions.js";
import { registerListPending } from "./listPending.js";
import { registerLogin } from "./login.js";
import { registerLogout } from "./logout.js";
import { registerGetConversation, registerListConversations, registerListNotifications, registerMarkNotificationsRead, registerMessageParticipants, registerSendMessage } from "./messaging.js";
import { registerAnswerQuizQuestions, registerFinishQuizAttempt, registerGetAttemptReview, registerGetQuizAttempt, registerGetQuizInfo, registerStartQuizAttempt } from "./quizAttempts.js";
import { registerCreateQuestion, registerDeleteQuestions, registerImportQuestions, registerListQuestionBanks, registerListQuestions, registerSetQuestionStatus, registerUpdateQuestion } from "./questionBank.js";
import { registerAddQuestionsToQuiz, registerAddQuizSection, registerEditQuizSlot, registerGetQuizStructure, registerRemoveQuizSlot, registerSetQuizPages } from "./quizStructure.js";
import { registerGetScorm, registerOpenScorm } from "./scorm.js";
import { registerServerInfo } from "./serverInfo.js";
import { registerAddSite, registerListSites, registerRemoveSite, registerUseSite } from "./sites.js";
import { registerCopyBetweenSites } from "./siteTransfer.js";
import { registerShowBrowser } from "./showBrowser.js";
import { registerAnswerChoice, registerAnswerLessonPage, registerGetChoice, registerGetH5PActivity, registerGetLessonPage, registerSetCompletion } from "./studentActivities.js";
import { registerGetSurvey, registerSubmitSurvey } from "./surveys.js";
import { registerBackupCourse, registerCopyCourse, registerImportActivities, registerResetCourse, registerRestoreCourse } from "./courseLifecycle.js";
import { registerListEnrolmentMethods, registerSetEnrolmentMethod } from "./enrolmentMethods.js";
import { registerEnrolUsers, registerListPotentialUsers, registerSetGroupMembers, registerSetUserRoles, registerUnenrolUser } from "./enrolments.js";
import { registerAllocateMarker, registerExportGrades, registerGetForumGrades, registerGradeForumUser, registerGradeQuizQuestion, registerListQuestionsToGrade, registerRate, registerSetGrade, registerSetWorkflowState } from "./gradingWork.js";
import { registerCreateGroup, registerCreateGrouping, registerDeleteGroup, registerDeleteGrouping, registerListGroupings, registerSetGroupingGroups, registerUpdateGroup } from "./groups.js";
import { registerGetActivityReport, registerGetCourseLogs, registerGetParticipationReport } from "./reports.js";
import { registerAssessWorkshopSubmission, registerGetWorkshop, registerSetWorkshopPhase } from "./workshops.js";
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
  registerListParticipants,
  registerListGroups,
  registerListPotentialUsers,
  registerEnrolUsers,
  registerUnenrolUser,
  registerSetUserRoles,
  registerSetGroupMembers,
  registerCreateGroup,
  registerUpdateGroup,
  registerDeleteGroup,
  registerListGroupings,
  registerCreateGrouping,
  registerDeleteGrouping,
  registerSetGroupingGroups,
  registerListEnrolmentMethods,
  registerSetEnrolmentMethod,
  registerGetGraderReport,
  registerGetCompletionReport,
  registerGetActivityReport,
  registerGetParticipationReport,
  registerGetCourseLogs,
  registerSetGrade,
  registerExportGrades,
  registerOverrideCompletion,
  registerListAssignments,
  registerGetSubmissions,
  registerListDiscussions,
  registerGetDiscussion,
  registerGetMyGrades,
  registerDownloadFile,
  registerGetSurvey,
  registerSubmitSurvey,
  registerGetChoice,
  registerAnswerChoice,
  registerGetLessonPage,
  registerAnswerLessonPage,
  registerGetH5PActivity,
  registerGetScorm,
  registerOpenScorm,
  registerSetCompletion,
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
  registerGetQuizResults,
  registerSetQuizOverride,
  registerListQuestionsToGrade,
  registerGradeQuizQuestion,
  registerGetAssignment,
  registerSaveSubmission,
  registerSubmitAssignment,
  registerGetRubric,
  registerGradeSubmission,
  registerGrantExtension,
  registerSetWorkflowState,
  registerAllocateMarker,
  registerReplyToPost,
  registerCreateDiscussion,
  registerSetDiscussionState,
  registerSetDiscussionSubscription,
  registerEditPost,
  registerDeletePost,
  registerGetForumGrades,
  registerGradeForumUser,
  registerRate,
  registerGetWorkshop,
  registerSetWorkshopPhase,
  registerAssessWorkshopSubmission,
  registerListNotifications,
  registerMarkNotificationsRead,
  registerListConversations,
  registerGetConversation,
  registerSendMessage,
  registerMessageParticipants,
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
  registerCopyCourse,
  registerBackupCourse,
  registerRestoreCourse,
  registerImportActivities,
  registerResetCourse,
  registerListQuestionBanks,
  registerListQuestions,
  registerImportQuestions,
  registerCreateQuestion,
  registerUpdateQuestion,
  registerDeleteQuestions,
  registerSetQuestionStatus,
  registerGetQuizStructure,
  registerAddQuestionsToQuiz,
  registerEditQuizSlot,
  registerRemoveQuizSlot,
  registerSetQuizPages,
  registerAddQuizSection,
  registerGetGradebookSetup,
  registerUpdateGradeItem,
  registerAddGradeCategory,
  registerAddGradeItem,
  registerUpdateGradeCategory,
  registerDeleteGradeCategory,
  registerDeleteGradeItem,
  registerListEvents,
  registerCreateEvent,
  registerDeleteEvent,
  registerGetEvent,
  registerUpdateEvent,
  registerShowBrowser,
  ...BROWSER_TOOLS,
  registerServerInfo,
  registerListSites,
  registerAddSite,
  registerUseSite,
  registerRemoveSite,
  registerCopyBetweenSites,
];
