// The driver as the tools use it (ADR-011): its exports, with each function that has a page
// (`FOLLOWED_PAGES`) recording its call, so the server can tell the page that shows a tool's work.
// Tools import the driver from here only (the lint rule in eslint.config.js); the rest of the server
// imports it directly, so what it calls on a tool's behalf (aliases, the site) records nothing.
import { AsyncLocalStorage } from "node:async_hooks";
import * as moodle from "@falkenslab/moodle-driver";
import { FOLLOWED_PAGES } from "@falkenslab/moodle-driver";

export * from "@falkenslab/moodle-driver";

/** A driver function called during a tool call: its name, its arguments after the context and the site, what it returned. */
export interface DriverCall {
  name: keyof typeof FOLLOWED_PAGES;
  args: unknown[];
  result: unknown;
}

const calls = new AsyncLocalStorage<DriverCall[]>();

/** Runs `work` (a tool call) and gives what it returned with the driver calls it made, in order. */
export async function recordingCalls<T>(work: () => Promise<T>): Promise<{ value: T; calls: DriverCall[] }> {
  const made: DriverCall[] = [];
  const value = await calls.run(made, work);
  return { value, calls: made };
}

/** The page, relative to the site, that shows a call's result; undefined when it has none or can't be told. */
export function pageOf({ name, args, result }: DriverCall): string | undefined {
  const page = FOLLOWED_PAGES[name] as ((args: unknown[], result: unknown) => string | undefined) | undefined;
  try {
    return page?.(args, result);
  } catch {
    // An argument or a result not as the map expects: no page, the call stands.
    return undefined;
  }
}

function recorded<F extends (...args: never[]) => Promise<unknown>>(name: keyof typeof FOLLOWED_PAGES, fn: F): F {
  return (async (...args: Parameters<F>) => {
    const result = await fn(...args);
    calls.getStore()?.push({ name, args: args.slice(2), result });
    return result;
  }) as F;
}

export const activitiesOverview = recorded("activitiesOverview", moodle.activitiesOverview);
export const activityContent = recorded("activityContent", moodle.activityContent);
export const activityReport = recorded("activityReport", moodle.activityReport);
export const activitySettings = recorded("activitySettings", moodle.activitySettings);
export const addBlock = recorded("addBlock", moodle.addBlock);
export const addBookChapter = recorded("addBookChapter", moodle.addBookChapter);
export const addCourseCompetency = recorded("addCourseCompetency", moodle.addCourseCompetency);
export const addDatabaseEntry = recorded("addDatabaseEntry", moodle.addDatabaseEntry);
export const addDatabaseField = recorded("addDatabaseField", moodle.addDatabaseField);
export const addExternalTool = recorded("addExternalTool", moodle.addExternalTool);
export const addFeedbackItem = recorded("addFeedbackItem", moodle.addFeedbackItem);
export const addGlossaryCategory = recorded("addGlossaryCategory", moodle.addGlossaryCategory);
export const addGlossaryEntry = recorded("addGlossaryEntry", moodle.addGlossaryEntry);
export const addGradeCategory = recorded("addGradeCategory", moodle.addGradeCategory);
export const addGradeItem = recorded("addGradeItem", moodle.addGradeItem);
export const addLessonPage = recorded("addLessonPage", moodle.addLessonPage);
export const addNote = recorded("addNote", moodle.addNote);
export const addQuestionsToQuiz = recorded("addQuestionsToQuiz", moodle.addQuestionsToQuiz);
export const addQuizSection = recorded("addQuizSection", moodle.addQuizSection);
export const addScale = recorded("addScale", moodle.addScale);
export const addSection = recorded("addSection", moodle.addSection);
export const addWorkshopExample = recorded("addWorkshopExample", moodle.addWorkshopExample);
export const allocateMarker = recorded("allocateMarker", moodle.allocateMarker);
export const allocateRandomly = recorded("allocateRandomly", moodle.allocateRandomly);
export const allocateReviewer = recorded("allocateReviewer", moodle.allocateReviewer);
export const answerChoice = recorded("answerChoice", moodle.answerChoice);
export const answerLessonPage = recorded("answerLessonPage", moodle.answerLessonPage);
export const answerQuizQuestions = recorded("answerQuizQuestions", moodle.answerQuizQuestions);
export const applyDatabasePreset = recorded("applyDatabasePreset", moodle.applyDatabasePreset);
export const assessWorkshopExample = recorded("assessWorkshopExample", moodle.assessWorkshopExample);
export const assessWorkshopSubmission = recorded("assessWorkshopSubmission", moodle.assessWorkshopSubmission);
export const assignmentSubmissions = recorded("assignmentSubmissions", moodle.assignmentSubmissions);
export const autoCreateGroups = recorded("autoCreateGroups", moodle.autoCreateGroups);
export const awardBadge = recorded("awardBadge", moodle.awardBadge);
export const bigBlueButton = recorded("bigBlueButton", moodle.bigBlueButton);
export const bigBlueButtonJoinUrl = recorded("bigBlueButtonJoinUrl", moodle.bigBlueButtonJoinUrl);
export const bookChapters = recorded("bookChapters", moodle.bookChapters);
export const calculateWorkshopGrades = recorded("calculateWorkshopGrades", moodle.calculateWorkshopGrades);
export const calendarEvent = recorded("calendarEvent", moodle.calendarEvent);
export const choiceResults = recorded("choiceResults", moodle.choiceResults);
export const competencyFrameworks = recorded("competencyFrameworks", moodle.competencyFrameworks);
export const competencyRating = recorded("competencyRating", moodle.competencyRating);
export const completionReport = recorded("completionReport", moodle.completionReport);
export const configureBlock = recorded("configureBlock", moodle.configureBlock);
export const contentBank = recorded("contentBank", moodle.contentBank);
export const conversation = recorded("conversation", moodle.conversation);
export const conversations = recorded("conversations", moodle.conversations);
export const copyCourse = recorded("copyCourse", moodle.copyCourse);
export const courseBadges = recorded("courseBadges", moodle.courseBadges);
export const courseBlocks = recorded("courseBlocks", moodle.courseBlocks);
export const courseCompetencies = recorded("courseCompetencies", moodle.courseCompetencies);
export const courseCompletionCriteria = recorded("courseCompletionCriteria", moodle.courseCompletionCriteria);
export const courseCompletionStatus = recorded("courseCompletionStatus", moodle.courseCompletionStatus);
export const courseLogs = recorded("courseLogs", moodle.courseLogs);
export const courseRoles = recorded("courseRoles", moodle.courseRoles);
export const courseScales = recorded("courseScales", moodle.courseScales);
export const courseStructure = recorded("courseStructure", moodle.courseStructure);
export const courseUpdates = recorded("courseUpdates", moodle.courseUpdates);
export const createActivity = recorded("createActivity", moodle.createActivity);
export const createBadge = recorded("createBadge", moodle.createBadge);
export const createEvent = recorded("createEvent", moodle.createEvent);
export const createGroup = recorded("createGroup", moodle.createGroup);
export const createGrouping = recorded("createGrouping", moodle.createGrouping);
export const createQuestion = recorded("createQuestion", moodle.createQuestion);
export const createWikiPage = recorded("createWikiPage", moodle.createWikiPage);
export const databaseEntries = recorded("databaseEntries", moodle.databaseEntries);
export const databaseFields = recorded("databaseFields", moodle.databaseFields);
export const databasePresets = recorded("databasePresets", moodle.databasePresets);
export const databaseTemplates = recorded("databaseTemplates", moodle.databaseTemplates);
export const deadlines = recorded("deadlines", moodle.deadlines);
export const deleteActivity = recorded("deleteActivity", moodle.deleteActivity);
export const deleteBlock = recorded("deleteBlock", moodle.deleteBlock);
export const deleteBookChapter = recorded("deleteBookChapter", moodle.deleteBookChapter);
export const deleteDatabaseEntry = recorded("deleteDatabaseEntry", moodle.deleteDatabaseEntry);
export const deleteDatabaseField = recorded("deleteDatabaseField", moodle.deleteDatabaseField);
export const deleteEvent = recorded("deleteEvent", moodle.deleteEvent);
export const deleteExternalTool = recorded("deleteExternalTool", moodle.deleteExternalTool);
export const deleteFeedbackItem = recorded("deleteFeedbackItem", moodle.deleteFeedbackItem);
export const deleteFeedbackTemplate = recorded("deleteFeedbackTemplate", moodle.deleteFeedbackTemplate);
export const deleteGlossaryEntry = recorded("deleteGlossaryEntry", moodle.deleteGlossaryEntry);
export const deleteGradeCategory = recorded("deleteGradeCategory", moodle.deleteGradeCategory);
export const deleteGradeItem = recorded("deleteGradeItem", moodle.deleteGradeItem);
export const deleteLessonPage = recorded("deleteLessonPage", moodle.deleteLessonPage);
export const deletePost = recorded("deletePost", moodle.deletePost);
export const deleteRecording = recorded("deleteRecording", moodle.deleteRecording);
export const deleteSection = recorded("deleteSection", moodle.deleteSection);
export const deleteWorkshopExample = recorded("deleteWorkshopExample", moodle.deleteWorkshopExample);
export const discussion = recorded("discussion", moodle.discussion);
export const duplicateActivity = recorded("duplicateActivity", moodle.duplicateActivity);
export const editActivity = recorded("editActivity", moodle.editActivity);
export const editBookChapter = recorded("editBookChapter", moodle.editBookChapter);
export const editDatabaseEntry = recorded("editDatabaseEntry", moodle.editDatabaseEntry);
export const editDatabaseField = recorded("editDatabaseField", moodle.editDatabaseField);
export const editFeedbackItem = recorded("editFeedbackItem", moodle.editFeedbackItem);
export const editGlossaryEntry = recorded("editGlossaryEntry", moodle.editGlossaryEntry);
export const editLessonPage = recorded("editLessonPage", moodle.editLessonPage);
export const editNote = recorded("editNote", moodle.editNote);
export const editQuizSlot = recorded("editQuizSlot", moodle.editQuizSlot);
export const editScale = recorded("editScale", moodle.editScale);
export const editSection = recorded("editSection", moodle.editSection);
export const editWikiPage = recorded("editWikiPage", moodle.editWikiPage);
export const editWorkshopExample = recorded("editWorkshopExample", moodle.editWorkshopExample);
export const enrolUsers = recorded("enrolUsers", moodle.enrolUsers);
export const enrolmentMethods = recorded("enrolmentMethods", moodle.enrolmentMethods);
export const externalToolLaunchUrl = recorded("externalToolLaunchUrl", moodle.externalToolLaunchUrl);
export const externalTools = recorded("externalTools", moodle.externalTools);
export const feedbackItems = recorded("feedbackItems", moodle.feedbackItems);
export const feedbackTemplates = recorded("feedbackTemplates", moodle.feedbackTemplates);
export const finishQuizAttempt = recorded("finishQuizAttempt", moodle.finishQuizAttempt);
export const forumDiscussions = recorded("forumDiscussions", moodle.forumDiscussions);
export const forumGrades = recorded("forumGrades", moodle.forumGrades);
export const getChoice = recorded("getChoice", moodle.getChoice);
export const getSurvey = recorded("getSurvey", moodle.getSurvey);
export const glossaryCategories = recorded("glossaryCategories", moodle.glossaryCategories);
export const glossaryEntries = recorded("glossaryEntries", moodle.glossaryEntries);
export const gradeForumUser = recorded("gradeForumUser", moodle.gradeForumUser);
export const gradeQuizQuestion = recorded("gradeQuizQuestion", moodle.gradeQuizQuestion);
export const gradeSubmission = recorded("gradeSubmission", moodle.gradeSubmission);
export const gradebookSetup = recorded("gradebookSetup", moodle.gradebookSetup);
export const graderReport = recorded("graderReport", moodle.graderReport);
export const grantExtension = recorded("grantExtension", moodle.grantExtension);
export const groupings = recorded("groupings", moodle.groupings);
export const groups = recorded("groups", moodle.groups);
export const h5pActivity = recorded("h5pActivity", moodle.h5pActivity);
export const importActivities = recorded("importActivities", moodle.importActivities);
export const importDatabaseEntries = recorded("importDatabaseEntries", moodle.importDatabaseEntries);
export const importGlossaryEntries = recorded("importGlossaryEntries", moodle.importGlossaryEntries);
export const importGrades = recorded("importGrades", moodle.importGrades);
export const importGroups = recorded("importGroups", moodle.importGroups);
export const importQuestions = recorded("importQuestions", moodle.importQuestions);
export const lessonPage = recorded("lessonPage", moodle.lessonPage);
export const lessonPages = recorded("lessonPages", moodle.lessonPages);
export const listAssignments = recorded("listAssignments", moodle.listAssignments);
export const listCourses = recorded("listCourses", moodle.listCourses);
export const markCourseComplete = recorded("markCourseComplete", moodle.markCourseComplete);
export const markNotificationsRead = recorded("markNotificationsRead", moodle.markNotificationsRead);
export const messageParticipants = recorded("messageParticipants", moodle.messageParticipants);
export const moveBlock = recorded("moveBlock", moodle.moveBlock);
export const moveBookChapter = recorded("moveBookChapter", moodle.moveBookChapter);
export const moveFeedbackItem = recorded("moveFeedbackItem", moodle.moveFeedbackItem);
export const moveLessonPage = recorded("moveLessonPage", moodle.moveLessonPage);
export const myGrades = recorded("myGrades", moodle.myGrades);
export const notes = recorded("notes", moodle.notes);
export const notifications = recorded("notifications", moodle.notifications);
export const overrideWorkshopGrade = recorded("overrideWorkshopGrade", moodle.overrideWorkshopGrade);
export const participantFilters = recorded("participantFilters", moodle.participantFilters);
export const participants = recorded("participants", moodle.participants);
export const participationReport = recorded("participationReport", moodle.participationReport);
export const pendingActivities = recorded("pendingActivities", moodle.pendingActivities);
export const questionBanks = recorded("questionBanks", moodle.questionBanks);
export const questionsToGrade = recorded("questionsToGrade", moodle.questionsToGrade);
export const quizInfo = recorded("quizInfo", moodle.quizInfo);
export const quizResults = recorded("quizResults", moodle.quizResults);
export const quizStatistics = recorded("quizStatistics", moodle.quizStatistics);
export const quizStructure = recorded("quizStructure", moodle.quizStructure);
export const rate = recorded("rate", moodle.rate);
export const rateCompetency = recorded("rateCompetency", moodle.rateCompetency);
export const readAttempt = recorded("readAttempt", moodle.readAttempt);
export const readReview = recorded("readReview", moodle.readReview);
export const removeCourseCompetency = recorded("removeCourseCompetency", moodle.removeCourseCompetency);
export const removeQuizSlot = recorded("removeQuizSlot", moodle.removeQuizSlot);
export const removeReviewer = recorded("removeReviewer", moodle.removeReviewer);
export const renameContent = recorded("renameContent", moodle.renameContent);
export const replyToPost = recorded("replyToPost", moodle.replyToPost);
export const resetCourse = recorded("resetCourse", moodle.resetCourse);
export const restoreCourse = recorded("restoreCourse", moodle.restoreCourse);
export const rubric = recorded("rubric", moodle.rubric);
export const saveFeedbackTemplate = recorded("saveFeedbackTemplate", moodle.saveFeedbackTemplate);
export const saveSubmission = recorded("saveSubmission", moodle.saveSubmission);
export const saveWorkshopSubmission = recorded("saveWorkshopSubmission", moodle.saveWorkshopSubmission);
export const scheduleAllocation = recorded("scheduleAllocation", moodle.scheduleAllocation);
export const scorm = recorded("scorm", moodle.scorm);
export const sendMessage = recorded("sendMessage", moodle.sendMessage);
export const setBadgeCriteria = recorded("setBadgeCriteria", moodle.setBadgeCriteria);
export const setBadgeEnabled = recorded("setBadgeEnabled", moodle.setBadgeEnabled);
export const setBookChapterVisible = recorded("setBookChapterVisible", moodle.setBookChapterVisible);
export const setCourseCompletionCriteria = recorded("setCourseCompletionCriteria", moodle.setCourseCompletionCriteria);
export const setDatabaseEntryApproved = recorded("setDatabaseEntryApproved", moodle.setDatabaseEntryApproved);
export const setDatabaseTemplate = recorded("setDatabaseTemplate", moodle.setDatabaseTemplate);
export const setDiscussionState = recorded("setDiscussionState", moodle.setDiscussionState);
export const setDiscussionSubscription = recorded("setDiscussionSubscription", moodle.setDiscussionSubscription);
export const setEnrolmentMethod = recorded("setEnrolmentMethod", moodle.setEnrolmentMethod);
export const setExternalToolInChooser = recorded("setExternalToolInChooser", moodle.setExternalToolInChooser);
export const setGlossaryEntryApproved = recorded("setGlossaryEntryApproved", moodle.setGlossaryEntryApproved);
export const setGrade = recorded("setGrade", moodle.setGrade);
export const setGradingDefinition = recorded("setGradingDefinition", moodle.setGradingDefinition);
export const setGroupMembers = recorded("setGroupMembers", moodle.setGroupMembers);
export const setGroupingGroups = recorded("setGroupingGroups", moodle.setGroupingGroups);
export const setQuizOverride = recorded("setQuizOverride", moodle.setQuizOverride);
export const setQuizPages = recorded("setQuizPages", moodle.setQuizPages);
export const setRecordingPublished = recorded("setRecordingPublished", moodle.setRecordingPublished);
export const setUserRoles = recorded("setUserRoles", moodle.setUserRoles);
export const setWorkflowState = recorded("setWorkflowState", moodle.setWorkflowState);
export const setWorkshopPhase = recorded("setWorkshopPhase", moodle.setWorkshopPhase);
export const startDiscussion = recorded("startDiscussion", moodle.startDiscussion);
export const startQuizAttempt = recorded("startQuizAttempt", moodle.startQuizAttempt);
export const studentAssignment = recorded("studentAssignment", moodle.studentAssignment);
export const submitForGrading = recorded("submitForGrading", moodle.submitForGrading);
export const submitSurvey = recorded("submitSurvey", moodle.submitSurvey);
export const surveyResults = recorded("surveyResults", moodle.surveyResults);
export const unenrolUser = recorded("unenrolUser", moodle.unenrolUser);
export const upcomingEvents = recorded("upcomingEvents", moodle.upcomingEvents);
export const updateActivity = recorded("updateActivity", moodle.updateActivity);
export const updateCourse = recorded("updateCourse", moodle.updateCourse);
export const updateEvent = recorded("updateEvent", moodle.updateEvent);
export const updateGradeCategory = recorded("updateGradeCategory", moodle.updateGradeCategory);
export const updateGradeItem = recorded("updateGradeItem", moodle.updateGradeItem);
export const updateQuestion = recorded("updateQuestion", moodle.updateQuestion);
export const uploadToContentBank = recorded("uploadToContentBank", moodle.uploadToContentBank);
export const useFeedbackTemplate = recorded("useFeedbackTemplate", moodle.useFeedbackTemplate);
export const userById = recorded("userById", moodle.userById);
export const whoAmI = recorded("whoAmI", moodle.whoAmI);
export const wikiPage = recorded("wikiPage", moodle.wikiPage);
export const wikiPages = recorded("wikiPages", moodle.wikiPages);
export const workshopAllocation = recorded("workshopAllocation", moodle.workshopAllocation);
export const workshopExamples = recorded("workshopExamples", moodle.workshopExamples);
export const workshopInfo = recorded("workshopInfo", moodle.workshopInfo);
export const workshopSubmission = recorded("workshopSubmission", moodle.workshopSubmission);
