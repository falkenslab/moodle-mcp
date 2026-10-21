---
title: Configurar Claude Code
sidebar_label: Claude Code
---

# Configurar Claude Code

[Claude Code](https://claude.com/claude-code) es Claude en tu terminal, o en VS Code y otros editores. Si aún no lo tienes, sigue primero [su guía de instalación](https://docs.claude.com/en/docs/claude-code/setup).

## 1. Añade moodle-mcp

Abre un terminal y ejecuta este comando, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`:

<Terminal title="Terminal">{`
$ claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: npx -y @falkenslab/moodle-mcp to user config
`}</Terminal>

Qué significa cada parte:

- `moodle` es el nombre que le das al servidor. Las herramientas aparecen en Claude como herramientas de `moodle`.
- `--scope user` lo deja disponible en cualquier carpeta en la que abras Claude Code. Si lo quitas, se añade solo a la carpeta actual.
- `-e MOODLE_URL=…` es tu sitio. Puedes quitarlo, y Claude te pedirá el sitio la primera vez.
- `npx -y @falkenslab/moodle-mcp` descarga y arranca la última versión.

## 2. Comprueba que está

<Terminal title="Terminal">{`
$ claude mcp list
Checking MCP server health…

moodle: npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

Deberías ver `moodle` con `✔ Connected`, junto a los demás servidores que tengas.

La primera vez, `npx` descarga moodle-mcp, así que puede tardar unos segundos.

## 3. Arranca Claude y pruébalo

Arranca Claude Code en cualquier carpeta y pide:

> Lista mis cursos de Moodle.

La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre. [Iniciar sesión la primera vez](./first-login.md) explica qué pasa después.

Dentro de Claude Code, el comando `/mcp` muestra los servidores y sus herramientas, y te deja volver a conectar uno.

## Aprobar las llamadas a herramientas

Claude Code te pregunta antes de cada llamada a una herramienta, y te muestra su nombre y lo que va a enviar. Puedes responder *Yes* cada vez, o *Yes, and don't ask again* para una herramienta de la que te fíes.

Para aprobar de una vez por todas las herramientas que solo leen Moodle, añádelas a tu configuración. Por ejemplo, en `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__list_courses", "mcp__moodle__get_course_structure", "mcp__moodle__list_assignments"]
  }
}
```

Deja fuera de esa lista las herramientas que cambian Moodle (calificar, publicar, crear), para que Claude siga preguntándote antes de usarlas.

:::tip Menos herramientas, mejores respuestas
Si solo das clase, o solo estudias, dile a moodle-mcp tu rol: Claude recibe solo las herramientas para ese rol y las elige mejor. Añade `-e MOODLE_MCP_ROLE=teacher` (o `student`) al comando del paso 1. Consulta [Limitar lo que puede hacer el agente](../limits.md).
:::

## A mano: el fichero de configuración

Claude Code lee sus servidores de dos ficheros:

- `.mcp.json` en la carpeta de un proyecto: solo ahí, y puede ir en el repositorio del proyecto. Claude Code te pide que confíes en él la primera vez;
- `~/.claude.json` (`%USERPROFILE%.claude.json` en Windows), bajo `mcpServers`: todas las carpetas. Es donde escribe `--scope user`.

```json title=".mcp.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"],
      "env": { "MOODLE_URL": "https://campus.example.org" }
    }
  }
}
```

Los demás [ajustes](../settings.md) van en `env`. Claude Code lee el fichero al arrancar, o cuando reconectas el servidor en `/mcp`.

## Cambiarlo o quitarlo

Para cambiar un ajuste, edita su `env` en el fichero, o quita el servidor y vuelve a añadirlo con los valores nuevos:

```bash
claude mcp remove moodle --scope user
```

Para usar una versión concreta en lugar de la última, escríbela después del nombre del paquete: `@falkenslab/moodle-mcp@0.1.0`.
