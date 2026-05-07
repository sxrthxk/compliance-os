import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaNeon } from '@prisma/adapter-neon';

// Avoid creating multiple adapters/clients during hot reload in dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adapter: PrismaPg | undefined;
};

// Cache the adapter to prevent multiple connection pools
const adapter =
  globalForPrisma.adapter ??
  new PrismaPg({ connectionString: process.env.DATABASE_URL });
// new PrismaNeon({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') globalForPrisma.adapter = adapter;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
