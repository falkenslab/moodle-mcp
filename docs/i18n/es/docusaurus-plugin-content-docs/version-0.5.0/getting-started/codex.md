---
title: Configurar Codex
sidebar_label: Codex
---

# Configurar Codex

[Codex](https://developers.openai.com/codex) es el agente de OpenAI, en una ventana de terminal (Codex CLI), dentro de VS Code o en la app de Codex; todos comparten la misma configuración.

## 1. Instálalo

Abre un terminal y escribe:

```bash
codex mcp add moodle -- npx -y @falkenslab/moodle-mcp
```

Eso le dice a Codex que tiene un ayudante llamado `moodle`: moodle-mcp, que descarga y arranca él solo cuando hace falta.

## 2. Dale tiempo {#give-it-time}

Codex lo escribió en su propio fichero, `config.toml`, en una carpeta `.codex` de tu carpeta de usuario (`C:\Users\<tú>\.codex\config.toml` en Windows, `~/.codex/config.toml` en macOS y Linux). Ábrelo con cualquier editor de texto; encontrarás:

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
```

Añade dos líneas debajo y guarda:

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600
```

Codex le da a un ayudante 10 segundos para arrancar y un minuto para cada tarea, y después se rinde. El primer arranque descarga moodle-mcp, y algunas tareas de Moodle tardan más (una copia de seguridad, un cuestionario largo, esperar a que confirmes algo): estas líneas le dan dos minutos para arrancar y diez para cada tarea.

## 3. Pruébalo

Arranca Codex (escribe `codex` en un terminal) y pide:

> Lista mis cursos de Moodle.

La primera vez:

1. **Te pide la dirección de tu Moodle**, como `https://campus.miinstituto.org`. Cópiala de tu navegador cuando estés en Moodle. La recuerda para las siguientes veces.
2. **Se abre una ventana del navegador** en la página de acceso de tu Moodle: inicia sesión como siempre. moodle-mcp nunca ve tu contraseña, y mantiene tu sesión para las siguientes veces. Consulta [Iniciar sesión la primera vez](./first-login.md).

Después el agente lista tus cursos. Ya está.

## 4. Ajústalo a ti {#make-it-yours}

Cada cambio de los de abajo es un ajuste, una línea en `config.toml`, en una sección propia debajo de la que ya tienes:

```toml
[mcp_servers.moodle.env]
MOODLE_MCP_ROLE = "teacher"
```

Varios ajustes, una línea cada uno en esa misma sección. Guarda el fichero y empieza una sesión nueva de Codex: lee el fichero al arrancar.

### Si das clase

`MOODLE_MCP_ROLE = "teacher"`

El agente recibe solo las herramientas del profesorado: crear cursos, calificar, el foro, los informes. Menos herramientas entre las que elegir, así que elige mejor, y no te ofrece cosas como "empezar este cuestionario como alumno".

### Si estudias

`MOODLE_MCP_ROLE = "student"`

El agente recibe solo las herramientas del alumnado: leer tus cursos, lo que tienes pendiente, hacer actividades, tus notas. Más o menos un tercio, así que va más rápido y elige mejor.

### Los nombres de tu alumnado

No tienes que hacer nada: **por defecto la IA nunca ve los nombres de las demás personas**. Ve a cada persona como un alias, como `A-7KQ2XM`, siempre el mismo, y solo tú puedes saber quién es, en tu ordenador ([Privacidad del alumnado](../privacy.md)). Hay otras dos opciones:

- `MOODLE_MCP_STUDENT_DATA = "block"`: la IA no ve nada de las demás personas; para un agente que solo crea contenido.
- `MOODLE_MCP_STUDENT_DATA = "clear"`: los nombres reales. Solo con una IA que funcione en tu propio ordenador, nunca con la de Codex.

### Que solo mire

`MOODLE_MCP_ACCESS = "read"`

El agente puede leer tus cursos, entregas y notas, pero no puede cambiar nada: ni calificar, ni publicar, ni crear. Bueno para probarlo con calma, o para un asistente que solo responde preguntas.

### Solo los cursos de este año

`MOODLE_MCP_COURSES = "https://campus.miinstituto.org/course/view.php?id=12"`

El agente solo trabaja en los cursos que pongas (sus direcciones, separadas por comas), no en los del año pasado ni en otros. Copia cada dirección de tu navegador cuando estés en la página del curso. Consulta [Aulas](../limits.md#aulas).

### Para ver lo que hace

`MOODLE_MCP_HEADLESS = "false"`

moodle-mcp trabaja en un navegador que no ves; con esto, ves su ventana todo el tiempo. También puedes pedir "enséñame el navegador" cuando quieras mirar ([Ver lo que hace el agente](./watching.md)).

Todos los ajustes, con todas sus opciones, están en [Ajustes](../settings.md).

## 5. Mientras lo usas {#while-you-use-it}

- **Codex te pregunta antes de cada paso** que usa moodle-mcp: *Allow*, *Allow for this session*, *Always allow* o *Cancel*.
- **Lo que no se puede deshacer te lo vuelve a preguntar**: antes de borrar algo, dar de baja a alguien o reiniciar un curso, el propio moodle-mcp te pregunta, True o False. No pasa nada hasta que dices que sí; tienes diez minutos.

Para que use moodle-mcp sin preguntarte cada vez, añade `default_tools_approval_mode = "approve"` bajo `[mcp_servers.moodle]`. Solo si te parece bien que el agente cambie Moodle por su cuenta; es más seguro junto con `MOODLE_MCP_ACCESS = "read"`.

## 6. Otras configuraciones {#where-to-set-it-up}

Lo que instalaste está allí donde abras Codex. Codex también puede leer una configuración solo para una carpeta, o una que eliges al arrancarlo:

| Quieres | Escribe las mismas secciones `[mcp_servers.moodle]` en | Se aplica |
| --- | --- | --- |
| Una carpeta para un curso | `.codex/config.toml` dentro de esa carpeta | En esa carpeta, cuando le dices a Codex que confías en ella |
| Elegir el curso al arrancar | `.codex/<nombre>.config.toml` en tu carpeta de usuario, como `programacion-1.config.toml` | Cuando arrancas con `codex -p programacion-1` |

- **Una carpeta por curso**: con `MOODLE_MCP_COURSES` y la dirección de ese curso, el agente de esa carpeta solo trabaja en ese curso. Si compartes la carpeta con otros docentes (un repositorio), tienen la misma configuración y cada uno inicia sesión con su propia cuenta; el fichero no guarda ninguna contraseña.
- **Se suman a la tuya**: los ajustes de una carpeta o de un perfil se ponen encima de los de tu propio fichero. Si tu fichero pone `MOODLE_URL` u otro ajuste, sigue valiendo ahí salvo que el de la carpeta también lo ponga.
- **Una cada vez**: todas comparten tu sesión. Dos sesiones de Codex usando moodle-mcp a la vez en el mismo Moodle no pueden abrirlo las dos: cierra una, o dale a una su propia carpeta de sesión con `MOODLE_MCP_PROFILE_DIR`.

Para quitar moodle-mcp de tu propio fichero: `codex mcp remove moodle`. Del fichero de una carpeta o de un perfil, borra sus secciones `[mcp_servers.moodle]`.
