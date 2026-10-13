-- Migración aditiva, repetible y sin cambios sobre registros existentes.
ALTER TABLE activos ADD COLUMN IF NOT EXISTS tenencia TEXT NOT NULL DEFAULT 'Por confirmar';
ALTER TABLE activos ADD COLUMN IF NOT EXISTS proveedor_alquiler TEXT;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS contrato_alquiler TEXT;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS inicio_alquiler DATE;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS devolucion_prevista DATE;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS valor_alquiler NUMERIC(14,2);
ALTER TABLE activos ADD COLUMN IF NOT EXISTS periodicidad_alquiler TEXT;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS responsable_mantenimiento TEXT;
ALTER TABLE activos ADD COLUMN IF NOT EXISTS estado_alquiler TEXT;
