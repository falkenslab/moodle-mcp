# delete_activity's question names data the activity can't have

Issue: [#62](https://github.com/falkenslab/moodle-mcp/issues/62)

## Problem

Deleting a page, the question said it would delete "everything participants did in it (submissions, attempts, posts, grades)". A page has none of those: the warning reads alarming and generic, and a teacher may refuse a harmless clean-up or stop reading these questions.

## Cause

`CONFIRMED.delete_activity` (`src/tools/confirm.ts`) words the question from the tool's arguments only, `courseId` and `activityId`, which don't say the activity's type nor what it holds.

## Solution

Word the question from the activity: its name and type, read before asking (the course structure, through the driver, as other tools do), and what that type keeps from participants. A resource (page, file, folder, URL, label, book) says it deletes the resource and its content; an activity that holds work says which (submissions, attempts, posts) and how many, where an existing read gives them cheaply, else without a number. In English and Spanish. A rule's `what` may need to become asynchronous for that read.

## Verification

A test of the question for a page and for an assignment, in both languages, against the fake Moodle; on the sandbox's course 3, the question for a page and for an assignment with a submission.
