import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createDb } from "@estatisticas/db";
import { testDatabaseUrl } from "./test-database-url.ts";

export default async function setup() {
  await ensureDatabaseIsUp();
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("../../packages/db", import.meta.url)),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });
}

async function ensureDatabaseIsUp() {
  const db = createDb(testDatabaseUrl);
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    const { host } = new URL(testDatabaseUrl);
    throw new Error(`Postgres de teste fora do ar em ${host}: rode npm run db:up`);
  } finally {
    await db.$disconnect();
  }
}
