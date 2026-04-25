import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () { return Number(this); };
}

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const connectionTimeoutMillis = Number(process.env.PG_CONNECT_TIMEOUT_MS || 5000);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis) ? connectionTimeoutMillis : 5000,
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma;
export default prisma;
