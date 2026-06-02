# Migration: 20260602130000_factura_electronica

This migration updates the Factura and FacturaItem models to support Colombian electronic invoicing readiness:

- Adds `prefijo`, `estado`, `cufe`, `xmlPath`, `dianStatus`, `dianResponse` to `Factura`
- Adds `codigo`, `ivaPorcentaje`, `subtotal`, `total` to `FacturaItem`
- Migrates existing invoice item rows to computed line subtotal and total values
- Ensures default prefixes and electronic invoice states
