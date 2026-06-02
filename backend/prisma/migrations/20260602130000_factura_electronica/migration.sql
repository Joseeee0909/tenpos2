BEGIN;

ALTER TABLE "public"."Factura"
  ADD COLUMN "prefijo" TEXT DEFAULT 'POS';

ALTER TABLE "public"."Factura"
  ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'GENERADA';

ALTER TABLE "public"."Factura"
  ADD COLUMN "cufe" TEXT;

ALTER TABLE "public"."Factura"
  ADD COLUMN "xmlPath" TEXT;

ALTER TABLE "public"."Factura"
  ADD COLUMN "dianStatus" TEXT;

ALTER TABLE "public"."Factura"
  ADD COLUMN "dianResponse" JSONB;

ALTER TABLE "public"."FacturaItem"
  ADD COLUMN "codigo" TEXT;

ALTER TABLE "public"."FacturaItem"
  ADD COLUMN "ivaPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 19;

ALTER TABLE "public"."FacturaItem"
  ADD COLUMN "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "public"."FacturaItem"
  ADD COLUMN "total" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "public"."FacturaItem"
SET
  "subtotal" = ROUND("precio" * "cantidad"::numeric, 2),
  "total" = ROUND(("precio" * "cantidad"::numeric) * 1.19, 2),
  "ivaPorcentaje" = 19
WHERE "subtotal" = 0 OR "total" = 0;

UPDATE "public"."Factura"
SET "prefijo" = 'POS'
WHERE "prefijo" IS NULL;

COMMIT;
