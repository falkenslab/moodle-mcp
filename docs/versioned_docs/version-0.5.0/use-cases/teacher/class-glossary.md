---
title: The class glossary
sidebar_label: The class glossary
---

# The class glossary

**Codex** · as a teacher · default settings

Your students define the unit's words in a glossary that waits for your approval. The agent checks each pending definition, tells you which are right and what's wrong in the others, and approves only what you say.

## What you ask

> In the glossary "Glosario de la clase" of my course mcp-content, which entries are waiting for my approval? Check each definition: tell me which are right and what is wrong in the others. Don't approve anything yet.

Then:

> Approve the right ones, and leave the wrong one waiting.

## The session

<Screenshot app="Codex" session="class-glossary" alt="Codex reviews three pending glossary entries, then approves the two right ones" />

What the agent did:

1. **Found the course and the glossary** (`list_courses`, `get_course_structure`).
2. **Read the entries waiting for approval** (`list_glossary_entries`): "Iteración", "Contador" and "Bucle infinito".
3. **Checked each definition**: two right, with a note that a counter can also go down; "Bucle infinito" wrong, since it said the loop runs once, and explained what an infinite loop is. It approved nothing.
4. **Approved the two right ones** when you said so (`set_glossary_entry_approved`), and checked that "Bucle infinito" was still the only one waiting.

## The result in Moodle

<Screenshot app="Moodle" src="/img/moodle/glossary.png" alt="The glossary in Moodle with the two approved entries, and one still pending approval" />

## Tips

- **Who wrote what stays private.** The agent sees the students as aliases; the definitions themselves reach it, as they're the work to check.
- **Fill it in too**: "Add the five key words of unit 2, with a short definition each" adds them; "Export the glossary" gives a file to reuse in another course.
