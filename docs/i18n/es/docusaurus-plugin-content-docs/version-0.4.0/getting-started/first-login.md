---
title: Iniciar sesión la primera vez
sidebar_label: Primer inicio de sesión
---

# Iniciar sesión la primera vez

moodle-mcp nunca te pide la contraseña. Inicias sesión tú mismo, una vez, en una ventana del navegador que abre.

## Qué pasa

1. **Pides algo en Moodle**, como "lista mis cursos de Moodle".
2. **El agente ve que aún no hay sesión.** moodle-mcp abre una ventana del navegador en la página de acceso de tu sitio, y el agente te dice que inicies sesión ahí.
3. **Inicias sesión como siempre**, con tu usuario y contraseña, el inicio de sesión único de tu centro, la verificación en dos pasos o lo que use tu sitio.

   <Screenshot app="Moodle" src="/img/moodle/login.png" alt="La página de acceso de Moodle, en la ventana que abre moodle-mcp" />

4. **La ventana se cierra sola** en cuanto entras, y el agente sigue con lo que le pediste. moodle-mcp espera hasta 5 minutos a que inicies sesión.

A partir de ahí, el agente trabaja sin ventana, en segundo plano.

## Cuánto dura la sesión

La sesión se guarda en un perfil del navegador en tu ordenador, en la carpeta `.moodle-mcp/profile` de tu carpeta personal. Dura lo que Moodle la mantenga activa, normalmente días o semanas, como cuando marcas *Recordarme* en tu navegador.

Cuando Moodle la termina (porque ha caducado, o porque has cerrado sesión en Moodle desde otro sitio con *Cerrar todas las sesiones*), la siguiente petición vuelve a abrir la ventana de acceso.

Para terminarla tú, pídele al agente que **cierre la sesión de Moodle**.

:::warning Mantén el perfil en privado
La carpeta del perfil guarda una sesión de Moodle activa, que vale tanto como tu contraseña mientras dure. No la copies en carpetas compartidas, unidades en la nube ni repositorios.
:::

## Sin dirección del sitio

Si no pusiste `MOODLE_URL` al añadir moodle-mcp, el agente te pide tu sitio la primera vez. También puedes decírselo tú:

> Usa el sitio Moodle https://campus.example.org.

Mantiene ese sitio hasta que se reinicia la aplicación de IA. Para que sea permanente, añade `MOODLE_URL` a la configuración ([Ajustes](../settings.md)).

## Más de un sitio o cuenta

Cada carpeta de perfil guarda una sesión. Para usar dos sitios Moodle, o dos cuentas en el mismo sitio (por ejemplo, tu cuenta de docente y un alumno de prueba), añade moodle-mcp dos veces con nombres distintos, y dale a cada uno su propio `MOODLE_MCP_PROFILE_DIR`:

```bash
claude mcp add moodle-campus -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
claude mcp add moodle-test -e MOODLE_URL=https://test.example.org -e MOODLE_MCP_PROFILE_DIR=~/.moodle-mcp/test -- npx -y @falkenslab/moodle-mcp
```
