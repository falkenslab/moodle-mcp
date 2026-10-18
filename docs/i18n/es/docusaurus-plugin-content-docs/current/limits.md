---
title: Limitar lo que puede hacer el agente
sidebar_label: Limitar al agente
---

# Limitar lo que puede hacer el agente

Por defecto, el agente recibe todas las herramientas: unas 230, para docentes y alumnos, para leer y para cambiar. Tres ajustes reducen esa lista. Se suman: una herramienta solo está si todos los ajustes la permiten.

| Ajuste | Pregunta que responde | Valores |
| --- | --- | --- |
| [`MOODLE_MCP_ROLE`](#tu-rol) | ¿Das clase, estudias o las dos cosas? | `all`, `teacher`, `student` |
| [`MOODLE_MCP_ACCESS`](#solo-lectura) | ¿Puede cambiar cosas en Moodle? | `write`, `read` |
| [`MOODLE_MCP_SCOPES`](#ámbitos) | ¿Qué tipos de datos puede tocar? | `all`, `content`, `teacher`, `student`, o una lista |

Como la [privacidad del alumnado](./privacy.md), solo los pones tú, en la configuración de tu aplicación de IA. El agente puede restringirlos más durante una sesión, nunca ampliarlos.

Para ver los límites en vigor, pregúntale al agente:

> ¿Cuáles son los límites actuales de moodle-mcp?

## Tu rol

`MOODLE_MCP_ROLE` deja solo las herramientas para lo que haces en Moodle. Menos herramientas también significa que al agente le cuesta menos elegir la correcta, y que gasta menos de cada petición en leer sus descripciones.

| Rol | Herramientas | Qué incluye | Tamaño de las descripciones de las herramientas |
| --- | --- | --- | --- |
| `all` (por defecto) | 235 | Todo | unos 54.600 tokens |
| `teacher` | 219 | Crear y gestionar cursos, calificar, personas, informes, foros y mensajes | unos 52.800 tokens |
| `student` | 83 | Leer cursos, hacer actividades, tus notas y tareas pendientes, foros y mensajes | unos 15.500 tokens |

Claude Code carga las herramientas a medida que las necesita, así que ahí el tamaño importa menos. Claude Desktop, Codex y la mayoría de las demás aplicaciones las cargan todas al empezar cada chat.

## Solo lectura

`MOODLE_MCP_ACCESS=read` deja solo las herramientas que no cambian nada en Moodle. El agente puede leer cursos, entregas, notas e informes, pero no puede calificar, publicar, enviar ni editar.

| Con el rol | Herramientas que quedan |
| --- | --- |
| `all` | 91 |
| `teacher` | 86 |
| `student` | 48 |

También se quedan fuera las herramientas que parecen de lectura pero empiezan algo en Moodle (una lección, un intento de cuestionario, un intento de SCORM). Descargar los ficheros de un curso o exportar sus calificaciones sí se queda: no cambia nada en Moodle, solo guarda un fichero en tu ordenador, y tu aplicación de IA puede seguir preguntándote antes de cada uno.

Así responde un asistente de solo lectura cuando le pides que califique:

<Screenshot app="Claude Code" session="reading-assistant" alt="Claude Code con acceso de solo lectura negándose a calificar" />

## Ámbitos

`MOODLE_MCP_SCOPES` elige según el tipo de datos que toca una herramienta. El más útil es `content`: un agente que crea y organiza cursos (actividades, secciones, bancos de preguntas, rúbricas, calendario, configuración del calificador, grupos, copias de seguridad sin usuarios) y que **nunca ve el trabajo ni las notas del alumnado**, ni escribe a los alumnos.

| Perfil | Para |
| --- | --- |
| `all` (por defecto) | Todo, incluidas las [herramientas del navegador](./reference/tools.md#browser) |
| `teacher` | Contenido, trabajo del alumnado, calificación, foros y mensajes |
| `student` | Leer cursos, hacer actividades, tus propias notas, foros y mensajes |
| `content` | Solo crear y gestionar cursos |

O una lista de ámbitos, separados por comas: `content`, `student-data`, `grading`, `communication`, `as-student`, `browser`. Por ejemplo, `content,communication` crea cursos y publica avisos, pero no lee entregas.

## Herramientas avanzadas

Algunas áreas de Moodle las usa poca gente: BigBlueButton, competencias, herramientas externas (LTI), el banco de contenido, las notas sobre participantes y los bloques del curso. Sus 30 herramientas están desactivadas por defecto, para que no las pague cada chat. `MOODLE_MCP_ADVANCED=true` las activa, y los demás límites siguen aplicándose. `server_info` dice si están activas; el agente no puede activarlas por su cuenta.

## Ejemplos

Un docente que quiere ayuda para crear cursos, y nada más:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_SCOPES=content -- npx -y @falkenslab/moodle-mcp
```

Son 133 herramientas, unos 31.000 tokens.

Un asistente de estudio para un alumno que no puede entregar ni publicar nada:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=student -e MOODLE_MCP_ACCESS=read -- npx -y @falkenslab/moodle-mcp
```

Un asistente de docente que informa sobre los cursos pero no puede cambiarlos, con los datos del alumnado bloqueados:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_ACCESS=read -e MOODLE_MCP_STUDENT_DATA=block -- npx -y @falkenslab/moodle-mcp
```

En Claude Desktop y Codex, los mismos ajustes van en la sección `env` de la configuración: consulta [Ajustes](./settings.md).
