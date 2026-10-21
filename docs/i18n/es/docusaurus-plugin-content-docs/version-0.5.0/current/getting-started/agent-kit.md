---
title: Configurar un agente hecho con agent-kit
sidebar_label: agent-kit
---

# Configurar un agente hecho con agent-kit

[agent-kit](https://falkenslab.github.io/agent-kit/) es el kit de Falken's Lab para crear agentes de IA, como [miyagi](https://github.com/falkenslab/miyagi) para el profesorado y padawan para el alumnado. Sus agentes instalan moodle-mcp como **extensión** desde el [marketplace de Falken's Lab](https://falkenslab.github.io/agent-extensions/), con skills que explican cómo hacer bien cada tarea:

- **moodle-teacher**, para los cursos que impartes;
- **moodle-student**, para los cursos que cursas.

Las dos ejecutan el mismo moodle-mcp desde npm, en una versión fija. Los ejemplos usan miyagi y moodle-teacher: escribe en su lugar el comando de tu agente y la extensión que quieras.

## Desde la línea de comandos

```bash
miyagi extension add moodle-teacher@falkenslab
```

Te pide sus ajustes (más abajo) y ya está en la siguiente conversación del agente. Un agente cuyo marketplace propio no es el de Falken's Lab lo añade antes:

```bash
mi-agente extension marketplace add falkenslab/agent-extensions
```

Para dar los ajustes en el mismo comando, sin que te los pregunte, añade un `--set` por cada uno: `--set access=read`.

## Sus ajustes {#its-settings}

La extensión los pide al instalarla:

| Ajuste | Qué hace | Por defecto |
| --- | --- | --- |
| `sites` | Tus sitios Moodle, `nombre=dirección` cada uno, separados por comas; el primero es donde empieza. Por ejemplo `instituto=https://campus.miinstituto.org`. | obligatorio |
| `headless` | El navegador trabaja sin verse. Se abre una ventana para iniciar sesión, o cuando pides verlo. | sí |
| `access` | `read`: solo mira, nunca cambia nada. | `write` |
| `student_data` | `pseudonymize` (alias), `block` (nada) o `clear` (nombres: solo para una IA en tu propio ordenador). Consulta [Privacidad del alumnado](../privacy.md). | `pseudonymize` |

El rol lo fija la extensión: moodle-teacher da las herramientas del profesorado y moodle-student las del alumnado.

Para cambiarlos después:

- **en el chat**: `/extensions config moodle-teacher access=read`. El servidor vuelve a arrancar con él en la misma conversación;
- **en un terminal**: `miyagi extension config moodle-teacher access=read`. El agente lo toma en su siguiente conversación;
- **en un agente de escritorio**: en los ajustes de la extensión.

## En un agente propio

Un agente que crees con agent-kit puede arrancar moodle-mcp como uno de sus propios servidores MCP, con cualquiera de los [ajustes](../settings.md) como variables de entorno:

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  // …
  buildMcpServers: () => ({
    moodle: {
      command: "npx",
      args: ["-y", "@falkenslab/moodle-mcp@0.5.0"],
      env: { MOODLE_URL: "https://campus.example.org", MOODLE_MCP_ROLE: "teacher" },
    },
  }),
};
```

Fija una versión (`@0.5.0`) para que el agente no cambie sin que lo sepas. Sus herramientas son entonces `mcp__moodle__<herramienta>`. Consulta [Herramientas y MCP](https://falkenslab.github.io/agent-kit/es/docs/capabilities/tools-and-mcp) en agent-kit.

## Pruébalo

Pídele al agente:

> Lista mis cursos de Moodle.

La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre. Consulta [Iniciar sesión la primera vez](./first-login.md).
