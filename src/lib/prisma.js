import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () { return Number(this); };
}

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const connectionTimeoutMillis = Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis) ? connectionTimeoutMillis : 10000,
    // Keep connections alive on remote DB — prevents "Connection terminated unexpectedly"
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    idleTimeoutMillis: 60000,
    max: 5,
  });
  pool.on('error', (err) => {
    console.error('[pg pool] idle client error:', err.message);
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma;
export default prisma;
