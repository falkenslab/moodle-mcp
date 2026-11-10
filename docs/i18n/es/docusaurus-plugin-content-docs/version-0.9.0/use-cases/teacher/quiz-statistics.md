---
title: Qué preguntas arreglar
sidebar_label: Qué preguntas arreglar
---

# Qué preguntas arreglar

**Codex** · como docente · ajustes por defecto

Después de que tu alumnado haga un cuestionario, el agente lee sus estadísticas en Moodle y te dice qué preguntas conviene revisar y por qué: una que nadie falla, una que fallan los que mejor van, una cuyas respuestas incorrectas apuntan a un malentendido.

## Lo que pides

<Prompt>{`Mira las estadísticas del cuestionario "Repaso: bucles y funciones" de mi curso mcp-content: ¿qué preguntas debería revisar y por qué? No cambies nada.`}</Prompt>

Cuatro alumnos han hecho este cuestionario. Su tercera pregunta pide cuál de `for`, `while` y `def` es un bucle, y solo `for` está marcada como correcta, aunque `while` también lo es.

## La sesión

<Screenshot app="Codex" session="quiz-statistics" alt="Codex lee las estadísticas del cuestionario y ordena las preguntas que conviene revisar" />

Lo que hizo el agente:

1. **Encontró el curso y el cuestionario** (`list_courses`, `get_course_structure`).
2. **Leyó las estadísticas del cuestionario** (`get_quiz_statistics`): el índice de facilidad y el de discriminación de cada pregunta, las respuestas elegidas y las cifras del cuestionario.
3. **Ordenó las preguntas que revisar**: primero "Bucle", que Moodle marca como dudosa y tiene una discriminación del −89 %: quienes mejor resultado obtuvieron fueron quienes la fallaron. Propuso comprobar el enunciado y si `for` es inequívocamente la respuesta correcta frente a `while`. Después "Break", también marcada, y "Return", donde la mayoría eligió la misma respuesta incorrecta. Señaló que "Fijo", que acertaron todos, no ayuda a distinguir niveles.
4. **Dijo cuánto fiarse**: cuatro intentos son una muestra pequeña, señales para revisar las preguntas, no pruebas de que estén mal. No cambió nada.

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/quiz-statistics.png" alt="El informe de estadísticas del cuestionario en Moodle, con las preguntas Bucle y Break marcadas y la discriminación negativa de Bucle" />

## Consejos

- **Pregunta qué significa una cifra.** "¿Qué es el índice de discriminación?" te da una respuesta sencilla, con los números de este cuestionario como ejemplo.
- **Luego arréglala**: "Cambia la pregunta 3 para que solo una respuesta sea un bucle" edita la pregunta en el banco (`update_question`); la nueva versión no cambia los intentos ya calificados.
- **Más intentos, señales más firmes.** Con una clase entera, una discriminación negativa es un indicio fuerte de pregunta defectuosa; con unos pocos, es un motivo para mirarla.
