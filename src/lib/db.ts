import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // En produccion con Turso: adapter libSQL (conexion solo si hay variables)
  if (tursoUrl && tursoToken) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter } as any);
    } catch {
      // Si falla el adapter, caer a SQLite local
    }
  }

  // Desarrollo local o fallback: SQLite
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
