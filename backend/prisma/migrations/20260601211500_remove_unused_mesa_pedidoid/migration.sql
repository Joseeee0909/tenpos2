-- Drop the unused one-off pointer from Mesa to Pedido.
-- Active/previous orders are represented by Pedido.mesaId through the MesaPedidos relation.
DROP INDEX IF EXISTS "public"."Mesa_pedidoId_key";
ALTER TABLE "public"."Mesa" DROP COLUMN IF EXISTS "pedidoId";

-- Empresa.slug is already indexed by the unique constraint.
DROP INDEX IF EXISTS "public"."Empresa_slug_idx";
