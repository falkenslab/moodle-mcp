---
title: Pruebas
sidebar_label: Pruebas
---

# Pruebas

## Las pruebas se ejecutan en Docker

Las pruebas abren navegadores. Ejecútalas en un contenedor, para que no se abra nada en tu escritorio:

```bash
npm run test:docker
```

`test:docker` ejecuta `scripts/in-docker.mjs`, que envuelve cualquier comando de la misma forma: la imagen de Playwright, el repositorio montado con sus propios `node_modules` de Linux, un volumen para la caché de npm y sin pantalla. Si el Moodle de pruebas está en marcha, también se une a su red, con `localhost:8080` redirigido a él. Un solo archivo de pruebas:

```bash
node scripts/in-docker.mjs npx tsx --test test/tools/scopes.test.ts
```

Desde Git Bash en Windows, ponle delante `MSYS_NO_PATHCONV=1`, para que las rutas lleguen al contenedor tal como están escritas.

`npm test` ejecuta las mismas pruebas en tu máquina, con ventanas del navegador en tu escritorio.

La mayoría de las pruebas se ejecutan contra el **Moodle simulado** del driver, un pequeño servidor que responde como las páginas y los servicios de Moodle. Comprueban las entradas, las salidas y los límites de cada herramienta, y que las personas salen como alias.

## Un Moodle real para probar

[moodle-sandbox](https://github.com/falkenslab/moodle-sandbox) ejecuta Moodle en Docker en `http://localhost:8080`, con cursos de prueba y cuentas de docente y de alumno:

- El curso 3 (`mcp-content`) es de moodle-mcp: cámbialo libremente.
- El curso 2 (`sandbox-course`) se comparte con las pruebas de otros proyectos: solo léelo.

Inicia sesión con sus cuentas en el navegador que abre el servidor. Nunca pongas credenciales en el código, las pruebas ni la documentación.

Prueba también las herramientas nuevas contra el Moodle de pruebas, no solo contra el Moodle simulado: un campo que devuelve el driver y que falta en el esquema de salida de la herramienta hace que la llamada falle en un cliente real.

## Antes de un commit

```bash
npm run typecheck && npm run lint && npm run build && npm run test:docker
```

Más la comprobación de esquemas de [Desarrollo](./index.md#probar-el-servidor-a-mano): `tools/list --strict` no debe mostrar ningún aviso.

## Las capturas de la documentación

Las capturas de los casos de uso son reales: Claude Code y Codex, ejecutados en Docker en un terminal web contra el Moodle de pruebas, con Playwright escribiendo y fotografiando, y las páginas del propio Moodle con el resultado. `scripts/screenshots/` las regenera:

```bash
MOODLE_MCP_SHOTS_STATE=<carpeta> node scripts/screenshots/run.mjs              # todos los casos, en inglés y luego en español, y después las páginas de Moodle
MOODLE_MCP_SHOTS_STATE=<carpeta> node scripts/screenshots/run.mjs --only grading --langs en
MOODLE_MCP_SHOTS_STATE=<carpeta> node scripts/screenshots/run.mjs --moodle-only
```

- La carpeta de estado queda fuera del repositorio: `profile-teacher` y `profile-student`, con sesión iniciada en el Moodle de pruebas (lo hace la skill `sandbox-check`), y las transcripciones de las sesiones, para compararlas con lo que dice cada página.
- La ejecución copia en ella tus credenciales de Claude Code y Codex, de solo lectura en el contenedor, y las borra al terminar, pase lo que pase. Solo cambia el curso 3: antes de las sesiones de cada idioma, `seed.mjs` vuelve a dejar la entrega por calificar y una pregunta sin responder en el foro, y borra el cuestionario y la página de ese idioma.
- `scenarios.json` guarda, para cada caso de uso, el cliente, la cuenta, los ajustes y los turnos en los dos idiomas.
- Una sesión nueva puede comportarse distinto de la anterior, porque es un agente real: lee su transcripción y actualiza el texto de la página, nunca la imagen.
