---
title: Antes de empezar
sidebar_label: Requisitos
---

# Antes de empezar

Necesitas tres cosas en tu ordenador: **Node.js**, un **navegador** y una **aplicación de IA**. Se tarda unos minutos, y solo se hace una vez.

## 1. Node.js

moodle-mcp funciona con [Node.js](https://nodejs.org), versión 20 o posterior. Para ver si lo tienes, abre un terminal (en Windows, *PowerShell*; en macOS, *Terminal*) y escribe:

<Terminal>{`
$ node --version
v24.11.0
`}</Terminal>

Si muestra `v20` o superior, ya está. Si dice que no encuentra el comando, o muestra una versión más baja:

- **Windows y macOS**: descarga el instalador **LTS** de [nodejs.org](https://nodejs.org) y ejecútalo con las opciones por defecto. Después cierra el terminal y abre uno nuevo.
- **Linux**: instálalo con el gestor de paquetes de tu distribución, o con [nvm](https://github.com/nvm-sh/nvm).

Node.js incluye `npx`, que tu aplicación de IA usa para descargar y arrancar moodle-mcp. Nunca instalas moodle-mcp a mano.

## 2. Un navegador

moodle-mcp trabaja a través de un navegador real, con tu sesión iniciada. Usa **Microsoft Edge** o **Google Chrome** si tienes alguno. Windows ya incluye Edge.

Si no tienes ninguno, descarga su propia copia de Chromium (unos 180 MB) la primera vez que necesita un navegador. No tienes que hacer nada.

:::tip
El navegador que usa tiene su propio perfil, separado de tu navegación de siempre: tus marcadores, tu historial y tus otras sesiones no se tocan nunca.
:::

## 3. Una aplicación de IA

Sirve cualquier aplicación compatible con servidores MCP. Estas guías cubren las más habituales:

| Aplicación | Qué es | Guía |
| --- | --- | --- |
| **Claude Code** | Claude en tu terminal o en VS Code | [Configurar Claude Code](./claude-code.md) |
| **Claude Desktop** | La aplicación de Claude para Windows y macOS | [Configurar Claude Desktop](./claude-desktop.md) |
| **Codex** | El agente de OpenAI, en tu terminal o en VS Code | [Configurar Codex](./codex.md) |

## 4. La dirección de tu sitio Moodle

Copia la dirección de tu sitio Moodle desde el navegador, por ejemplo `https://campus.example.org`. Vale cualquier página del sitio: moodle-mcp encuentra la raíz del sitio por sí solo.

:::note ¿Y mi contraseña?
No se la das a nadie. La primera vez que el agente necesita Moodle, se abre una ventana del navegador en la página de acceso de tu sitio, y ahí inicias sesión como siempre. Consulta [Iniciar sesión la primera vez](./first-login.md).
:::
