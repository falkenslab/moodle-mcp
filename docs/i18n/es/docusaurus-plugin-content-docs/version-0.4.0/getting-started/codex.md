---
title: Configurar Codex
sidebar_label: Codex
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Configurar Codex

[Codex](https://developers.openai.com/codex) es el agente de programación de OpenAI, en tu terminal (Codex CLI), en VS Code y en la aplicación de Codex. Todos comparten la misma configuración, así que añades moodle-mcp una sola vez.

## 1. Añade moodle-mcp

Abre un terminal y ejecuta este comando, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`:

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS y Linux" default>

<Terminal title="Terminal">{`
$ codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added global MCP server 'moodle'.
`}</Terminal>

</TabItem>
<TabItem value="windows" label="Windows">

<Terminal title="PowerShell" prompt="PS>">{`
PS> codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- cmd /c npx -y @falkenslab/moodle-mcp
Added global MCP server 'moodle'.
`}</Terminal>

</TabItem>
</Tabs>

## 2. Comprueba que está

<Tabs groupId="os">
<TabItem value="mac-linux" label="macOS y Linux" default>

<Terminal title="Terminal">{`
$ codex mcp list
Name    Command  Args                          Env               Cwd  Status   Auth
moodle  npx      -y @falkenslab/moodle-mcp     MOODLE_URL=*****  -    enabled  Unsupported
`}</Terminal>

</TabItem>
<TabItem value="windows" label="Windows">

<Terminal title="PowerShell" prompt="PS>">{`
PS> codex mcp list
Name    Command  Args                              Env               Cwd  Status   Auth
moodle  cmd      /c npx -y @falkenslab/moodle-mcp  MOODLE_URL=*****  -    enabled  Unsupported
`}</Terminal>

</TabItem>
</Tabs>

`enabled` significa que Codex lo arrancará. Lo arranca de verdad la primera vez que abres una sesión.

## 3. Dale tiempo para arrancar

Codex espera 10 segundos a que arranque un servidor, y 60 segundos a que termine una herramienta. El primer arranque descarga moodle-mcp, y algunas tareas de Moodle tardan más de un minuto (una copia de seguridad de un curso, un cuestionario con muchas preguntas), así que dale más margen. Abre el archivo de configuración de Codex:

- **Windows**: `%USERPROFILE%\.codex\config.toml`
- **macOS y Linux**: `~/.codex/config.toml`

`codex mcp add` escribió ahí una sección `[mcp_servers.moodle]`. Añádele las dos líneas de tiempo de espera (en Windows, `command` es `"cmd"` y `args` empieza por `"/c", "npx"`):

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.moodle.env]
MOODLE_URL = "https://campus.example.org"
```

Los demás [ajustes](../settings.md) van en `[mcp_servers.moodle.env]`, como `MOODLE_MCP_ROLE = "teacher"`.

## 4. Pruébalo

Arranca Codex (`codex` en un terminal) y pide:

> Lista mis cursos de Moodle.

La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre. Consulta [Iniciar sesión la primera vez](./first-login.md). Dentro de Codex, `/mcp` lista los servidores y sus herramientas.

## Aprobar las llamadas a herramientas

Codex te pregunta antes de cada herramienta de moodle-mcp que cambia algo en Moodle. Para que ejecute las herramientas de moodle-mcp sin preguntar, añade esta línea a la sección `[mcp_servers.moodle]`:

```toml
default_tools_approval_mode = "approve"
```

Hazlo solo si te parece bien que el agente cambie Moodle sin preguntarte antes. Es más seguro junto con el acceso de solo lectura (`MOODLE_MCP_ACCESS = "read"`, consulta [Limitar lo que puede hacer el agente](../limits.md)).

:::note `codex exec`
En las ejecuciones no interactivas (`codex exec`), nadie puede responder a la pregunta de aprobación, así que Codex cancela las herramientas que cambian Moodle salvo que configures `default_tools_approval_mode` como arriba.
:::
