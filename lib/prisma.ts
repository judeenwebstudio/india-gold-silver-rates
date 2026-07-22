import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client.");
  }

  const applicationUrl = new URL(connectionString);
  applicationUrl.searchParams.delete("sslmode");
  applicationUrl.searchParams.delete("uselibpqcompat");

  const adapter = new PrismaPg({
    connectionString: applicationUrl.toString(),
    connectionTimeoutMillis: 5_000,
    // Supabase connections remain encrypted while accommodating certificate
    // chains that are not trusted by the local Node.js certificate store.
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
