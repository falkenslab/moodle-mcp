---
title: Configurar Claude Code
sidebar_label: Claude Code
---

# Configurar Claude Code

[Claude Code](https://claude.com/claude-code) es Claude en una ventana de terminal, o dentro de VS Code y otros editores. Si aún no lo tienes, sigue antes [su guía de instalación](https://docs.claude.com/en/docs/claude-code/setup).

## 1. Instálalo

Crea una carpeta para tu trabajo con Moodle, por ejemplo una carpeta `Moodle` en tus Documentos. Abre un terminal en ella y escribe:

```bash
claude mcp add moodle -- npx -y @falkenslab/moodle-mcp
```

Eso es todo. Le dice a Claude Code que, en esta carpeta, tiene un ayudante llamado `moodle`: moodle-mcp, que descarga y arranca él solo cuando hace falta.

## 2. Pruébalo

Abre Claude Code **en esa misma carpeta** (escribe `claude` en el terminal) y pide:

> Lista mis cursos de Moodle.

La primera vez:

1. **Te pide la dirección de tu Moodle**, como `https://campus.miinstituto.org`. Cópiala de tu navegador cuando estés en Moodle. La recuerda para las siguientes veces.
2. **Se abre una ventana del navegador** en la página de acceso de tu Moodle: inicia sesión como siempre. moodle-mcp nunca ve tu contraseña, y mantiene tu sesión para las siguientes veces. Consulta [Iniciar sesión la primera vez](./first-login.md).

Después el agente lista tus cursos. Ya está.

## 3. Dónde queda guardado

Claude Code lo escribió en su propio fichero, `.claude.json`, en tu carpeta de usuario (`C:\Users\<tú>\.claude.json` en Windows, `~/.claude.json` en macOS y Linux), bajo la carpeta donde lo instalaste. Para verlo sin abrir el fichero:

```bash
claude mcp get moodle
```

Dentro del fichero se ve así:

```json
"mcpServers": {
  "moodle": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@falkenslab/moodle-mcp"],
    "env": {}
  }
}
```

`env` es donde van los ajustes: cada uno es una línea `"NOMBRE": "valor"`. De momento está vacío, así que moodle-mcp funciona con sus valores por defecto, que son los seguros.

## 4. Ajústalo a ti {#make-it-yours}

Cada cambio de los de abajo es un ajuste. La forma más fácil de añadir uno es quitar moodle-mcp y volver a añadirlo con el ajuste, `-e NOMBRE=valor`, en la misma carpeta:

```bash
claude mcp remove moodle
claude mcp add moodle -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

Varios ajustes, varios `-e`. También puedes pedírselo a Claude Code en un chat ("añade a moodle el ajuste MOODLE_MCP_ROLE=teacher"). En los dos casos, empieza después una conversación nueva.

### Si das clase

`-e MOODLE_MCP_ROLE=teacher`

El agente recibe solo las herramientas del profesorado: crear cursos, calificar, el foro, los informes. Menos herramientas entre las que elegir, así que elige mejor, y no te ofrece cosas como "empezar este cuestionario como alumno".

### Si estudias

`-e MOODLE_MCP_ROLE=student`

El agente recibe solo las herramientas del alumnado: leer tus cursos, lo que tienes pendiente, hacer actividades, tus notas. Más o menos un tercio, así que va más rápido y elige mejor.

### Los nombres de tu alumnado

No tienes que hacer nada: **por defecto la IA nunca ve los nombres de las demás personas**. Ve a cada persona como un alias, como `A-7KQ2XM`, siempre el mismo, y solo tú puedes saber quién es, en tu ordenador ([Privacidad del alumnado](../privacy.md)). Hay otras dos opciones:

- `-e MOODLE_MCP_STUDENT_DATA=block`: la IA no ve nada de las demás personas; para un agente que solo crea contenido.
- `-e MOODLE_MCP_STUDENT_DATA=clear`: los nombres reales. Solo con una IA que funcione en tu propio ordenador, nunca con Claude.

### Que solo mire

`-e MOODLE_MCP_ACCESS=read`

El agente puede leer tus cursos, entregas y notas, pero no puede cambiar nada: ni calificar, ni publicar, ni crear. Bueno para probarlo con calma, o para un asistente que solo responde preguntas.

### Solo los cursos de este año

`-e MOODLE_MCP_COURSES=https://campus.miinstituto.org/course/view.php?id=12`

El agente solo trabaja en los cursos que pongas (sus direcciones, separadas por comas), no en los del año pasado ni en otros. Copia cada dirección de tu navegador cuando estés en la página del curso. Consulta [Aulas](../limits.md#aulas).

### Para ver lo que hace

`-e MOODLE_MCP_HEADLESS=false`

moodle-mcp trabaja en un navegador que no ves; con esto, ves su ventana todo el tiempo. También puedes pedir "enséñame el navegador" cuando quieras mirar ([Ver lo que hace el agente](./watching.md)).

Todos los ajustes, con todas sus opciones, están en [Ajustes](../settings.md).

## 5. Mientras lo usas {#while-you-use-it}

- **Claude Code te pregunta antes de cada paso** que usa moodle-mcp: *Yes*, o *Yes, and don't ask again* para uno del que te fíes.
- **Lo que no se puede deshacer te lo vuelve a preguntar**: antes de borrar algo, dar de baja a alguien o reiniciar un curso, el propio moodle-mcp te pregunta, con un sí o un no. No pasa nada hasta que dices que sí.

Para que deje de preguntarte por los pasos que solo leen Moodle, añade esto al fichero `.claude/settings.json` de tu carpeta de usuario:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__get_*", "mcp__moodle__list_*"],
    "ask": ["mcp__moodle__get_lesson_page"]
  }
}
```

La línea `ask` es la única excepción: como alumno, abrir una página de una lección cuenta como avance en ella.

## 6. En otras carpetas {#where-to-set-it-up}

Lo que instalaste en el paso 1 solo está en esa carpeta. Es un buen comienzo: Moodle se queda donde trabajas en tus cursos. Cuando lo quieras de otra forma:

| Quieres | Añade al comando de instalación | Se guarda en |
| --- | --- | --- |
| Moodle en todas las carpetas | `--scope user` | `.claude.json`, para todas tus carpetas |
| Una carpeta para un curso, compartida con otros docentes en un repositorio | `--scope project` | `.mcp.json` en esa carpeta |

- **Una carpeta por curso**: en la carpeta de cada curso, instálalo con `-e MOODLE_MCP_COURSES=` y la dirección de ese curso. Ahí el agente solo trabaja en ese curso. Con `--scope project` se escribe en un fichero `.mcp.json` dentro de la carpeta: si la compartes con otros docentes (un repositorio), tienen la misma configuración y cada uno inicia sesión con su propia cuenta; el fichero no guarda ninguna contraseña.
- **En todas partes, y una carpeta de un curso**: instálalo con `--scope user` para todas partes, y otra vez en la carpeta de un curso con ese curso. En esa carpeta gana el de la carpeta.
- **Uno cada vez**: todos comparten tu sesión. Dos ventanas de Claude Code usando moodle-mcp a la vez en el mismo Moodle no pueden abrirlo las dos: cierra una, o dale a una su propia carpeta de sesión con `-e MOODLE_MCP_PROFILE_DIR=` y una carpeta.

Para quitarlo de una carpeta: `claude mcp remove moodle` ahí (con `--scope user` o `--scope project` si lo añadiste así).
