---
title: Responder en el foro
sidebar_label: Responder en el foro
---

# Responder en el foro

**Claude Code** · como docente · ajustes por defecto

El agente lee un foro, encuentra las preguntas que nadie ha respondido y redacta una respuesta para cada una. Tú lees el borrador, y después lo publica.

## Lo que pides

> ¿Hay preguntas en el foro "Foro MCP" de mi curso mcp-content que nadie haya respondido todavía? Léelas y redacta una respuesta breve y cercana para cada una. No publiques nada todavía.

Después: "Publícala."

## La sesión

<Screenshot app="Claude Code" session="forum-questions" alt="Claude Code encuentra la pregunta sin responder, redacta la respuesta y la publica tras la confirmación" />

Lo que hizo el agente:

1. **Listó los debates del foro** (`list_discussions`) y **leyó los que tenían preguntas abiertas** (`get_discussion`).
2. **Encontró una pregunta abierta**, y comprobó que el resto de debates ya tenían respuesta.
3. **Redactó la respuesta** y esperó.
4. **La publicó** como respuesta en el hilo (`reply_to_post`).

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/forum-reply.png" alt="El debate del foro en Moodle con la respuesta del docente" />

La respuesta es tuya. Se publica a tu nombre, como cualquier otro mensaje, y los alumnos reciben las notificaciones habituales del foro.

## Consejos

- **Marca el tono**: "breve y cercana", "con un ejemplo en Python", "remítelos a los apuntes del tema 2".
- **Los nombres de los alumnos nunca llegan a la IA**, y la respuesta no los necesita: se dirige al alumno de "tú".
- **Los avisos funcionan igual**: "Publica un aviso en el foro de Avisos recordando a todos el examen del viernes."
