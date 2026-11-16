import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest, type LeagueReport, type Source } from "@estatisticas/collector";
import { get } from "./support/api.ts";
import { fakeSource, midSeason } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(async () => {
  await resetDatabase(db);
  await ingest({ db, source: fakeSource({ E0: "E0-mando.csv", SP1: "SP1-sample.csv" }), now: midSeason });
});
afterAll(() => db.$disconnect());

const at = (iso: string) => () => new Date(iso);
const lastMomentBeforeAugust = at("2027-07-31T23:59:59.999Z");
const firstOfAugust = at("2027-08-01T00:00:00.000Z");
const midAugust = at("2027-08-15T12:00:00.000Z");

type File = { divisionCode: string; season: string };

function recording(source: Source) {
  const requested: File[] = [];
  const wrapped: Source = {
    fetchCsv: (file) => {
      requested.push(file);
      return source.fetchCsv(file);
    },
  };
  const seasonsOf = (code: string) =>
    requested.filter((file) => file.divisionCode === code).map((file) => file.season);
  return { source: wrapped, seasonsOf };
}

async function currentSeasons() {
  const response = await get(db, "/leagues");
  const leagues = response.body.data as { slug: string; currentSeason: string }[];
  return Object.fromEntries(leagues.map((league) => [league.slug, league.currentSeason]));
}

describe("virada de Temporada", () => {
  it("antes de 1º de agosto (UTC) só procura a Temporada atual", async () => {
    const { source, seasonsOf } = recording(fakeSource({ E0: "E0-mando.csv", SP1: "SP1-sample.csv" }));

    await ingest({ db, source, now: lastMomentBeforeAugust });

    expect(seasonsOf("E0")).toEqual(["2026/27"]);
  });

  it("a partir de 1º de agosto também procura a próxima, e um arquivo inexistente não é erro", async () => {
    const { source, seasonsOf } = recording(fakeSource({ E0: "E0-mando.csv", SP1: "SP1-sample.csv" }));

    await ingest({ db, source, now: firstOfAugust });

    expect(seasonsOf("E0")).toEqual(["2027/28", "2026/27"]);
    expect(seasonsOf("F1")).toEqual(["2027/28", "2026/27"]);
    expect((await currentSeasons())["premier-league"]).toBe("2026/27");
  });

  it("um arquivo da próxima Temporada sem nenhuma Partida completa não vira nem é guardado", async () => {
    const source = fakeSource({ E0: "E0-mando.csv", "E0 2027/28": "E0-proxima-sem-placar.csv" });

    await ingest({ db, source, now: midAugust });

    expect((await currentSeasons())["premier-league"]).toBe("2026/27");
    const villa = await get(db, "/leagues/premier-league/teams/aston-villa");
    expect(villa.body.data).toMatchObject({ season: "2026/27", all: { matches: 3 } });
    const nextFiles = await db.sourceFile.count({ where: { season: "2027/28" } });
    expect(nextFiles).toBe(0);
  });

  it("a primeira Partida da próxima Temporada apaga a anterior só daquela Liga e promove a nova", async () => {
    const source = fakeSource({
      E0: "E0-mando.csv",
      SP1: "SP1-sample.csv",
      "E0 2027/28": "E0-proxima-temporada.csv",
    });

    await ingest({ db, source, now: midAugust });

    expect(await currentSeasons()).toMatchObject({ "premier-league": "2027/28", "la-liga": "2026/27" });

    const ranking = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");
    const ranked = (ranking.body.data as { team: { slug: string } }[]).map((item) => item.team.slug);
    expect(ranked).toEqual(["arsenal", "chelsea"]);
    const villa = await get(db, "/leagues/premier-league/teams/aston-villa");
    expect(villa.status).toBe(404);

    const laLiga = await get(db, "/leagues/la-liga/rankings?metric=goalsFor");
    expect(laLiga.body.data).toHaveLength(2);

    const leftovers = { leagueSlug: "premier-league", season: "2026/27" };
    expect(await db.match.count({ where: leftovers })).toBe(0);
    expect(await db.teamSeason.count({ where: leftovers })).toBe(0);
    expect(await db.sourceFile.count({ where: leftovers })).toBe(0);
    expect(await db.sourceFile.count({ where: { leagueSlug: "premier-league", season: "2027/28" } })).toBe(1);
  });

  it("depois da virada, a próxima Temporada só volta a ser procurada no 1º de agosto seguinte", async () => {
    const files = { E0: "E0-mando.csv", "E0 2027/28": "E0-proxima-temporada.csv" };
    await ingest({ db, source: fakeSource(files), now: midAugust });

    const { source, seasonsOf } = recording(fakeSource(files));
    await ingest({ db, source, now: at("2028-07-31T12:00:00.000Z") });

    expect(seasonsOf("E0")).toEqual(["2027/28"]);
  });

  it("uma próxima Temporada que falha na interpretação falha a Liga e mantém a Temporada atual", async () => {
    const source = fakeSource({ E0: "E0-mando.csv", "E0 2027/28": "E0-times-desconhecidos.csv" });

    await expect(ingest({ db, source, now: midAugust })).rejects.toThrow(
      'premier-league: Times desconhecidos na fonte: "Man Utd", "Wrexham"',
    );

    expect((await currentSeasons())["premier-league"]).toBe("2026/27");
    const villa = await get(db, "/leagues/premier-league/teams/aston-villa");
    expect(villa.body.data).toMatchObject({ all: { matches: 3 } });
  });

  it("o arquivo da Temporada atual inexistente é erro da Liga", async () => {
    const missingCurrent: Source = { fetchCsv: () => Promise.resolve(null) };

    await expect(ingest({ db, source: missingCurrent, now: midSeason })).rejects.toThrow(
      "premier-league: Arquivo da Temporada 2026/27 não encontrado na fonte",
    );
  });
});

describe("relatório por Liga", () => {
  it("informa o que aconteceu em cada Liga: gravada, virada, sem mudança ou falha", async () => {
    const reports: LeagueReport[] = [];
    const source = fakeSource({
      E0: "E0-mando.csv",
      "E0 2027/28": "E0-proxima-temporada.csv",
      SP1: "SP1-sample.csv",
      "I1 2027/28": "E0-sample.csv",
    });

    await expect(ingest({ db, source, now: midAugust, onLeague: (report) => reports.push(report) })).rejects.toThrow();

    expect(reports).toEqual([
      { league: "premier-league", outcome: "saved", season: "2027/28", matches: 1, previousSeason: "2026/27" },
      { league: "la-liga", outcome: "unchanged", season: "2026/27" },
      { league: "serie-a", outcome: "failed", error: 'Divisão errada no CSV: esperada "I1", encontrada "E0"' },
      { league: "bundesliga", outcome: "unchanged", season: "2026/27" },
      { league: "ligue-1", outcome: "unchanged", season: "2026/27" },
    ]);
  });
});

describe("primeira coleta", () => {
  beforeEach(() => resetDatabase(db));

  it("sem a Liga no banco, a Temporada atual é a que termina no ano corrente", async () => {
    const { source, seasonsOf } = recording(fakeSource({ E0: "E0-mando.csv" }));

    await ingest({ db, source, now: midSeason });

    expect(seasonsOf("E0")).toEqual(["2026/27"]);
  });

  it("a partir de 1º de agosto, a primeira coleta já vira para a Temporada que começou", async () => {
    const files = fakeSource({ E0: "E0-mando.csv", SP1: "SP1-sample.csv" });
    const previousSeasonExists: Source = {
      fetchCsv: (file) =>
        file.season === "2025/26" ? files.fetchCsv({ ...file, season: "2026/27" }) : files.fetchCsv(file),
    };
    const { source, seasonsOf } = recording(previousSeasonExists);

    await ingest({ db, source, now: at("2026-11-13T12:00:00.000Z") });

    expect(seasonsOf("E0")).toEqual(["2026/27"]);
    expect(seasonsOf("I1")).toEqual(["2026/27", "2025/26"]);
    expect(await currentSeasons()).toMatchObject({
      "premier-league": "2026/27",
      "la-liga": "2026/27",
      "serie-a": "2025/26",
    });
  });
});
