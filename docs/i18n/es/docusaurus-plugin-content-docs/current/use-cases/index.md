---
title: Casos de uso
sidebar_label: Casos de uso
slug: /use-cases
---

# Casos de uso

Estas son sesiones reales con **Claude Code** y **Codex**, trabajando con moodle-mcp en un sitio Moodle de pruebas: qué se pidió, qué herramientas usó el agente, qué respondió y qué cambió en Moodle. No se ha editado nada, salvo recortar las respuestas largas.

En todas las sesiones, el alumnado llega a la IA como alias del tipo `A-8FT4A1`: es la [privacidad del alumnado](../privacy.md) en su nivel por defecto.

## Como docente

| Caso de uso | Tú pides… | Aplicación |
| --- | --- | --- |
| [Calificar con una rúbrica](./teacher/grading.md) | "¿Qué entregas faltan por calificar? Propón una nota con la rúbrica." | Claude Code |
| [Un cuestionario con tus preguntas](./teacher/quiz-from-questions.md) | "Crea un cuestionario con estas preguntas GIFT, una por página." | Codex |
| [Responder en el foro](./teacher/forum-questions.md) | "¿Hay preguntas sin responder en el foro? Redacta una respuesta." | Claude Code |
| [Alumnos que se quedan atrás](./teacher/falling-behind.md) | "¿Quién no ha completado los apuntes? Mándales un recordatorio." | Codex |
| [Una página con una imagen](./teacher/page-with-image.md) | "Crea una página con una explicación y este diagrama." | Claude Code |
| [Un asistente de solo lectura](./teacher/reading-assistant.md) | "¿Cómo va mi curso?", con un agente que no puede cambiar nada | Claude Code |
| [Copiar entre sitios](./teacher/copy-between-sites.md) | "Copia esta página de mi curso en un Moodle al mismo curso en otro." | Claude Code |

## Como alumno

| Caso de uso | Tú pides… | Aplicación |
| --- | --- | --- |
| [Tu agenda semanal](./student/weekly-agenda.md) | "¿Qué tengo que entregar en las próximas dos semanas?" | Codex |
| [Apuntes para estudiar](./student/study-notes.md) | "Hazme una hoja de estudio con estos apuntes." | Claude Code |
| [Una actividad SCORM](./student/scorm.md) | "Haz la actividad SCORM y dime mi nota." | Codex |
| [Repasar un cuestionario](./student/quiz-review.md) | "¿Qué he fallado en mi último cuestionario?" | Claude Code |

## Consejos para pedir

- **Nombra el curso** como lo ves en Moodle, por su nombre corto o su nombre completo. El agente encuentra los ids por sí solo.
- **Pide primero un borrador** de todo lo que vayan a ver los alumnos: "Propón una nota, no guardes nada todavía", "Redacta la respuesta, no la publiques". Después di "guárdala" o "publícala".
- **Di para quién es.** "Oculto", "visible para los alumnos", "sin notificar al alumno": el agente se lo transmite a Moodle.
- **Comprueba el resultado en Moodle.** Cada herramienta que crea algo devuelve su enlace: pídeselo al agente, o pídele que [te enseñe el navegador](../getting-started/watching.md).
