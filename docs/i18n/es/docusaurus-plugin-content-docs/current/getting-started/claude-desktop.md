---
title: Configurar Claude Desktop
sidebar_label: Claude Desktop
---

# Configurar Claude Desktop

[Claude Desktop](https://claude.ai/download) es la app de Claude para Windows y macOS. Añades moodle-mcp una vez a su fichero de configuración, y está en todos los chats.

## 1. Abre su fichero de configuración

En Claude Desktop, ve a **Settings** (en Windows, el menú ☰ → *File* → *Settings*; en macOS, *Claude* → *Settings*), elige **Developer** y pulsa **Edit Config**. Se abre una carpeta con el fichero `claude_desktop_config.json`; ábrelo con un editor de texto, como el Bloc de notas o TextEdit. Está en:

- **Windows**: `C:\Users\<tú>\AppData\Roaming\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

## 2. Instálalo

Sustituye lo que hay en el fichero por esto, y guarda:

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"]
    }
  }
}
```

Si el fichero ya tiene otros ayudantes bajo `mcpServers`, no lo sustituyas: añade el bloque `"moodle": { … }` junto a ellos, con una coma entre bloques.

Después **cierra Claude Desktop del todo** (en Windows, también desde su icono junto al reloj) y vuelve a abrirlo. En un chat nuevo, el botón de **herramientas** (los deslizadores bajo el cuadro de mensaje) lista `moodle`. Si no, lo más probable es que al fichero le falte una coma o unas comillas: consulta [Solución de problemas](../troubleshooting.md).

## 3. Pruébalo

En un chat nuevo, pide:

> Lista mis cursos de Moodle.

La primera vez:

1. **Claude te pide permiso** para usar las herramientas de moodle-mcp: *Allow once* o *Allow always*.
2. **Te pide la dirección de tu Moodle**, como `https://campus.miinstituto.org`. Cópiala de tu navegador cuando estés en Moodle. La recuerda para las siguientes veces.
3. **Se abre una ventana del navegador** en la página de acceso de tu Moodle: inicia sesión como siempre. moodle-mcp nunca ve tu contraseña, y mantiene tu sesión para las siguientes veces. Consulta [Iniciar sesión la primera vez](./first-login.md).

Después Claude lista tus cursos. Ya está.

## 4. Ajústalo a ti {#make-it-yours}

Cada cambio de los de abajo es un ajuste, una línea en un bloque `env` que añades dentro de `"moodle"`:

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"],
      "env": {
        "MOODLE_MCP_ROLE": "teacher"
      }
    }
  }
}
```

Varios ajustes, una línea cada uno, con una coma entre líneas. Guarda el fichero, cierra Claude Desktop del todo y vuelve a abrirlo.

### Si das clase

`"MOODLE_MCP_ROLE": "teacher"`

Claude recibe solo las herramientas del profesorado: crear cursos, calificar, el foro, los informes. Menos herramientas entre las que elegir, así que elige mejor, y no te ofrece cosas como "empezar este cuestionario como alumno".

### Si estudias

`"MOODLE_MCP_ROLE": "student"`

Claude recibe solo las herramientas del alumnado: leer tus cursos, lo que tienes pendiente, hacer actividades, tus notas. Más o menos un tercio, así que va más rápido y elige mejor.

### Los nombres de tu alumnado

No tienes que hacer nada: **por defecto la IA nunca ve los nombres de las demás personas**. Ve a cada persona como un alias, como `A-7KQ2XM`, siempre el mismo, y solo tú puedes saber quién es, en tu ordenador ([Privacidad del alumnado](../privacy.md)). Hay otras dos opciones:

- `"MOODLE_MCP_STUDENT_DATA": "block"`: la IA no ve nada de las demás personas; para un asistente que solo crea contenido.
- `"MOODLE_MCP_STUDENT_DATA": "clear"`: los nombres reales. Solo con una IA que funcione en tu propio ordenador, nunca con Claude.

### Que solo mire

`"MOODLE_MCP_ACCESS": "read"`

Claude puede leer tus cursos, entregas y notas, pero no puede cambiar nada: ni calificar, ni publicar, ni crear. Así puedes darle *Allow always* a todas las herramientas sin preocuparte.

### Solo los cursos de este año

`"MOODLE_MCP_COURSES": "https://campus.miinstituto.org/course/view.php?id=12"`

Claude solo trabaja en los cursos que pongas (sus direcciones, separadas por comas), no en los del año pasado ni en otros. Copia cada dirección de tu navegador cuando estés en la página del curso. Consulta [Aulas](../limits.md#aulas).

### Para ver lo que hace

`"MOODLE_MCP_HEADLESS": "false"`

moodle-mcp trabaja en un navegador que no ves; con esto, ves su ventana todo el tiempo. También puedes pedir "enséñame el navegador" cuando quieras mirar ([Ver lo que hace el agente](./watching.md)).

Todos los ajustes, con todas sus opciones, están en [Ajustes](../settings.md).

## 5. Mientras lo usas {#while-you-use-it}

- **Claude te pide permiso la primera vez que usa cada herramienta**: deja las que cambian Moodle (calificar, publicar, crear) en *Allow once*, salvo que solo pueda mirar.
- **Lo que no se puede deshacer te lo vuelve a preguntar**: antes de borrar algo, dar de baja a alguien o reiniciar un curso, el propio moodle-mcp te pregunta, con un sí o un no, y no pasa nada hasta que dices que sí. Hace falta una aplicación que pueda mostrar esa pregunta (elicitación MCP); si la tuya no puede, esos pasos se rechazan con un mensaje que lo dice ([Confirmar lo que no se puede deshacer](../limits.md#confirmar-lo-que-no-se-puede-deshacer)).

Para quitar moodle-mcp, borra su bloque `"moodle"` del fichero y reinicia Claude Desktop.
