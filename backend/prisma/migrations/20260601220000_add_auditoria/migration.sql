CREATE TABLE "public"."Auditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL DEFAULT '',
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "nivel" TEXT NOT NULL DEFAULT 'info',
    "metodo" TEXT,
    "ruta" TEXT,
    "statusCode" INTEGER,
    "duracionMs" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Auditoria_empresaId_createdAt_idx" ON "public"."Auditoria"("empresaId", "createdAt");
CREATE INDEX "Auditoria_empresaId_usuarioId_createdAt_idx" ON "public"."Auditoria"("empresaId", "usuarioId", "createdAt");
CREATE INDEX "Auditoria_empresaId_tipo_createdAt_idx" ON "public"."Auditoria"("empresaId", "tipo", "createdAt");
CREATE INDEX "Auditoria_empresaId_accion_createdAt_idx" ON "public"."Auditoria"("empresaId", "accion", "createdAt");

ALTER TABLE "public"."Auditoria" ADD CONSTRAINT "Auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
