# list_courses and get_course_structure: progress and completion missing

Issue: [#14](https://github.com/falkenslab/moodle-mcp/issues/14)

## Problem

As the sandbox's teacher, `list_courses` gave no progress for courses 2 and 3, and `get_course_structure` no completion for course 3's activities, though their descriptions promise "the person's progress" and "the person's completion".

## Cause

Likely correct: Moodle tracks progress and completion for students, not for a teacher, and only where completion tracking is on. The schema says "when the course tracks it"; the descriptions don't.

## Solution

To check as the student (completion is on in course 3: `set_completion` worked on page 5). If the student gets them, the descriptions say they come only for those Moodle tracks (students, with completion on); if not, a bug in the driver (an issue there).

## Verification

As the student, progress in `list_courses` and completion in `get_course_structure` for course 3; the descriptions say when they're absent.
