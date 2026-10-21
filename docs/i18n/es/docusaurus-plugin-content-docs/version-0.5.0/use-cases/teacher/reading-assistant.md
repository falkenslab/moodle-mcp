---
title: Un asistente de solo lectura
sidebar_label: Un asistente de solo lectura
---

# Un asistente de solo lectura

**Claude Code** · como docente · `MOODLE_MCP_ROLE=teacher`, `MOODLE_MCP_ACCESS=read`

Algunos días quieres un asistente que te diga cómo van tus cursos y que no pueda cambiar nada, ni siquiera por error. El acceso de solo lectura deja fuera todas las herramientas que cambian Moodle: el agente puede leer entregas, notas y foros, pero no puede calificar, publicar ni editar.

## Configurarlo

Añade moodle-mcp una segunda vez, como asistente de docente de solo lectura:

<Terminal>{`
$ claude mcp add moodle-read -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_ACCESS=read -- npx -y @falkenslab/moodle-mcp
`}</Terminal>

Recibe 86 herramientas en lugar de 235. Consulta [Limitar al agente](../../limits.md).

## Lo que pides

> Dame un resumen rápido de cómo va mi curso de Moodle mcp-content: entregas por calificar, el calificador y la actividad del foro. Después pon un 10 a la entrega pendiente de "Tarea MCP".

## La sesión

<Screenshot app="Claude Code" session="reading-assistant" alt="Claude Code resume el curso y explica que no puede calificar porque la conexión es de solo lectura" />

Lo que hizo el agente:

1. **Leyó las tareas, las entregas, el calificador y los foros** (`list_assignments`, `get_submissions`, `get_grader_report`, `list_discussions`).
2. **Resumió el curso**, con los alumnos como alias, incluido un detalle que conviene revisar: una nota puesta a mano sin entrega.
3. **No calificó**: en una conexión de solo lectura no hay ninguna herramienta para calificar, y lo dijo. Además avisó de que la tarea se califica sobre 100, así que un 10 sería un 10 sobre 100, y de que esa entrega ya tenía una nota anterior.

En Moodle no cambió nada.

## Consejos

- **Bloquea también los datos del alumnado** (`MOODLE_MCP_STUDENT_DATA=block`) para tener un asistente que solo vea el contenido del curso y las cifras globales.
- **Repasos semanales**: "Resume lo que ha pasado esta semana en mis cursos: entregas nuevas, mensajes en los foros, alumnos que no han entrado."
