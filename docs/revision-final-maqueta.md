# Revisión de cierre de la maqueta

Fecha: 14 de septiembre de 2026.

## Listo para revisión funcional

- Equipos, monitores, licencias, responsables, credenciales, usuarios, accesorios, actas, hojas de vida, bajas y plan semestral.
- Autocompletado en el registro de equipos para marca, modelo, responsable, ubicación, área, procesador, RAM, almacenamiento, sistema operativo y pantalla. Las sugerencias salen de los valores ya registrados.
- El sistema operativo integrado permanece en la ficha del equipo y no consume cupos del menú Licencias.
- La Hoja de vida es el formulario visible para registrar mantenimientos; Mantenimiento calcula la próxima fecha seis meses después.
- Bajas conserva el historial y separa equipos no operativos.
- Cambios de la maqueta persisten en el almacenamiento local del navegador.

## Inconsistencias o pendientes antes de datos reales

1. El almacenamiento local no es una base compartida ni un respaldo. Cada navegador puede tener una copia distinta y borrar los datos del sitio los elimina.
2. La autenticación y los permisos configurados en Usuarios todavía no se aplican en un servidor. Las credenciales se guardan en el navegador y no deben ser reales.
3. Actas y hojas de vida se generan para imprimir, pero no existe un repositorio documental ni control de versiones/firma.
4. El tipo y número de identificación de responsables están separados del equipo, pero no hay un catálogo único de personas con prevención completa de duplicados por documento.
5. La maqueta conserva campos internos de mantenimiento en el registro del equipo para compatibilidad; la interfaz de Activos TI ya no los muestra. Antes de producción deben migrarse a una única fuente basada en eventos de Hoja de vida.
6. Los movimientos de licencias y accesorios funcionan en memoria/localStorage, sin transacciones de servidor ni control de concurrencia.
7. No existe todavía importación conciliada de `ACTIVOSTI.md` y `LICENCIASDML.md`; los datos actuales siguen siendo demostrativos.
8. Deben definirse con Fanor los motivos de baja, autorizador, fecha de baja, disposición final y posibilidad de restaurar un activo.

## Orden recomendado para iniciar datos reales

1. Implementar API y SQLite compartida en Linux.
2. Agregar autenticación, roles efectivos y cifrado de credenciales.
3. Diseñar respaldo automático y una prueba de restauración.
4. Migrar el modelo validado, con auditoría y baja lógica.
5. Importar candidatos Markdown en una bandeja de revisión; no convertirlos directamente en saldos confirmados.
6. Registrar primero responsables y equipos; después monitores, licencias y accesorios; generar actas únicamente después de validar identificación y asignaciones.
