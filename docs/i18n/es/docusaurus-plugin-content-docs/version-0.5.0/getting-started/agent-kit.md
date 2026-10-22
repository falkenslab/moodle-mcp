---
title: Configurar un agente hecho con agent-kit
sidebar_label: agent-kit
---

# Configurar un agente hecho con agent-kit

[agent-kit](https://falkenslab.github.io/agent-kit/) es el kit de Falken's Lab para crear agentes de IA, como [miyagi](https://github.com/falkenslab/miyagi) para el profesorado y padawan para el alumnado. Sus agentes instalan moodle-mcp como **extensión** desde el [marketplace de Falken's Lab](https://falkenslab.github.io/agent-extensions/), con skills que explican cómo hacer bien cada tarea:

- **moodle-teacher**, para los cursos que impartes;
- **moodle-student**, para los cursos que cursas.

Las dos ejecutan el mismo moodle-mcp desde npm, en una versión fija. Los ejemplos usan miyagi y moodle-teacher: escribe en su lugar el comando de tu agente y la extensión que quieras.

## Empezar

```bash
miyagi extension add moodle-teacher@falkenslab
```

Te pide sus ajustes (más abajo) y ya está en la siguiente conversación del agente. Un agente cuyo marketplace propio no es el de Falken's Lab lo añade antes: `mi-agente extension marketplace add falkenslab/agent-extensions`. Después pídele al agente **"Lista mis cursos de Moodle"**: la primera vez se abre una ventana del navegador en la página de acceso de tu Moodle ([Iniciar sesión la primera vez](./first-login.md)).

### Sus ajustes {#its-settings}

| Ajuste | Qué hace | Valores |
| --- | --- | --- |
| `sites` | Tus sitios Moodle, el primero donde empieza | `nombre=dirección` cada uno, separados por comas, como `instituto=https://campus.miinstituto.org`. Obligatorio |
| `headless` | Si ves el navegador | **sí**: trabaja sin verse; se abre una ventana para iniciar sesión, o cuando pides verlo. no: una ventana visible |
| `access` | Si el agente puede cambiar Moodle | **`write`**: lee y cambia. `read`: solo mira |
| `student_data` | Qué ve la IA de las demás personas ([Privacidad del alumnado](../privacy.md)) | **`pseudonymize`**: alias. `block`: nada. `clear`: nombres, solo para una IA en tu propio ordenador |

El rol lo pone la extensión: moodle-teacher tiene las herramientas del profesorado y moodle-student las del alumnado. Para dar los ajustes en el mismo comando, añade un `--set` por cada uno: `--set access=read`.

## Dónde configurarlo {#where-to-set-it-up}

Un agente guarda sus extensiones en dos ámbitos, como Claude Code:

| Ámbito | Dónde está | Cómo |
| --- | --- | --- |
| El del agente | En todos sus proyectos | `extension add …` |
| El de un proyecto | Solo en ese proyecto, por encima del del agente | `extension add … --project` |

### En todas partes

La extensión en el ámbito del agente, como en [Empezar](#empezar): todos los proyectos del agente tienen Moodle, con los mismos sitios y ajustes.

- **Por qué**: una sola configuración; la forma habitual del agente.

### Un proyecto con sus propios ajustes

Un proyecto tuyo (un curso que estás preparando, los apuntes de una asignatura) donde la extensión debe tener otros ajustes: otro sitio, acceso de solo lectura.

```bash
cd ~/cursos/programacion-1
miyagi extension add moodle-teacher@falkenslab --project --set access=read
```

- **Por qué**: los ajustes de ese proyecto ganan a los del agente, solo ahí.
- **Ojo**: los ajustes de la extensión todavía no incluyen [aulas](../limits.md#aulas); para un agente limitado a unos cursos, mira el siguiente.

### Un agente propio

Un agente que crees con agent-kit arranca moodle-mcp como uno de sus propios servidores MCP, con cualquier [ajuste](../settings.md), aulas incluidas:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  buildMcpServers: () => ({
    moodle: {
      command: "npx",
      args: ["-y", "@falkenslab/moodle-mcp@0.5.0"],
      env: { MOODLE_MCP_COURSES: "https://campus.example.org/course/view.php?id=12", MOODLE_MCP_ROLE: "teacher" },
    },
  }),
};
```

- **Por qué**: el agente viene con Moodle, configurado como lo necesitas. Fija una versión (`@0.5.0`) para que no cambie sin que lo sepas. Sus herramientas son `mcp__moodle__<herramienta>`; consulta [Herramientas y MCP](https://falkenslab.github.io/agent-kit/es/docs/capabilities/tools-and-mcp) en agent-kit.

## Mientras lo usas

En modo guiado, el agente te pregunta antes de las herramientas que cambian cosas; `extension config moodle-teacher confirm=off` deja que se ejecuten sin preguntar, para una extensión de la que te fíes. Lo que no se puede deshacer (borrar, dar de baja, reiniciar un curso) te lo vuelve a preguntar el propio moodle-mcp: consulta [Confirmar lo que no se puede deshacer](../limits.md#confirmar-lo-que-no-se-puede-deshacer).

## Cambiarlo o quitarlo

- **En el chat**: `/extensions config moodle-teacher access=read`; el servidor vuelve a arrancar con él en la misma conversación.
- **En un terminal**: `miyagi extension config moodle-teacher access=read`, que el agente toma en su siguiente conversación.
- **En un agente de escritorio**: en los ajustes de la extensión.
- **Para quitarla**: `miyagi extension remove moodle-teacher` (`--project` para la de un proyecto).
