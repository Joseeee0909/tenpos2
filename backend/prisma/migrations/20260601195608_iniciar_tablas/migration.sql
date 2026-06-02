-- CreateTable
CREATE TABLE "public"."Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "idusuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rolId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Rol" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "idrol" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "permisos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "idproducto" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "categoria" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mesa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 4,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "pedidoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pedido" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "meseroId" TEXT,
    "responsable" TEXT NOT NULL DEFAULT 'Sin asignar',
    "total" DECIMAL(12,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Venta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "pedidoId" TEXT,
    "mesa" INTEGER,
    "cliente" TEXT NOT NULL DEFAULT '',
    "meseroId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "propina" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'Efectivo',
    "estado" TEXT NOT NULL DEFAULT 'completada',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Factura" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "emisor" JSONB NOT NULL,
    "cliente" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "ivaTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "propina" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "ventaId" TEXT,
    "pedidoId" TEXT,
    "meseroId" TEXT,
    "mesa" INTEGER,
    "pdfPath" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FacturaItem" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FacturaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Configuracion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL DEFAULT 'facturacion',
    "nombre" TEXT NOT NULL DEFAULT 'SIIGO S.A.S',
    "nit" TEXT NOT NULL DEFAULT '800200100-0',
    "direccion" TEXT NOT NULL DEFAULT 'Cali, Colombia',
    "telefono" TEXT NOT NULL DEFAULT '',
    "resolucion" TEXT NOT NULL DEFAULT '',
    "autorizada" TEXT NOT NULL DEFAULT '',
    "prefijo" TEXT NOT NULL DEFAULT 'POS - 1',
    "responsable" TEXT NOT NULL DEFAULT 'Responsable de IVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_slug_key" ON "public"."Empresa"("slug");

-- CreateIndex
CREATE INDEX "Empresa_slug_idx" ON "public"."Empresa"("slug");

-- CreateIndex
CREATE INDEX "Usuario_empresaId_rolId_idx" ON "public"."Usuario"("empresaId", "rolId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empresaId_idusuario_key" ON "public"."Usuario"("empresaId", "idusuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empresaId_username_key" ON "public"."Usuario"("empresaId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empresaId_email_key" ON "public"."Usuario"("empresaId", "email");

-- CreateIndex
CREATE INDEX "Rol_empresaId_activo_idx" ON "public"."Rol"("empresaId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_empresaId_idrol_key" ON "public"."Rol"("empresaId", "idrol");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_empresaId_nombre_key" ON "public"."Rol"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "Product_empresaId_categoria_idx" ON "public"."Product"("empresaId", "categoria");

-- CreateIndex
CREATE INDEX "Product_empresaId_disponible_idx" ON "public"."Product"("empresaId", "disponible");

-- CreateIndex
CREATE UNIQUE INDEX "Product_empresaId_idproducto_key" ON "public"."Product"("empresaId", "idproducto");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_pedidoId_key" ON "public"."Mesa"("pedidoId");

-- CreateIndex
CREATE INDEX "Mesa_empresaId_estado_idx" ON "public"."Mesa"("empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_empresaId_numero_key" ON "public"."Mesa"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "Pedido_empresaId_estado_idx" ON "public"."Pedido"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "Pedido_empresaId_mesaId_idx" ON "public"."Pedido"("empresaId", "mesaId");

-- CreateIndex
CREATE INDEX "Pedido_empresaId_fecha_idx" ON "public"."Pedido"("empresaId", "fecha");

-- CreateIndex
CREATE INDEX "PedidoItem_pedidoId_idx" ON "public"."PedidoItem"("pedidoId");

-- CreateIndex
CREATE INDEX "PedidoItem_productoId_idx" ON "public"."PedidoItem"("productoId");

-- CreateIndex
CREATE INDEX "Venta_empresaId_estado_idx" ON "public"."Venta"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "Venta_empresaId_fecha_idx" ON "public"."Venta"("empresaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_empresaId_numero_key" ON "public"."Venta"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "VentaItem_ventaId_idx" ON "public"."VentaItem"("ventaId");

-- CreateIndex
CREATE INDEX "VentaItem_productoId_idx" ON "public"."VentaItem"("productoId");

-- CreateIndex
CREATE INDEX "Factura_empresaId_fecha_idx" ON "public"."Factura"("empresaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_empresaId_numero_key" ON "public"."Factura"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "FacturaItem_facturaId_idx" ON "public"."FacturaItem"("facturaId");

-- CreateIndex
CREATE INDEX "FacturaItem_productoId_idx" ON "public"."FacturaItem"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_empresaId_key" ON "public"."Configuracion"("empresaId");

-- CreateIndex
CREATE INDEX "Configuracion_empresaId_clave_idx" ON "public"."Configuracion"("empresaId", "clave");

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "public"."Rol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rol" ADD CONSTRAINT "Rol_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mesa" ADD CONSTRAINT "Mesa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "public"."Mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pedido" ADD CONSTRAINT "Pedido_meseroId_fkey" FOREIGN KEY ("meseroId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoItem" ADD CONSTRAINT "PedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_meseroId_fkey" FOREIGN KEY ("meseroId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "public"."Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factura" ADD CONSTRAINT "Factura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factura" ADD CONSTRAINT "Factura_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "public"."Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factura" ADD CONSTRAINT "Factura_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factura" ADD CONSTRAINT "Factura_meseroId_fkey" FOREIGN KEY ("meseroId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacturaItem" ADD CONSTRAINT "FacturaItem_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "public"."Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FacturaItem" ADD CONSTRAINT "FacturaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Configuracion" ADD CONSTRAINT "Configuracion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "public"."Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
