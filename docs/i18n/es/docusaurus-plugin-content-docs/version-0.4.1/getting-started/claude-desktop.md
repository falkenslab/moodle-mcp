---
title: Configurar Claude Desktop
sidebar_label: Claude Desktop
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Configurar Claude Desktop

[Claude Desktop](https://claude.ai/download) es la aplicación de Claude para Windows y macOS. Añades moodle-mcp a su archivo de configuración una sola vez.

## 1. Abre el archivo de configuración

1. Abre Claude Desktop.
2. Ve a **Settings** (en Windows, el menú ☰ → *File* → *Settings*; en macOS, *Claude* → *Settings*).
3. Elige **Developer** y haz clic en **Edit Config**.

Se abre la carpeta con `claude_desktop_config.json`. Abre ese archivo con un editor de texto (Bloc de notas, TextEdit, VS Code…). Está en:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## 2. Añade moodle-mcp

Pega esto en el archivo, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`:

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS" default>

```json
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

</TabItem>
<TabItem value="windows" label="Windows">

```json
{
  "mcpServers": {
    "moodle": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@falkenslab/moodle-mcp"],
      "env": { "MOODLE_URL": "https://campus.example.org" }
    }
  }
}
```

</TabItem>
</Tabs>

Si el archivo ya tiene otros servidores en `mcpServers`, añade el bloque `"moodle": { … }` junto a ellos, con una coma entre bloques.

Los demás [ajustes](../settings.md) también van en `env`. Por ejemplo, un docente que solo quiere las herramientas de docente:

```json
"env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ROLE": "teacher" }
```

## 3. Reinicia Claude Desktop

Cierra Claude Desktop del todo (en Windows, también desde el icono junto al reloj) y vuelve a abrirlo. En un chat nuevo, el botón de **herramientas** (el icono de controles deslizantes bajo el cuadro de mensaje) ya muestra `moodle` con sus herramientas.

Si no aparece, o muestra un error, consulta [Solución de problemas](../troubleshooting.md): la causa más habitual es que falte una coma o unas comillas en el archivo.

## 4. Pruébalo

En un chat nuevo, pide:

> Lista mis cursos de Moodle.

Claude te pide permiso la primera vez que usa cada herramienta: elige *Allow once* o *Allow always*. Después se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre. Consulta [Iniciar sesión la primera vez](./first-login.md).
