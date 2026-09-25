-- LICENCIAS DML - esquema operativo PostgreSQL
-- Ejecutar una sola vez en la base indicada por DATABASE_URL.
CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'lector' CHECK (rol IN ('administrador_ti','editor','lector')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS responsables (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  identificacion TEXT UNIQUE,
  cargo TEXT,
  estado TEXT NOT NULL DEFAULT 'ACT' CHECK (estado IN ('ACT','RET')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  marca TEXT,
  modelo TEXT,
  serial TEXT,
  fecha_adquisicion DATE,
  estado TEXT NOT NULL DEFAULT 'Buen estado',
  disponibilidad TEXT NOT NULL DEFAULT 'Libre' CHECK (disponibilidad IN ('Libre','Asignado','Baja')),
  responsable_id BIGINT REFERENCES responsables(id),
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activos_busqueda ON activos (tipo, estado, disponibilidad);

CREATE TABLE IF NOT EXISTS productos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'software',
  fabricante TEXT,
  version TEXT,
  archivado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS licencias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('perpetua','suscripcion','oem','libre','pendiente')),
  cantidad_comprada INTEGER CHECK (cantidad_comprada > 0),
  cupos_totales INTEGER CHECK (cupos_totales > 0),
  metrica TEXT NOT NULL DEFAULT 'equipo',
  serial TEXT,
  vencimiento DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmada','archivada')),
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asignaciones_licencia (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  licencia_id BIGINT NOT NULL REFERENCES licencias(id),
  activo_id BIGINT REFERENCES activos(id),
  responsable_id BIGINT REFERENCES responsables(id),
  cupos INTEGER NOT NULL DEFAULT 1 CHECK (cupos > 0),
  inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fin DATE,
  observaciones TEXT,
  CHECK (num_nonnulls(activo_id, responsable_id) = 1),
  CHECK (fin IS NULL OR fin >= inicio)
);
CREATE UNIQUE INDEX IF NOT EXISTS asignacion_licencia_activo_abierta
  ON asignaciones_licencia(licencia_id, activo_id) WHERE fin IS NULL AND activo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS credenciales (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  responsable_id BIGINT REFERENCES responsables(id),
  activo_id BIGINT REFERENCES activos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('equipo','correo','nas')),
  usuario TEXT NOT NULL,
  secreto_cifrado TEXT NOT NULL,
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (responsable_id IS NOT NULL OR activo_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id BIGINT REFERENCES app_users(id),
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id BIGINT,
  cambios_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
