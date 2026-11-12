import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@estatisticas/collector";
import { get, source } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

describe("lista de Ligas", () => {
  it("mostra as cinco Ligas com a Temporada atual, na ordem do cadastro", async () => {
    await ingest({ db, source: fakeSource({ E0: "E0-sample.csv" }), season: "2026/27" });

    const response = await get(db, "/leagues");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        { slug: "premier-league", name: "Premier League", currentSeason: "2026/27" },
        { slug: "la-liga", name: "La Liga", currentSeason: "2026/27" },
        { slug: "serie-a", name: "Serie A", currentSeason: "2026/27" },
        { slug: "bundesliga", name: "Bundesliga", currentSeason: "2026/27" },
        { slug: "ligue-1", name: "Ligue 1", currentSeason: "2026/27" },
      ],
      source,
    });
  });
});
