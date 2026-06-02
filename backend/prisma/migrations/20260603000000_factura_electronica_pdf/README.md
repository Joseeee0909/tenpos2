# Migration: 20260603000000_factura_electronica_pdf

This migration adds the missing email field to the Configuracion model and standardizes the default invoice prefix to `POS` for consistency with DIAN-ready numbering.

Changes:
- Adds `email` to `Configuracion`
- Sets `Configuracion.prefijo` default to `POS`
- Updates existing rows with `POS - 1` to `POS`
