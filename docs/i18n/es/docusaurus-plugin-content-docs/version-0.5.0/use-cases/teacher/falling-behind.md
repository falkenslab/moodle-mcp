---
title: Alumnos que se quedan atrás
sidebar_label: Alumnos que se quedan atrás
---

# Alumnos que se quedan atrás

**Codex** · como docente · ajustes por defecto

El agente revisa la finalización de actividades del curso, encuentra quién no ha hecho algo todavía y le envía un recordatorio, después de decirte a quién le llegaría.

## Lo que pides

> En mi curso de Moodle mcp-content, ¿qué alumnos no han completado todavía la página "Apuntes: bucles"? Prepárales un recordatorio breve y amable, y dime a quién le llegaría antes de enviar nada.

Después: "Sí, envíalo."

## La sesión

<Screenshot app="Codex" session="falling-behind" alt="Codex lista cuatro alumnos por su alias, redacta un recordatorio y lo envía tras la confirmación" />

Lo que hizo el agente:

1. **Leyó el informe de finalización del curso** (`get_completion_report`): cuatro alumnos no han completado la página.
2. **Redactó el recordatorio**, listó a quién le llegaría (por alias) y no envió nada.
3. **Tras tu visto bueno, lo envió** como mensaje de Moodle a cada uno de ellos (`message_participants`).

La IA solo conoció a los alumnos como `A-8FT4A1`, `A-RKTGVD`, etc. moodle-mcp convirtió los alias en las personas correctas al enviar.

## El resultado en Moodle

Cada alumno recibe un mensaje privado tuyo:

<Screenshot app="Moodle" src="/img/moodle/messages.png" alt="El recordatorio en los mensajes de Moodle de un alumno" />

## Consejos

- **Quién hay detrás de un alias**: ejecuta `npx @falkenslab/pseudonym whois A-8FT4A1` en tu propio terminal. Consulta [Privacidad del alumnado](../../privacy.md#alias).
- **Otras señales**: "¿Quién no ha entrado al curso desde el lunes?", "¿Quién no ha entregado la Tarea 3?", "¿Quién tiene menos de un 5 en los cuestionarios?"
- **Sin enviar**: pide solo la lista y escríbeles tú.
