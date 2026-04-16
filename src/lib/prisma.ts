import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createPrismaClient(): PrismaClient {
  const dbUrl =
    process.env.DATABASE_URL ??
    `file:${path.join(process.cwd(), "prisma", "dev.db")}`;

  // Support Turso remote DB (libsql:// URL + TURSO_AUTH_TOKEN)
  const adapter = new PrismaLibSql({
    url: dbUrl,
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
