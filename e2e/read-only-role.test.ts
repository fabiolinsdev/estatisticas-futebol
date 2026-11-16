import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@estatisticas/collector";
import { fakeSource, midSeason } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(async () => {
  await resetDatabase(db);
  await ingest({ db, source: fakeSource({ E0: "E0-sample.csv" }), now: midSeason });
});
afterAll(() => db.$disconnect());

const appTables = ["leagues", "teams", "team_seasons", "matches", "source_files", "collection_state"];

class Rollback extends Error {}

async function asApi<T>(statement: string): Promise<T> {
  let result: T | undefined;
  await db
    .$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE api_leitura");
      result = await tx.$queryRawUnsafe<T>(statement);
      throw new Rollback();
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rollback)) throw error;
    });
  return result as T;
}

describe("usuário somente leitura da API (api_leitura)", () => {
  it("lê todas as tabelas da aplicação", async () => {
    for (const table of appTables) {
      const rows = await asApi<unknown[]>(`SELECT * FROM ${table}`);
      expect(rows.length, table).toBeGreaterThan(0);
    }
  });

  it("não consegue escrever", async () => {
    await expect(asApi("UPDATE leagues SET name = 'x'")).rejects.toThrow(/permission denied/);
    await expect(asApi("DELETE FROM matches")).rejects.toThrow(/permission denied/);
    await expect(asApi("CREATE TABLE intrusa (id int)")).rejects.toThrow(/permission denied/);
  });

  it("lê também as tabelas criadas por migrações futuras", async () => {
    await db.$executeRawUnsafe("CREATE TABLE futura (id int)");
    try {
      await expect(asApi("SELECT * FROM futura")).resolves.toEqual([]);
    } finally {
      await db.$executeRawUnsafe("DROP TABLE futura");
    }
  });
});
