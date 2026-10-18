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
import { registerGetRubric, registerSetRubric } from "./getRubric.js";
import { registerValidateGift, registerValidateHtml } from "./validate.js";
import { registerAnonymizeBackup, registerReadBackup } from "./backupFiles.js";
import { registerAddBlock, registerConfigureBlock, registerDeleteBlock, registerListCourseBlocks, registerMoveBlock } from "./blocks.js";
import { registerDeleteContent, registerDownloadContent, registerListContentBank, registerRenameContent, registerUploadToContentBank } from "./contentBank.js";
import { registerDeleteRecording, registerGetBigBlueButton, registerGetBigBlueButtonJoinUrl, registerSetRecordingPublished } from "./bigBlueButton.js";
import { registerAddNote, registerDeleteNote, registerEditNote, registerListNotes } from "./notes.js";
import { registerAddCourseCompetency, registerGetCompetencyRating, registerListCompetencyFrameworks, registerListCourseCompetencies, registerRateCompetency, registerRemoveCourseCompetency, registerSetActivityCompetencies } from "./competencies.js";
import { registerAddExternalTool, registerDeleteExternalTool, registerGetExternalToolLaunchUrl, registerListExternalTools, registerSetExternalToolInChooser } from "./externalTools.js";
import { registerCreateWikiPage, registerEditWikiPage, registerGetWikiPage, registerListWikiPages } from "./wikis.js";
import { registerAddScale, registerEditScale, registerGetGradeLetters, registerImportGrades, registerListScales, registerSetGradeLetters } from "./gradeImport.js";
import { registerAutoCreateGroups, registerImportGroups } from "./autoGroups.js";
import { registerAddFeedbackItem, registerDeleteFeedbackItem, registerDeleteFeedbackTemplate, registerEditFeedbackItem, registerGetFeedbackItems, registerListFeedbackTemplates, registerMoveFeedbackItem, registerSaveFeedbackTemplate, registerUseFeedbackTemplate } from "./feedbackItems.js";
import { registerGetQuizStatistics } from "./quizStatistics.js";
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
import { registerAddWorkshopExample, registerAssessWorkshopExample, registerAssessWorkshopSubmission, registerCalculateWorkshopGrades, registerDeleteWorkshopExample, registerEditWorkshopExample, registerGetWorkshop, registerGetWorkshopSubmission, registerListWorkshopExamples, registerOverrideWorkshopGrade, registerSaveWorkshopSubmission, registerSetWorkshopPhase } from "./workshops.js";
import { registerAddGlossaryCategory, registerAddGlossaryEntry, registerDeleteGlossaryEntry, registerEditGlossaryEntry, registerExportGlossary, registerImportGlossary, registerListGlossaryCategories, registerListGlossaryEntries, registerSetGlossaryEntryApproved } from "./glossaries.js";
import { registerAddDatabaseEntry, registerDeleteDatabaseEntry, registerEditDatabaseEntry, registerExportDatabaseEntries, registerImportDatabaseEntries, registerListDatabaseEntries, registerSetDatabaseEntryApproved } from "./databaseEntries.js";
import { registerGetChoiceResults, registerGetSurveyResults } from "./surveyResults.js";
import { registerGetCourseCompletionCriteria, registerGetCourseCompletionStatus, registerMarkCourseComplete, registerSetCourseCompletionCriteria } from "./courseCompletion.js";
import { registerAddQuestionCategory, registerDeleteQuestionCategory, registerEditQuestionCategory, registerExportQuestions, registerListQuestionCategories, registerMoveQuestions } from "./questionCategories.js";
import { registerAllocateWorkshopRandomly, registerAllocateWorkshopReviewer, registerGetWorkshopAllocation, registerRemoveWorkshopReviewer, registerScheduleWorkshopAllocation } from "./workshopAllocation.js";
import { registerAddBookChapter, registerDeleteBookChapter, registerEditBookChapter, registerListBookChapters, registerMoveBookChapter, registerSetBookChapterVisibility } from "./books.js";
import { registerAddLessonPage, registerDeleteLessonPage, registerEditLessonPage, registerGetLessonPages, registerMoveLessonPage } from "./lessonPages.js";
import { registerAddDatabaseField, registerApplyDatabasePreset, registerDeleteDatabaseField, registerEditDatabaseField, registerGetDatabaseFields, registerGetDatabaseTemplates, registerListDatabasePresets, registerSetDatabaseTemplate } from "./databases.js";
import { registerAwardBadge, registerCreateBadge, registerListBadges, registerSetBadgeCriteria, registerSetBadgeEnabled } from "./badges.js";
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
  registerAutoCreateGroups,
  registerImportGroups,
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
  registerGetCourseCompletionCriteria,
  registerSetCourseCompletionCriteria,
  registerGetCourseCompletionStatus,
  registerMarkCourseComplete,
  registerGetChoiceResults,
  registerGetSurveyResults,
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
  registerGetQuizStatistics,
  registerSetQuizOverride,
  registerListQuestionsToGrade,
  registerGradeQuizQuestion,
  registerGetAssignment,
  registerSaveSubmission,
  registerSubmitAssignment,
  registerGetRubric,
  registerSetRubric,
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
  registerGetWorkshopSubmission,
  registerSaveWorkshopSubmission,
  registerListWorkshopExamples,
  registerAddWorkshopExample,
  registerEditWorkshopExample,
  registerDeleteWorkshopExample,
  registerAssessWorkshopExample,
  registerCalculateWorkshopGrades,
  registerOverrideWorkshopGrade,
  registerGetWorkshopAllocation,
  registerAllocateWorkshopReviewer,
  registerRemoveWorkshopReviewer,
  registerAllocateWorkshopRandomly,
  registerScheduleWorkshopAllocation,
  registerListNotifications,
  registerMarkNotificationsRead,
  registerListConversations,
  registerGetConversation,
  registerSendMessage,
  registerMessageParticipants,
  registerCreateActivity,
  registerUpdateActivity,
  registerValidateHtml,
  registerGetActivitySettings,
  registerEditActivity,
  registerDuplicateActivity,
  registerDeleteActivity,
  registerListBookChapters,
  registerAddBookChapter,
  registerEditBookChapter,
  registerMoveBookChapter,
  registerSetBookChapterVisibility,
  registerDeleteBookChapter,
  registerGetLessonPages,
  registerAddLessonPage,
  registerEditLessonPage,
  registerMoveLessonPage,
  registerDeleteLessonPage,
  registerGetDatabaseFields,
  registerAddDatabaseField,
  registerEditDatabaseField,
  registerDeleteDatabaseField,
  registerGetDatabaseTemplates,
  registerSetDatabaseTemplate,
  registerListDatabasePresets,
  registerApplyDatabasePreset,
  registerListDatabaseEntries,
  registerAddDatabaseEntry,
  registerEditDatabaseEntry,
  registerDeleteDatabaseEntry,
  registerSetDatabaseEntryApproved,
  registerExportDatabaseEntries,
  registerImportDatabaseEntries,
  registerListGlossaryEntries,
  registerAddGlossaryEntry,
  registerEditGlossaryEntry,
  registerDeleteGlossaryEntry,
  registerSetGlossaryEntryApproved,
  registerListGlossaryCategories,
  registerAddGlossaryCategory,
  registerExportGlossary,
  registerImportGlossary,
  registerListWikiPages,
  registerGetWikiPage,
  registerCreateWikiPage,
  registerEditWikiPage,
  registerGetFeedbackItems,
  registerAddFeedbackItem,
  registerEditFeedbackItem,
  registerMoveFeedbackItem,
  registerDeleteFeedbackItem,
  registerListFeedbackTemplates,
  registerUseFeedbackTemplate,
  registerSaveFeedbackTemplate,
  registerDeleteFeedbackTemplate,
  registerListBadges,
  registerCreateBadge,
  registerSetBadgeCriteria,
  registerSetBadgeEnabled,
  registerAwardBadge,
  registerListCourseBlocks,
  registerAddBlock,
  registerConfigureBlock,
  registerMoveBlock,
  registerDeleteBlock,
  registerListContentBank,
  registerUploadToContentBank,
  registerRenameContent,
  registerDownloadContent,
  registerDeleteContent,
  registerGetBigBlueButton,
  registerGetBigBlueButtonJoinUrl,
  registerSetRecordingPublished,
  registerDeleteRecording,
  registerListNotes,
  registerAddNote,
  registerEditNote,
  registerDeleteNote,
  registerListCompetencyFrameworks,
  registerListCourseCompetencies,
  registerAddCourseCompetency,
  registerRemoveCourseCompetency,
  registerSetActivityCompetencies,
  registerGetCompetencyRating,
  registerRateCompetency,
  registerListExternalTools,
  registerAddExternalTool,
  registerSetExternalToolInChooser,
  registerDeleteExternalTool,
  registerGetExternalToolLaunchUrl,
  registerAddSection,
  registerEditSection,
  registerDeleteSection,
  registerUpdateCourse,
  registerCopyCourse,
  registerBackupCourse,
  registerRestoreCourse,
  registerReadBackup,
  registerAnonymizeBackup,
  registerImportActivities,
  registerResetCourse,
  registerListQuestionBanks,
  registerListQuestions,
  registerValidateGift,
  registerImportQuestions,
  registerCreateQuestion,
  registerUpdateQuestion,
  registerDeleteQuestions,
  registerSetQuestionStatus,
  registerListQuestionCategories,
  registerAddQuestionCategory,
  registerEditQuestionCategory,
  registerDeleteQuestionCategory,
  registerMoveQuestions,
  registerExportQuestions,
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
  registerImportGrades,
  registerListScales,
  registerAddScale,
  registerEditScale,
  registerGetGradeLetters,
  registerSetGradeLetters,
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
