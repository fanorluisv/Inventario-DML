# LICENCIAS DML

Aplicación web para administrar activos TI, responsables, licencias, mantenimiento, accesorios y documentos de entrega. Incluye una interfaz React/TypeScript y una API Node.js con PostgreSQL.

## Instalación local

Requisitos: Node.js 24, npm, PostgreSQL 16 y un cliente `pg_dump` compatible; Docker Compose es opcional para PostgreSQL.

1. Ejecutar `npm ci --prefix backend` y `npm ci --prefix frontend`.
2. Copiar `.env.example` a `.env` y `backend/.env.example` a `backend/.env`. Configurar claves propias y la conexión a PostgreSQL; los valores de ejemplo no son credenciales de producción.
3. Iniciar PostgreSQL con `docker compose up -d db`, o crear la base y ejecutar `backend/db/postgres-schema.sql` en una instalación local.
4. Seguir [la guía operacional](docs/backend-operativo.md) para crear el administrador inicial y ejecutar `./iniciar-operacional.sh`.
5. Abrir `http://127.0.0.1:5173/`. La variante `/?demo` utiliza datos ficticios.

## Validación

```bash
npm run build --prefix frontend
npm run lint --prefix frontend
node --test frontend/src/*.test.mjs
npm test --prefix backend
```

Las pruebas de integración con PostgreSQL requieren una instancia desechable configurada expresamente; consultar la guía operacional.

## Publicación

El repositorio incluye el código y los ejemplos de configuración. Los inventarios empresariales originales, antecedentes archivados, bases de datos, respaldos y secretos se conservan localmente y se excluyen mediante `.gitignore`. La maqueta independiente `maqueta-otra-empresa/` también queda excluida.

Consultar el [protocolo de publicación](docs/publicacion-github.md). Publicar el código en GitHub no despliega la aplicación ni transfiere los datos de PostgreSQL.
