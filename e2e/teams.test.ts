import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest, type Source } from "@estatisticas/collector";
import { get } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

describe("mapeamento de Times", () => {
  it("um nome desconhecido falha só a coleta daquela Liga, listando todos os nomes, e as outras Ligas são gravadas", async () => {
    const collecting = ingest({
      db,
      source: fakeSource({ E0: "E0-times-desconhecidos.csv", SP1: "SP1-sample.csv" }),
      season: "2026/27",
    });

    await expect(collecting).rejects.toThrow(
      'premier-league: Times desconhecidos na fonte: "Man Utd", "Wrexham"',
    );

    const premierLeague = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");
    expect(premierLeague.status).toBe(404);

    const laLiga = await get(db, "/leagues/la-liga/rankings?metric=goalsFor");
    expect(laLiga.status).toBe(200);
    expect(laLiga.body.data).toHaveLength(2);
  });

  it("uma falha ao baixar o arquivo também falha só aquela Liga", async () => {
    const otherLeagues = fakeSource({ SP1: "SP1-sample.csv" });
    const source: Source = {
      fetchCsv: (file) =>
        file.divisionCode === "E0"
          ? Promise.reject(new Error("Fonte fora do ar"))
          : otherLeagues.fetchCsv(file),
    };

    await expect(ingest({ db, source, season: "2026/27" })).rejects.toThrow(
      "premier-league: Fonte fora do ar",
    );

    const laLiga = await get(db, "/leagues/la-liga/rankings?metric=goalsFor");
    expect(laLiga.body.data).toHaveLength(2);
  });

  it("um nome cadastrado em outra Liga é desconhecido nesta", async () => {
    const collecting = ingest({
      db,
      source: fakeSource({ E0: "E0-time-de-outra-liga.csv" }),
      season: "2026/27",
    });

    await expect(collecting).rejects.toThrow(
      'premier-league: Times desconhecidos na fonte: "Alaves"',
    );
  });

  it("registra a Participação de cada Time na Temporada atual da Liga", async () => {
    await ingest({
      db,
      source: fakeSource({ E0: "E0-sample.csv", SP1: "SP1-sample.csv" }),
      season: "2026/27",
    });

    const participations = await db.teamSeason.findMany({
      select: { leagueSlug: true, season: true, teamSlug: true },
      orderBy: [{ leagueSlug: "asc" }, { teamSlug: "asc" }],
    });

    expect(participations).toEqual([
      { leagueSlug: "la-liga", season: "2026/27", teamSlug: "alaves" },
      { leagueSlug: "la-liga", season: "2026/27", teamSlug: "getafe" },
      { leagueSlug: "premier-league", season: "2026/27", teamSlug: "aston-villa" },
      { leagueSlug: "premier-league", season: "2026/27", teamSlug: "manchester-united" },
    ]);
  });
});
