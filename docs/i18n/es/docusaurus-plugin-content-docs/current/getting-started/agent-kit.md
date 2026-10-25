---
title: Configurar un agente hecho con agent-kit
sidebar_label: agent-kit
---

# Configurar un agente hecho con agent-kit

[agent-kit](https://falkenslab.github.io/agent-kit/) es el kit de Falken's Lab para crear agentes de IA, como [miyagi](https://github.com/falkenslab/miyagi) para el profesorado y padawan para el alumnado. Añaden moodle-mcp como **extensión** desde el [marketplace de Falken's Lab](https://falkenslab.github.io/agent-extensions/), que además les enseña a hacer bien cada tarea. Hay dos:

- **moodle-teacher**, si das clase;
- **moodle-student**, si estudias.

Los ejemplos usan miyagi y moodle-teacher: escribe en su lugar el nombre de tu agente y la que necesites.

## 1. Instálalo

En un terminal:

<Terminal>{`$ miyagi extension add moodle-teacher@falkenslab`}</Terminal>

Te hace unas preguntas; de momento solo importa la primera: **tus sitios Moodle**, como `nombre=dirección`, por ejemplo `instituto=https://campus.miinstituto.org`. Pulsa Intro en las demás para dejar sus valores por defecto, que son los seguros.

(Un agente que no sea miyagi ni padawan quizá necesite antes el marketplace de Falken's Lab: `mi-agente extension marketplace add falkenslab/agent-extensions`.)

## 2. Pruébalo

Abre el agente y pide:

<Prompt>{`Lista mis cursos de Moodle.`}</Prompt>

La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre. moodle-mcp nunca ve tu contraseña, y mantiene tu sesión para las siguientes veces. Consulta [Iniciar sesión la primera vez](./first-login.md).

## 3. Dónde queda guardado

El agente guarda la extensión y tus respuestas junto con sus demás extensiones. Para verlas:

<Terminal>{`$ miyagi extension info moodle-teacher
$ miyagi extension config moodle-teacher`}</Terminal>

La segunda muestra sus ajustes y sus valores: `sites`, `courses`, `headless`, `access` y `student_data`.

## 4. Ajústalo a ti {#make-it-yours}

Cambia un ajuste con `extension config`, en un terminal, o con `/extensions config` en el chat del agente, donde se aplica en el momento:

<Terminal>{`$ miyagi extension config moodle-teacher access=read`}</Terminal>

### Si das clase, o estudias

Es la extensión que eliges: moodle-teacher tiene las herramientas del profesorado (crear cursos, calificar, el foro, los informes) y moodle-student las del alumnado (tus cursos, lo pendiente, hacer actividades, tus notas). Menos herramientas entre las que elegir, así que el agente elige mejor.

### Los nombres de tu alumnado

No tienes que hacer nada: **por defecto la IA nunca ve los nombres de las demás personas**. Ve a cada persona como un alias, como `A-7KQ2XM`, siempre el mismo, y solo tú puedes saber quién es, en tu ordenador ([Privacidad del alumnado](../privacy.md)). Hay otras dos opciones:

- `student_data=block`: la IA no ve nada de las demás personas.
- `student_data=clear`: los nombres reales. Solo con una IA que funcione en tu propio ordenador.

### Que solo mire

`access=read`

El agente puede leer tus cursos, entregas y notas, pero no puede cambiar nada: ni calificar, ni publicar, ni crear.

### Para ver lo que hace

`headless=false`

moodle-mcp trabaja en un navegador que no ves; con esto, ves su ventana todo el tiempo. También puedes pedir "enséñame el navegador" cuando quieras mirar.

### Solo los cursos de este año

`courses=https://campus.miinstituto.org/course/view.php?id=12`

El agente solo trabaja en los cursos que pongas (sus direcciones, separadas por comas), no en los del año pasado ni en otros. Copia cada dirección de tu navegador cuando estés en la página del curso. Consulta [Aulas](../limits.md#aulas).

### Más sitios

`sites=instituto=https://campus.miinstituto.org,uni=https://moodle.miuni.es`

Tus sitios, separados por comas; el primero es donde empieza.

## 5. Mientras lo usas {#while-you-use-it}

- **En modo guiado, el agente te pregunta antes de los pasos que cambian cosas.** `miyagi extension config moodle-teacher confirm=off` hace que deje de preguntar, para una extensión de la que te fíes.
- **Lo que no se puede deshacer te lo vuelve a preguntar**: antes de borrar algo, dar de baja a alguien o reiniciar un curso, el propio moodle-mcp te pregunta, y no pasa nada hasta que dices que sí.

## 6. Otras configuraciones {#where-to-set-it-up}

- **Solo para un proyecto**: `miyagi extension add moodle-teacher@falkenslab --project`, en la carpeta de ese proyecto. Sus ajustes ahí ganan a los del agente, solo en ese proyecto.
- **En un agente propio**: arranca moodle-mcp como uno de sus propios ayudantes, con cualquier [ajuste](../settings.md):

  ```ts
  buildMcpServers: () => ({
    moodle: {
      command: "npx",
      args: ["-y", "@falkenslab/moodle-mcp@0.6.0"],
      env: { MOODLE_MCP_COURSES: "https://campus.miinstituto.org/course/view.php?id=12", MOODLE_MCP_ROLE: "teacher" },
    },
  }),
  ```

  Fija una versión (`@0.6.0`) para que no cambie sin que lo sepas. Consulta [Herramientas y MCP](https://falkenslab.github.io/agent-kit/es/docs/capabilities/tools-and-mcp) en agent-kit.

Para quitarla: `miyagi extension remove moodle-teacher` (`--project` para la de un proyecto).
