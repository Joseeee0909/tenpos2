BEGIN;

ALTER TABLE "public"."Configuracion"
  ADD COLUMN "email" TEXT NOT NULL DEFAULT '';

ALTER TABLE "public"."Configuracion"
  ALTER COLUMN "prefijo" SET DEFAULT 'POS';

UPDATE "public"."Configuracion"
SET "prefijo" = 'POS'
WHERE "prefijo" = 'POS - 1';

COMMIT;
