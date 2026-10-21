---
title: Calificar con una rúbrica
sidebar_label: Calificar con una rúbrica
---

# Calificar con una rúbrica

**Claude Code** · como docente · ajustes por defecto

El agente encuentra las entregas que faltan por calificar, las lee y propone una nota con la propia rúbrica de la tarea. No guarda nada hasta que tú lo digas.

## Lo que pides

> En mi curso de Moodle mcp-content, ¿qué entregas de la tarea "Tarea MCP" faltan por calificar? Léelas y propón una nota con la rúbrica de la tarea, con un comentario breve. No guardes nada todavía.

Después, una vez leída la propuesta:

> De acuerdo. Guarda esa nota y el comentario, sin notificar al alumno.

## La sesión

<Screenshot app="Claude Code" session="grading" alt="Claude Code encuentra una entrega por calificar, la lee, propone un 4/4 con la rúbrica y la guarda tras la confirmación" />

Lo que hizo el agente:

1. **Encontró el curso y la tarea** (`list_courses`, `list_assignments`).
2. **Leyó las entregas** (`get_submissions`): una está esperando calificación y tres alumnos no han entregado. Para la IA, el alumno es `A-8FT4A1`, nunca un nombre.
3. **Leyó la rúbrica y el enunciado** (`get_rubric`, `get_assignment`), y propuso un nivel para cada criterio, con un comentario.
4. **Tras tu visto bueno, guardó la nota** (`grade_submission`), con los niveles de la rúbrica marcados y las notificaciones desactivadas.

## El resultado en Moodle

La rúbrica queda rellenada, nivel a nivel, en la propia página de calificación de Moodle, a tu nombre:

<Screenshot app="Moodle" src="/img/moodle/grading.png" alt="La página de calificación de Moodle con los niveles de la rúbrica que eligió el agente" />

## Consejos

- **Pide siempre primero una propuesta.** "No guardes nada todavía" evita que el agente califique antes de que la hayas leído.
- **El comentario se dirige al alumno de "tú".** moodle-mcp se niega a enviar un alias a Moodle, porque el alumno lo leería.
- **¿Muchas entregas?** Pide primero una tabla ("una línea por entrega con la nota propuesta") y después di cuáles guardar.
- **Los archivos que entregan los alumnos** (un PDF, un ZIP) solo se pueden leer con `MOODLE_MCP_STUDENT_DATA=clear`, porque su contenido no se puede seudonimizar. Consulta [Privacidad del alumnado](../../privacy.md).
