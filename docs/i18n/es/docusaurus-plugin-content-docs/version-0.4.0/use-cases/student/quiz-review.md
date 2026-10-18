---
title: Repasar un cuestionario
sidebar_label: Repasar un cuestionario
---

# Repasar un cuestionario

**Claude Code** · como alumno · `MOODLE_MCP_ROLE=student`

Después de un cuestionario, el agente lee la revisión de tu intento y te explica cada fallo, hasta donde el cuestionario te deja ver las respuestas correctas.

## Lo que pides

> Acabo de hacer el cuestionario "Bucles: repaso rápido" de mi curso de Moodle mcp-content. ¿Qué nota he sacado y qué preguntas he fallado? Explícame las respuestas correctas.

## La sesión

<Screenshot app="Claude Code" session="quiz-review" alt="Claude Code lee la revisión del intento y explica las dos respuestas incorrectas" />

Lo que hizo el agente:

1. **Encontró el cuestionario y tus intentos** (`get_quiz_info`).
2. **Leyó la revisión del intento** (`get_attempt_review`): la nota y, para cada pregunta, tu respuesta, si era correcta y cuál era la respuesta correcta.
3. **Explicó cada fallo**, y por qué la respuesta correcta es la correcta.

## La revisión en Moodle

El mismo intento, tal como lo muestra Moodle:

<Screenshot app="Moodle" src="/img/moodle/quiz-review.png" alt="La revisión del intento en Moodle: una pregunta correcta y dos incorrectas" />

## Consejos

- **Practica antes del siguiente intento**: "Hazme tres preguntas más como las que he fallado."
- **Lo que Moodle oculta, el agente no lo ve**: si el cuestionario no muestra las respuestas correctas hasta que se cierra, el agente solo puede decirte cuáles has fallado.
- **El propio cuestionario**: el agente también puede responder cuestionarios por ti (`start_quiz_attempt`), pero te lo confirma antes de enviarlo. Tu docente ve el intento como tuyo.
