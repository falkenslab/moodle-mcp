---
title: Versiones
sidebar_label: Versiones
---

# Versiones

moodle-mcp está en npm como [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp). Con `npx -y @falkenslab/moodle-mcp`, tu aplicación de IA arranca cada vez la última versión. Para quedarte en una versión, escríbela después del nombre: `npx -y @falkenslab/moodle-mcp@0.3.0`.

La documentación de cada versión se conserva: elígela en el menú de versiones de la parte de arriba de la página. Las notas completas están en [GitHub](https://github.com/falkenslab/moodle-mcp/releases).

## 0.3.0 (14 de octubre de 2026)

- **Varios sitios Moodle en un servidor.** Dale los sitios de tu instituto y de tu universidad en `MOODLE_MCP_SITES`, o añade uno mientras hablas (`add_site`); el agente trabaja en uno cada vez y cambia cuando se lo pides (`list_sites`, `use_site`, `remove_site`). Cada sitio conserva su propio inicio de sesión. `MOODLE_URL` funciona como antes, como primer sitio. Consulta [Varios sitios](./several-sites.md).
- **Copiar contenido de cursos entre sitios.** `copy_between_sites` copia actividades, secciones o un curso entero de un sitio a otro, con la copia de seguridad y la restauración del propio Moodle, sin datos de personas y sin pasar por la IA, y te dice qué ha creado y qué queda por arreglar.
- **Copia de seguridad y restauración de parte de un curso.** `backup_course` admite las secciones o actividades que quieres guardar, sin datos de personas; `restore_course` las coloca en la sección que elijas y te dice qué ha creado y qué ha quedado roto.
- **Ocho listas largas más por páginas**: conversaciones, debates y sus mensajes, entregas, participantes, resultados de cuestionarios y bancos de preguntas.
- **El acceso de solo lectura conserva `download_file` y `export_grades`**, que solo leen Moodle y guardan un fichero en tu ordenador.
- **`MOODLE_URL` puede ser cualquier página de tu sitio**, como la dirección de un curso, como decía la documentación.
- Con moodle-driver 0.8, que además empieza cuestionarios con límite de tiempo.

## 0.2.0 (12 de octubre de 2026)

- **Listas largas por páginas.** Las notificaciones llegan de 30 en 30 y los registros del curso de 50 en 50, y el agente pide más cuando las necesita, así que una cuenta con mucha actividad ya no inunda a la IA con decenas de miles de caracteres. Además, cada entrada de los registros es más corta: la descripción larga de Moodle solo sale si se pide.
- **Leer las entregas no cambia nada.** Leer las entregas de una tarea ya no crea entregas vacías en Moodle. Sigue apareciendo en los registros de Moodle como que has visto las páginas de calificación, igual que con el calificador de Moodle.
- **Más claro para el agente.** Se explican todos los estados de una entrega (como `new`: empezada, todavía sin contenido), y se aclara que el progreso del curso y la finalización de las actividades solo llegan a los alumnos, en los cursos que los siguen.
- Con moodle-driver 0.7.

La primera versión.

- 137 herramientas sobre Moodle: cursos y contenido, el ciclo de vida del curso (copiar, hacer copia de seguridad, restaurar, importar, reiniciar), tareas y calificación (rúbricas, flujo de trabajo de calificación, prórrogas), cuestionarios y bancos de preguntas, el calificador, participantes, grupos y matriculaciones, informes y registros, foros, talleres, mensajes, el calendario y actividades como alumno (cuestionarios, tareas, encuestas, consultas, lecciones, H5P, SCORM).
- Inicias sesión tú mismo, en una ventana del navegador que abre. Nunca ve tu contraseña.
- Por defecto, el alumnado llega a la IA como alias. `block` mantiene sus datos fuera por completo, y `clear` muestra los nombres, para un modelo en tu propio ordenador.
- Límites que solo tú puedes relajar: un rol, el acceso de solo lectura y los ámbitos.
- Herramientas del navegador para lo que no cubre ninguna otra herramienta, como un plugin o el contenido de un paquete SCORM.

Probado con Moodle 5.x.
