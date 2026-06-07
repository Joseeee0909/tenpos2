import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

/**
 * Runtime usa DATABASE_URL del schema (pooler).
 * DIRECT_URL solo lo usa `prisma migrate` vía schema.directUrl / prisma.config.ts.
 *
 * Supabase + Express (servidor persistente): Session pooler :5432 en DATABASE_URL.
 * Supabase + serverless: Transaction pooler :6543 con ?pgbouncer=true
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;