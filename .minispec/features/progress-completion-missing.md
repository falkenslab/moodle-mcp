# list_courses and get_course_structure: progress and completion missing

Issue: [#14](https://github.com/falkenslab/moodle-mcp/issues/14)

## Problem

As the sandbox's teacher, `list_courses` gave no progress for courses 2 and 3, and `get_course_structure` no completion for course 3's activities, though their descriptions promise "the person's progress" and "the person's completion".

## Cause

Correct behavior, checked on 12 October 2026: as the student, progress 50 for course 3 (none for course 2, which doesn't track completion) and completion on course 3's two activities that track it; as the teacher, neither, since Moodle tracks students. The schema says "when the course tracks it"; the descriptions don't.

## Solution

`list_courses` and `get_course_structure`'s descriptions say progress and completion come only where Moodle tracks them: for students, in courses and activities with completion on.

## Verification

As the student, progress in `list_courses` and completion in `get_course_structure` for course 3; the descriptions say when they're absent.
