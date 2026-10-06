# LICENCIAS DML — contexto, historial y recuperación

Documento solicitado por Fanor Vivas, administrador de TI. Creado el 06/10/2026.

## Proyecto y ubicaciones

Aplicación web de inventario de activos TI, licencias, responsables, mantenimiento,
accesorios, credenciales, usuarios y actas de entrega de DML Ingenieros Consultores SAS.
Repositorio: https://github.com/fanorluisv/Inventario-DML (rama principal `main`).
Carpeta local: `/home/ph/Documents/INVENTARIO`.
Codespace conocido: `legendary-lamp-4qv6qxjp9rwgc6p5`.
Carpeta remota: `/workspaces/Inventario-DML`.
Este documento es contexto técnico: no reemplaza el respaldo de PostgreSQL.
No contiene contraseñas ni claves privadas.

## Arquitectura

- Frontend React/TypeScript con Vite, puerto 5173; proxy `/api` hacia 3001.
- API Node.js/Express, `backend/operational.js`, puerto 3001.
- PostgreSQL 16; Docker Compose con volumen `licencias_pgdata`, puerto local 5433.
- Dependencias: Node.js 24, npm; Python 3 y GitHub CLI para respaldos y réplica.
- `inventario_integrado` guarda el estado JSONB y la revisión. Las credenciales se
  cifran con AES-256-GCM; se necesita la misma `CREDENTIALS_KEY` al recuperar.
- Equipos y responsables se sincronizan con sus tablas SQL originales.
- Los guardados validan referencias, duplicados, cupos, existencias y permisos;
  usan una transacción y control de revisión para evitar sobrescrituras simultáneas.
- Administrador TI administra todos los módulos; editor modifica inventario;
  lector consulta. Usuarios reales se administran desde la API.
- Las migraciones son aditivas. Los ejemplos de `/?demo` son independientes.

## Historial conocido

### Preparación y publicación

Se creó el inventario integrado, con conservación de datos empresariales originales,
controles de seriales e identificaciones duplicados, códigos por tipo de activo,
formularios, credenciales cifradas, actas, hoja de vida y reportes.
El código se publicó en GitHub; los datos y secretos quedaron fuera de Git.
Se configuró Codespaces con Node.js, Docker y PostgreSQL.

### 05/10/2026 — conexión e inicio

La aplicación local arrancó y respondió en 5173 y `/api/v1/salud`.
Se detectaron dos defectos locales: errores de clientes PostgreSQL inactivos podían
cerrar la API, y una falla temporal de base se interpretaba como sesión inválida.
La corrección y su prueba quedaron inicialmente en esta carpeta local; revisar
`git status` antes de trasladarlas, porque no fueron parte de los commits del acta.
El 404 del enlace de Codespaces persistió con otra página de prueba en 5180 y dos
navegadores. Cambiar de red resolvió el acceso: revisar red, proxy, VPN o filtrado
si el problema reaparece. Mantener el puerto 5173 privado.

### 05/10/2026 — acta y logo

Commit `870292a`: logo `frontend/src/assets/logodml.png` a la derecha del encabezado,
con celda que abarca las dos primeras filas. Se quitó «Pantalla integrada: Por confirmar».

### 06/10/2026 — arranque automático

Commit `921f168`: `postStartCommand` inicia la aplicación en segundo plano mediante
`.devcontainer/iniciar-automatico.sh`. El registro está en `.runtime/codespaces.log`.
Se evita ejecutar dos inicios automáticos simultáneos. Codespaces se suspende por
inactividad; el arranque automático no lo convierte en alojamiento permanente.

### 06/10/2026 — formato del acta

Commit `df72cec`: «PROCESOS DE APOYO» se movió encima de la primera fila como título
centrado. Actas en tamaño carta, márgenes de 10 mm, fuente y escala adaptadas a una
página. Hoja de vida conserva su formato A4.

### 06/10/2026 — fechas y edición

Commits `0f38dfe`, `04e3ad3`: fechas `dd/mm/aaaa`, ejemplo `06/10/2026`, almacenadas
como ISO. Edición de licencias y monitores; correcciones de actas, eventos y
entregas de accesorios con auditoría de valores anteriores y nuevos. Se conservan
identificadores y referencias originales; no se permite borrar el historial.
Equipos, responsables, credenciales y usuarios ya tenían edición.
Las correcciones de mantenimiento actualizan el plan cuando corresponda.

### 06/10/2026 — períodos y vencimientos

Commit `63593f6`: suscripciones con período de 1 a 100 años y vencimiento calculado
como inicio más años calendario. Ejemplo: 06/10/2026 + 2 años = 06/10/2028.
El 29 de febrero se ajusta al 28 cuando el año de destino no es bisiesto.
Licencias existentes sin período conservan su vencimiento hasta indicar uno.
Reporte con vencidas, próximas en 30 días, vigentes, perpetuas y sin fecha; CSV.
La API comprueba que período, inicio y vencimiento coincidan.

### 06/10/2026 — continuidad, respaldos y réplica

Se creó `backkupcode.md` en la carpeta local y su plantilla pública
`docs/contexto-proyecto.md`. El archivo generado se excluye de Git para que las
entradas automáticas no bloqueen actualizaciones del código. Las instrucciones
AGENTS.md piden documentar los cambios posteriores y sus pruebas.
Se implementaron archivos completos con código, cambios sin commit, historial
Git, `.env`, `backend/.env` y una base PostgreSQL en formato custom, más manifest
JSON y SHA256. Se excluyen dependencias regenerables, respaldos anteriores y
réplicas para evitar crecimiento recursivo.
La réplica del Codespace conserva versiones en `replica-codespace/` y un enlace
`latest`. La base local operacional no se sustituye automáticamente.
Servicio local de usuario instalado: `licencias-dml-replica.service`, cada 15
minutos mientras el computador esté encendido, con sesión iniciada y conexión.
No inicia automáticamente un Codespace detenido. El Codespace activo genera
respaldos cada hora, incluso si la API no está disponible; su suspensión sigue siendo la normal de GitHub.
Se verificó una descarga real con SHA256 y se restauraron los respaldos local y
remoto en bases temporales. La clave del respaldo remoto descifró correctamente
las credenciales restauradas sin mostrarlas. Se corrigió la transferencia de
rutas de scp y la extracción segura para Python local 3.11.2.
Destino adicional externo/nube: pendiente de elección del usuario. Las copias en
el mismo disco NO protegen ante pérdida del computador; los archivos privados no
están en GitHub. El contexto y los scripts sí están publicados.

## Archivos principales

- `frontend/src/App.tsx`: navegación, equipos y reportes.
- `frontend/src/Inventory.tsx`: monitores y licencias.
- `frontend/src/LicenseDates.tsx`, `LicenseReport.tsx`: períodos y vigencia.
- `frontend/src/DateField.tsx`, `dates.ts`: fechas completas.
- `frontend/src/EquipmentDocuments.tsx`: acta, hoja de vida y correcciones.
- `frontend/src/InventoryStore.ts`: guardado, revisiones y conflictos.
- `backend/inventory-service.js`, `inventory-validation.js`: persistencia y validación.
- `backend/backup-operational.js`: respaldo PostgreSQL custom antes del inicio.
- `docker-compose.yml`, `.devcontainer/`: entorno.
- `docs/backend-operativo.md`, `docs/codespaces.md`: operación y configuración.

## Pruebas realizadas

Compilación y lint aprobados. Pruebas de fechas, cupos, mantenimiento e identidad.
Integración contra una base temporal en 127.0.0.1:55439, sin tocar datos reales:
transacciones, permisos, concurrencia, correcciones y auditoría. Chrome verificó
registro, edición de licencia con año completo, período, vencimiento, reporte,
guardado y nuevo acceso. Ver los scripts de pruebas para repetirlas.

```bash
npm run build --prefix frontend
npm run lint --prefix frontend
node --test frontend/src/*.test.mjs
npm test --prefix backend
```

## Respaldo y réplica

- `python3 scripts/respaldo-proyecto.py`: respaldo completo LOCAL de código,
  historial Git, configuración privada y PostgreSQL.
- En Codespaces: `python3 scripts/respaldo-proyecto.py --docker`.
- `python3 scripts/sincronizar-codespace.py`: descarga un respaldo del Codespace y
  lo extrae en `replica-codespace/`, sin sustituir el proyecto local ni su base.
- `python3 scripts/sincronizar-codespace.py --watch`: repite cada 15 minutos;
  no inicia un Codespace detenido. El computador necesita estar encendido y conectado.
- `bash scripts/iniciar-replica-local.sh`: inicia el proceso en segundo plano.
- El proceso automático del Codespace crea respaldos cada hora mientras esté activo.
  No despierta el Codespace ni simula actividad para impedir su suspensión.
- Los archivos completos quedan en `backups/completos/` con permisos privados;
  contienen datos y `.env`, por eso NO se suben a Git.
- La plantilla pública es `docs/contexto-proyecto.md`; `backkupcode.md` se genera
  localmente para que su registro no interfiera con Git.
- `backkupcode.md` incorpora las operaciones realizadas por estos scripts y los
  commits nuevos. Los scripts conservan sus registros de errores en `.runtime/`.
  Una modificación sin commit se conserva en el archivo de respaldo, pero no se
  puede inferir automáticamente su motivo: documentarlo al realizar el trabajo.
- Copiar los archivos completos a un disco externo o almacenamiento independiente
  protege ante daño del PC. GitHub conserva el código publicado y este contexto,
  pero no la base de datos ni las claves privadas.

## Administrar la réplica automática de este equipo

```bash
systemctl --user status licencias-dml-replica.service
systemctl --user restart licencias-dml-replica.service
systemctl --user stop licencias-dml-replica.service
systemctl --user disable licencias-dml-replica.service
```

El servicio instalado en este equipo usa `/home/ph/Documents/INVENTARIO`; en otro
computador hay que instalarlo con la nueva ruta. No enviar contraseñas por chat.
El modo manual `bash scripts/iniciar-replica-local.sh` no instala un servicio de
inicio de sesión. Los errores se anotan en `.runtime/replica-local.log` y mantienen
la réplica anterior. Para generar el contexto si no existe, ejecutar un respaldo.

## Recuperación local o en otro computador

1. Elegir un archivo `backups/completos/*.tar.gz`; verificar su SHA256 con
   `sha256sum -c <archivo>.sha256` desde la carpeta del respaldo.
2. Extraer en una carpeta NUEVA con permisos privados; no encima de una instalación
   activa. El contenido queda dentro de `proyecto/` y `base-datos.dump`.
3. Instalar Node.js 24, Docker y npm. Conservar `.env` y `backend/.env` restaurados;
   no regenerar `CREDENTIALS_KEY` ni crear otro administrador.
4. Ejecutar `npm ci --prefix backend` y `npm ci --prefix frontend` desde `proyecto/`.
5. Revisar que `DATABASE_URL` de `backend/.env` coincida con la nueva base local.
   Si se usa Docker del proyecto, `docker compose up -d db` crea una base nueva.
6. Restaurar exclusivamente en esa base NUEVA:

```bash
docker compose exec -T db sh -c 'pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ../base-datos.dump
```

Este comando reemplaza objetos de la base elegida: no ejecutarlo contra una base
con datos que se deban conservar. El respaldo ya incluye el administrador.

7. Actualizar `FRONTEND_ORIGIN` a `http://127.0.0.1:5173` al trabajar localmente.
8. Ejecutar `bash iniciar-operacional.sh --docker`, abrir 5173 y verificar los
   módulos y las credenciales con el usuario existente.
9. Para volver a Codespaces, actualizar el código desde Git, trasladar un respaldo
   completo y restaurar base y claves como conjunto. No mezclar las bases local y
   remota automáticamente: podrían tener inventarios distintos.

## Continuidad para próximas sesiones

Leer este archivo, AGENTS.md, los documentos operacionales y `git status`.
El usuario quiere que las mejoras se publiquen en GitHub para su Codespace y
queden también respaldadas localmente. Anotar cambios concretos y pruebas aquí.
No dar por aplicado un cambio remoto solo por editar esta carpeta local.
No guardar secretos en este documento. No sobrescribir trabajo local o remoto.

## Registro automático de respaldo y sincronización

