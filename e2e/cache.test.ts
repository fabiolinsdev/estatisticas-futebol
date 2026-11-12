import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@estatisticas/collector";
import { get } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(async () => {
  await resetDatabase(db);
  await ingest({ db, source: fakeSource({ E0: "E0-sample.csv" }), season: "2026/27" });
});
afterAll(() => db.$disconnect());

const cdnCache = "public, s-maxage=600, stale-while-revalidate=86400";

describe("cache de CDN", () => {
  it("manda o cabeçalho de cache nas respostas de sucesso", async () => {
    const leagues = await get(db, "/leagues");
    const ranking = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");

    expect(leagues.headers["cache-control"]).toBe(cdnCache);
    expect(ranking.headers["cache-control"]).toBe(cdnCache);
  });

  it("não manda o cabeçalho de cache nas respostas de erro", async () => {
    const badRequest = await get(db, "/leagues/premier-league/rankings?metric=gols");
    const notFound = await get(db, "/leagues/mls/rankings?metric=goalsFor");

    expect(badRequest.headers["cache-control"]).toBeUndefined();
    expect(notFound.headers["cache-control"]).toBeUndefined();
  });
});
