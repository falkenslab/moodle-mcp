---
title: Limitar lo que puede hacer el agente
sidebar_label: Limitar al agente
---

# Limitar lo que puede hacer el agente

Por defecto, el agente recibe todas las herramientas: unas 230, para docentes y alumnos, para leer y para cambiar, en todos tus cursos. Tres ajustes reducen las herramientas, y un cuarto los cursos. Se suman: una herramienta solo está si todos los ajustes la permiten.

| Ajuste | Pregunta que responde | Valores |
| --- | --- | --- |
| [`MOODLE_MCP_ROLE`](#tu-rol) | ¿Das clase, estudias o las dos cosas? | `all`, `teacher`, `student` |
| [`MOODLE_MCP_ACCESS`](#solo-lectura) | ¿Puede cambiar cosas en Moodle? | `write`, `read` |
| [`MOODLE_MCP_SCOPES`](#ámbitos) | ¿Qué tipos de datos puede tocar? | `all`, `content`, `teacher`, `student`, o una lista |
| [`MOODLE_MCP_COURSES`](#aulas) | ¿En cuáles de tus cursos puede trabajar? | Sus URL; todos si no se pone |

Como la [privacidad del alumnado](./privacy.md), solo los pones tú, en la configuración de tu aplicación de IA. El agente puede restringirlos más durante una sesión, nunca ampliarlos.

Para ver los límites en vigor, pregúntale al agente:

> ¿Cuáles son los límites actuales de moodle-mcp?

## Tu rol

`MOODLE_MCP_ROLE` deja solo las herramientas para lo que haces en Moodle. Menos herramientas también significa que al agente le cuesta menos elegir la correcta, y que gasta menos de cada petición en leer sus descripciones.

| Rol | Herramientas | Qué incluye | Tamaño de las descripciones de las herramientas |
| --- | --- | --- | --- |
| `all` (por defecto) | 236 | Todo | unos 54.600 tokens |
| `teacher` | 220 | Crear y gestionar cursos, calificar, personas, informes, foros y mensajes | unos 52.800 tokens |
| `student` | 83 | Leer cursos, hacer actividades, tus notas y tareas pendientes, foros y mensajes | unos 15.500 tokens |

Claude Code carga las herramientas a medida que las necesita, así que ahí el tamaño importa menos. Claude Desktop, Codex y la mayoría de las demás aplicaciones las cargan todas al empezar cada chat.

## Solo lectura

`MOODLE_MCP_ACCESS=read` deja solo las herramientas que no cambian nada en Moodle. El agente puede leer cursos, entregas, notas e informes, pero no puede calificar, publicar, enviar ni editar.

| Con el rol | Herramientas que quedan |
| --- | --- |
| `all` | 92 |
| `teacher` | 87 |
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

## Aulas

Tu cuenta ve todos los cursos que impartes o cursas, también los del año pasado. `MOODLE_MCP_COURSES` limita al agente a los que le des, tus aulas, por su URL, en uno o varios Moodle:

```bash
claude mcp add moodle -e MOODLE_MCP_COURSES=https://campus.miinstituto.org/course/view.php?id=12,https://moodle.miuni.es/course/view.php?id=7 -- npx -y @falkenslab/moodle-mcp
```

Sus sitios salen de las URL, así que no necesitas `MOODLE_URL` ni `MOODLE_MCP_SITES`; inicias sesión en cada uno la primera vez que el agente trabaje en él.

Con aulas:

- **Las listas solo las muestran a ellas**: tus cursos, lo pendiente, el calendario.
- **Otro curso se rechaza**, pida lo que pida el agente.
- **También todo lo que no haya leído en un aula.** En Moodle el número de una actividad o de un mensaje es único en todo el sitio, así que uno inventado o recordado podría ser de otro curso. moodle-mcp solo actúa sobre lo que el agente ha leído en un aula durante la sesión: primero lee el curso, como hace siempre. A Moodle no se le pregunta nada más, así que nada va más lento.
- **Algunas herramientas se apagan**: las [del navegador](./reference/tools.md#browser), que pueden abrir cualquier página del sitio, y los mensajes y notificaciones, que llegan a cualquiera. Sobre las personas se actúa a través del curso o la actividad de un aula, como exige Moodle.

El agente puede reducir las aulas durante una sesión (`configure` con menos cursos), nunca añadir una.

## Confirmar lo que no se puede deshacer

Algunas herramientas no se pueden deshacer: eliminar una actividad, una sección, un mensaje o una pregunta, dar de baja a alguien, reiniciar un curso, restaurar una copia de seguridad sobre un curso. Antes de que se ejecute una de ellas, moodle-mcp te pregunta él mismo, en tu aplicación: qué va a pasar, y un sí o un no. La respuesta va a moodle-mcp, nunca a la IA, así que la IA no puede saltarse la pregunta. Si dices que no, no pasa nada. Calificar no está entre ellas: una nota se puede volver a cambiar.

Tu aplicación tiene que admitir estas preguntas (elicitation MCP), como hace Claude Code. En una que no las admite, estas herramientas se rechazan, salvo que tu aplicación ya te pregunte antes de cada herramienta y arranques moodle-mcp con `MOODLE_MCP_CONFIRM=client`. La referencia de herramientas dice cuáles preguntan.

## Herramientas avanzadas

Algunas áreas de Moodle las usa poca gente: BigBlueButton, competencias, herramientas externas (LTI), el banco de contenido, las notas sobre participantes y los bloques del curso. Sus 30 herramientas están desactivadas por defecto, para que no las pague cada chat. `MOODLE_MCP_ADVANCED=true` las activa, y los demás límites siguen aplicándose. `server_info` dice si están activas; el agente no puede activarlas por su cuenta.

## Ejemplos

Un docente que quiere ayuda para crear cursos, y nada más:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_SCOPES=content -- npx -y @falkenslab/moodle-mcp
```

Son 135 herramientas, unos 31.000 tokens.

Un asistente de estudio para un alumno que no puede entregar ni publicar nada:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=student -e MOODLE_MCP_ACCESS=read -- npx -y @falkenslab/moodle-mcp
```

Un asistente de docente que informa sobre los cursos pero no puede cambiarlos, con los datos del alumnado bloqueados:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -e MOODLE_MCP_ACCESS=read -e MOODLE_MCP_STUDENT_DATA=block -- npx -y @falkenslab/moodle-mcp
```

En Claude Desktop y Codex, los mismos ajustes van en la sección `env` de la configuración: consulta [Ajustes](./settings.md).
