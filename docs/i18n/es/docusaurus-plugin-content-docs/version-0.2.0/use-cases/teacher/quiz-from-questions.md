---
title: Un cuestionario con tus preguntas
sidebar_label: Un cuestionario con tus preguntas
---

# Un cuestionario con tus preguntas

**Codex** · como docente · ajustes por defecto

Le das al agente preguntas en [formato GIFT](https://docs.moodle.org/en/GIFT_format), el formato de texto plano que importa Moodle. Crea el cuestionario, importa las preguntas en el banco de preguntas del cuestionario, las añade y configura la distribución.

## Lo que pides

```text
En mi curso de Moodle mcp-content, crea un cuestionario oculto llamado "Bucles: repaso rápido" en la primera sección, importa estas preguntas GIFT en su banco, añádelas al cuestionario y pon una pregunta por página:

::Repetir:: ¿Cuántas veces ejecuta su bloque for i in range(3)? {=3 ~2 ~4}

::Salir:: ¿Qué palabra sale antes de un bucle? {=break ~continue ~pass}

::While:: Un bucle while se repite mientras su condición es verdadera. {T}

Dime qué vas a hacer antes de cambiar nada.
```

Después: "Sí, adelante."

:::tip
En GIFT, deja una línea en blanco entre preguntas. También puedes pedirle al agente que escriba primero las preguntas ("Escribe cinco preguntas GIFT sobre bucles"), revisarlas y después pedirle el cuestionario.
:::

## La sesión

<Screenshot app="Codex" session="quiz-from-questions" alt="Codex explica su plan y después crea el cuestionario, importa las preguntas y pone una por página" />

Lo que hizo el agente:

1. **Dijo lo que iba a hacer** y, en vez de esperar, siguió adelante en el mismo turno. Cuando le dijiste «Sí, adelante», respondió que ya estaba hecho.
2. **Creó el cuestionario**, oculto, en la primera sección (`create_activity`).
3. **Importó las preguntas** en el banco de preguntas del propio cuestionario (`list_question_banks`, `import_questions`).
4. **Las añadió al cuestionario** y puso una pregunta por página (`add_questions_to_quiz`, `set_quiz_pages`).

:::warning Los agentes no siempre esperan
En esta sesión, Codex estaba configurado para usar las herramientas de moodle-mcp sin preguntar (`default_tools_approval_mode = "approve"`), así que nada lo frenó cuando decidió no esperar. Si quieres revisar un plan antes, deja activada en Codex la aprobación de las herramientas que cambian Moodle, para que cada cambio espere tu visto bueno, y di claramente «no cambies nada todavía». Consulta [Configurar Codex](../../getting-started/codex.md#aprobar-las-llamadas-a-herramientas).
:::

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/quiz-edit.png" alt="La página de preguntas del cuestionario en Moodle: tres preguntas, una por página" />

El cuestionario sigue oculto para los alumnos hasta que lo muestres. Aquí, un alumno lo hizo más tarde: consulta [Repasar un cuestionario](../student/quiz-review.md).

## Consejos

- **Moodle XML** también sirve, para preguntas exportadas de otro Moodle. Un archivo de tu ordenador funciona igual de bien que un texto en el chat.
- **La configuración en la misma petición**: límite de tiempo, intentos, fechas de apertura y cierre, calificación para aprobar. El agente los rellena en el propio formulario de Moodle.
- **Reutiliza preguntas**: "Añade al cuestionario las preguntas de la categoría Tema 2" funciona con preguntas que ya están en un banco.
