---
name: inicializar
description: Inicializa la sesión de Gemini CLI cargando el contexto del proyecto desde contexto.md. Úsalo al iniciar un nuevo chat o cuando necesites refrescar el historial y el estado actual del inventario de LICENCIAS DML.
---

# Skill: Inicializar Proyecto

Esta skill permite a Gemini CLI sincronizarse con el estado actual del proyecto "LICENCIAS DML" utilizando el archivo `contexto.md` como fuente de verdad.

## Flujo de Trabajo

### 1. Carga de Contexto
Cuando el usuario solicite inicializar o cuando comiences una sesión en este workspace, debes:
- Leer el archivo `contexto.md` en la raíz del proyecto.
- Identificar el último estado del proyecto, la arquitectura y los próximos pasos.
- Proporcionar un breve resumen al usuario confirmando que estás al tanto del progreso.

### 2. Actualización de Contexto
Después de realizar cambios significativos (como crear nuevos módulos, migrar datos o cambiar la arquitectura):
- Actualiza la sección `## Historial de Cambios (Log)` en `contexto.md` con la fecha actual y una descripción breve del cambio.
- Si los `Próximos Pasos` cambian, actualiza esa sección también.

### 3. Registro de Decisiones
Cualquier decisión técnica importante (ej. elección de base de datos) debe quedar registrada en `contexto.md`.

## Instrucciones para Gemini
- Sé conciso en el resumen de inicialización.
- Mantén el formato Markdown de `contexto.md` intacto.
- No borres el historial previo en el log, añade las nuevas entradas al principio o final según la convención establecida.
