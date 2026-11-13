import { createDb } from "@estatisticas/db";

export function testDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida para os testes");
  return createDb(url);
}

export async function resetDatabase(db: ReturnType<typeof createDb>) {
  await db.$executeRawUnsafe("TRUNCATE matches, teams, leagues, collection_state RESTART IDENTITY CASCADE");
}
