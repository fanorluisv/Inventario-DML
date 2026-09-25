-- Enforce new identities without deleting or silently merging legacy duplicates.
CREATE OR REPLACE FUNCTION dml_identification_key(value TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT upper(regexp_replace(coalesce(value,''), '[[:space:].-]', '', 'g')) $$;
CREATE OR REPLACE FUNCTION dml_serial_key(value TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT upper(regexp_replace(coalesce(value,''), '[[:space:]]', '', 'g')) $$;
CREATE OR REPLACE FUNCTION dml_guard_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE identity_key TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(76192001);
  IF TG_TABLE_NAME = 'activos' THEN
    identity_key := dml_serial_key(NEW.serial);
    IF TG_OP = 'UPDATE' AND identity_key = dml_serial_key(OLD.serial) THEN RETURN NEW; END IF;
    IF identity_key <> '' AND EXISTS (SELECT 1 FROM activos WHERE id <> NEW.id AND dml_serial_key(serial) = identity_key) THEN
      RAISE EXCEPTION 'El serial ya pertenece a otro equipo.' USING ERRCODE = '23505';
    END IF;
  ELSE
    identity_key := dml_identification_key(NEW.identificacion);
    IF TG_OP = 'UPDATE' AND identity_key = dml_identification_key(OLD.identificacion) THEN RETURN NEW; END IF;
    IF identity_key <> '' AND EXISTS (SELECT 1 FROM responsables WHERE id <> NEW.id AND dml_identification_key(identificacion) = identity_key) THEN
      RAISE EXCEPTION 'La identificación ya pertenece a otro responsable.' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER dml_serial_identity BEFORE INSERT OR UPDATE OF serial ON activos
FOR EACH ROW EXECUTE FUNCTION dml_guard_identity();
CREATE OR REPLACE TRIGGER dml_person_identity BEFORE INSERT OR UPDATE OF identificacion ON responsables
FOR EACH ROW EXECUTE FUNCTION dml_guard_identity();
