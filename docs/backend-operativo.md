# Inventario operacional integrado

La entrada http://127.0.0.1:5173/ usa autenticación y PostgreSQL. La dirección `/?demo` conserva la maqueta separada con datos ficticios del navegador.

## Iniciar o reiniciar

Si están ejecutándose la API o Vite anteriores, detener sus terminales con Ctrl+C. Mantener PostgreSQL iniciado.

```bash
./iniciar-operacional.sh
```

Este comando crea un respaldo antes de iniciar la API integrada y el frontend. Abrir http://127.0.0.1:5173/ e ingresar con el usuario habitual. Detener con Ctrl+C.

Si se usa Docker y el cliente de respaldo local no coincide con el servidor:

```bash
sudo -v
./iniciar-operacional.sh --docker --sudo
```

En este equipo se dejó el cliente oficial PostgreSQL 16.15 en `.tools/postgresql-16/bin/`, obtenido del repositorio oficial de PostgreSQL, para respaldar el servidor 16 sin cambiar paquetes del sistema. `.tools/` no se incluye en Git. En otro equipo, instalar un `pg_dump` compatible o usar la opción Docker. `PG_DUMP` permite indicar una ruta alternativa.

Los respaldos están en `backups/`, con permisos restringidos y excluidos de Git. Son archivos estándar de `pg_dump` en formato custom. Conservar también `backend/.env` de forma segura: `CREDENTIALS_KEY` es necesaria para descifrar las credenciales después de una restauración. No regenerar esa clave en una base que ya contiene credenciales.

El campo opcional **Descripción** del equipo (hasta 120 caracteres) se edita en Registrar/Editar equipo y aparece en la ficha y el CSV. Se guarda como `description` en el inventario integrado y como `activos.descripcion` en PostgreSQL. Al iniciar se añade la columna si falta; los equipos anteriores pueden conservar la descripción vacía.

El registro y edición de equipos incluye búsqueda con sugerencias de sistema operativo, casilla de SO licenciado y referencia obligatoria para tarjeta dedicada. Estos datos se conservan en `inventario_integrado.datos.equipos` (`os`, `osLicensed`, `gpuReference`) y aparecen en ficha/CSV. Los registros anteriores sin indicación de licencia se muestran como «Por confirmar». NAS está disponible como tipo de equipo con prefijo `DML-NAS-`.

## Funciones disponibles

- Inicio, indicadores, búsquedas, filtros por columnas y calidad de datos.
- Registro y edición de equipos, código por tipo, ficha técnica, responsable, ubicación, adquisición, observaciones y bajas.
- Monitores independientes, asignación y movimientos.
- Licencias por lotes, cantidad, serial, adquisición, vencimiento, cupos, asignación y liberación. Una unidad representa un equipo; las condiciones contractuales se verifican por separado.
- Responsables e identificación; alta de personas antes de asignarles equipos. En Registrar/Editar equipo, el selector permite elegir uno existente o crear uno nuevo sin salir del formulario. El nuevo responsable y su asignación se guardan juntos al guardar el equipo; cancelar descarta el alta pendiente.
- Mantenimiento semestral, fechas e historial de intervenciones.
- Bodega, existencias, entregas vinculadas al acta y devoluciones.
- Actas con copia de los activos entregados, hoja de vida, fotografías JPG/PNG e impresión/PDF. Las correcciones de actas, eventos, licencias, monitores y entregas de accesorios conservan sus códigos y registran valores anteriores y nuevos en auditoría. Las actas conservan los activos originales y el historial no se puede borrar.
- Fechas de formularios y documentos en `dd/mm/aaaa` (por ejemplo, `06/10/2026`), almacenadas en PostgreSQL en formato ISO. Editar una licencia conserva sus cupos asignados; la cantidad no puede reducirse por debajo de las asignaciones existentes.
- Suscripciones con período de 1 a 100 años: vencimiento igual a fecha de adquisición/inicio más años calendario; el 29 de febrero se ajusta al 28 cuando corresponda. Las licencias existentes sin período conservan su fecha registrada. En Reportes se consultan vencidas, próximas a vencer en 30 días, vigentes, perpetuas y sin fecha, con exportación CSV.
- Reportes y CSV con los filtros aplicados.
- Historial real de cambios de responsable desde la integración. No se inventan movimientos anteriores.
- Credenciales de equipo, correo y NAS, cifradas y exclusivas del administrador.
- Usuarios reales: alta, contraseña, perfil y habilitación. Para retirar acceso se deshabilita el usuario, conservando su historial.

## Identidad y duplicados

`activos.responsable_id` referencia el ID de `responsables`: cada equipo tiene un solo responsable actual; un responsable puede tener varios equipos. Cambiar el responsable conserva el equipo y registra el movimiento.

La API impide repetir seriales entre equipos y monitores, o cédulas entre responsables. Compara seriales sin espacios y sin distinguir mayúsculas; las cédulas también se comparan sin puntos ni guiones. Los valores vacíos representan datos pendientes y no se consideran identidades duplicadas.

Al iniciar, `db/identity-guards.sql` instala controles en PostgreSQL para impedir insertar o cambiar seriales de equipos e identificaciones de responsables por valores ya utilizados, también con escrituras simultáneas. No elimina ni fusiona registros anteriores. Los duplicados previos que aparezcan al guardar deben corregirse; las relaciones existentes conservan sus IDs. Los seriales de equipos retirados siguen reservados.

Activos TI muestra una fila de total, asignados y disponibles tanto en Equipos como en Monitores, calculada sobre los resultados filtrados.

## Guardado y permisos

Los cambios se envían automáticamente al servidor. Esperar **Todos los cambios guardados** en la barra superior antes de cerrar la ventana. Cerrar sesión espera a que termine el guardado. Un fallo muestra un aviso y conserva el borrador en memoria; no se presenta como guardado.

Si otra sesión guardó primero, se rechaza el cambio para evitar sobrescrituras. El aviso permite volver al acceso y cargar la versión actual, descartando el borrador solo después de confirmarlo. Los borradores operacionales no se guardan en `localStorage`.

Administrador TI: todos los módulos. Editor: inventario, documentos y reportes, sin credenciales ni usuarios. Solo reportes: consulta y exportación. El servidor comprueba el usuario activo y su rol en cada petición, incluso para sesiones ya abiertas.

## Conservación de datos existentes

La migración añade `inventario_integrado` y `historial_responsables`; no elimina ni vacía tablas previas. En el primer acceso incorpora los equipos, responsables, licencias y credenciales existentes. No importa ejemplos de la maqueta ni el archivo `ACTIVOSTI.md` automáticamente.

`inventario_integrado.datos` es un documento JSONB de PostgreSQL con los módulos de la interfaz. Las credenciales se almacenan por separado, cifradas con AES-256-GCM. Equipos y responsables también se mantienen sincronizados con sus tablas anteriores; los identificadores internos existentes y los cargos se conservan. Los módulos de licencias y sus asignaciones usan el documento integrado como fuente actual después de la importación; las tablas de licencias anteriores permanecen como origen histórico. No editar esas tablas directamente esperando modificar la interfaz nueva.

Cada guardado valida relaciones, cupos, saldos y documentos, y usa una única transacción con número de revisión. Se registra actor y módulos modificados en `auditoria`, sin contraseñas. Los documentos y eventos ya guardados no se sobrescriben. Al eliminar un equipo sin asociaciones se conserva su fila anterior como baja y su código queda reservado.

La interfaz heredada identifica responsables por nombre; usar nombres distinguibles para homónimos. Si la base previa contiene asignaciones de licencias por persona, la importación se detiene para adaptarlas sin perder datos. Los archivos de imagen se envían solo cuando cambian; el límite por fotografía es 3 MB y el de cada petición es 32 MB.

## API implementada

- `GET /api/v1/salud`: incluye `version: integrado-v1`.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
- `GET /api/v1/inventario`: módulos, revisión, movimientos y códigos reservados; sin contraseñas.
- `PUT /api/v1/inventario`: revisión y cambios de módulos/fotos; escritura transaccional. Credenciales opcionales, solo para administrador.
- `GET /api/v1/inventario/credenciales`: acceso exclusivo de administrador, sin caché y auditado.
- `GET/POST /api/v1/users`, `PUT /api/v1/users/:id`: gestión de accesos reales.
- Los POST anteriores a `/activos`, `/responsables` y `/credenciales` se bloquean para evitar escrituras que omitan el control de revisión. Usar los formularios nuevos.

## Comprobaciones

```bash
npm run build --prefix frontend
npm run lint --prefix frontend
node --test frontend/src/*.test.mjs
npm test --prefix backend
```

La prueba real de PostgreSQL es optativa para no tocar una base por accidente. Requiere una instancia desechable en `127.0.0.1:55439`; crea y elimina un esquema exclusivo:

```bash
TEST_INVENTORY_DATABASE_URL=postgresql://ph@127.0.0.1:55439/postgres \
TEST_CHROME=/ruta/a/chrome \
node --test backend/integration.test.js
```

Con `TEST_CHROME` se verifica además el navegador sobre la compilación de `frontend/dist`: registro de equipo/licencia, cierre y nuevo acceso, consulta de hoja de vida, ausencia de almacenamiento local y navegación de lector.

## Primera instalación en otro equipo

Requiere Node.js 24, PostgreSQL y las dependencias de ambas carpetas. Configurar `.env` y `backend/.env` usando sus ejemplos, con claves propias. Docker crea el esquema inicial desde `backend/db/postgres-schema.sql`; para PostgreSQL instalado directamente, ejecutar ese SQL primero. La ruta `POST /api/v1/users/bootstrap` permite crear el administrador solo si aún no hay usuarios. No repetir el bootstrap en la base existente.
