import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@estatisticas/collector";
import { get, source } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(async () => {
  await resetDatabase(db);
  await ingest({
    db,
    source: fakeSource({ E0: "E0-mando.csv", SP1: "SP1-sample.csv" }),
    season: "2026/27",
  });
});
afterAll(() => db.$disconnect());

const premierLeague = { slug: "premier-league", name: "Premier League" };

describe("resumo do Time", () => {
  it("mostra totais e médias de todas as métricas em todas as Partidas, como Mandante e como Visitante", async () => {
    const response = await get(db, "/leagues/premier-league/teams/aston-villa");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        team: { slug: "aston-villa", name: "Aston Villa" },
        league: premierLeague,
        season: "2026/27",
        all: {
          matches: 3,
          goalsFor: { total: 7, average: 2.33 },
          goalsAgainst: { total: 9, average: 3 },
          shotsOnTarget: { total: 13, average: 4.33 },
          yellowCards: { total: 5, average: 1.67 },
          redCards: { total: 1, average: 0.33 },
        },
        home: {
          matches: 1,
          goalsFor: { total: 3, average: 3 },
          goalsAgainst: { total: 1, average: 1 },
          shotsOnTarget: { total: 7, average: 7 },
          yellowCards: { total: 1, average: 1 },
          redCards: { total: 0, average: 0 },
        },
        away: {
          matches: 2,
          goalsFor: { total: 4, average: 2 },
          goalsAgainst: { total: 8, average: 4 },
          shotsOnTarget: { total: 6, average: 3 },
          yellowCards: { total: 4, average: 2 },
          redCards: { total: 1, average: 0.5 },
        },
      },
      source,
    });
  });

  it("um recorte sem Partidas tem total 0 e média nula", async () => {
    const onlyHome = await get(db, "/leagues/premier-league/teams/manchester-united");
    const onlyAway = await get(db, "/leagues/premier-league/teams/arsenal");

    const noAverage = { total: 0, average: null };
    const noMatches = {
      matches: 0,
      goalsFor: noAverage,
      goalsAgainst: noAverage,
      shotsOnTarget: noAverage,
      yellowCards: noAverage,
      redCards: noAverage,
    };
    expect(onlyHome.body.data).toMatchObject({ home: { matches: 1 }, away: noMatches });
    expect(onlyAway.body.data).toMatchObject({ home: noMatches, away: { matches: 1 } });
  });

  it("responde 404 para um Time sem Participação na Temporada atual da Liga", async () => {
    const unknown = await get(db, "/leagues/premier-league/teams/wrexham");
    const otherLeague = await get(db, "/leagues/premier-league/teams/alaves");

    expect(unknown.status).toBe(404);
    expect(unknown.body.message).toBe('Time inexistente na Premier League: "wrexham".');
    expect(otherLeague.status).toBe(404);
    expect(otherLeague.body.message).toBe('Time inexistente na Premier League: "alaves".');
  });

  it("responde 404 para uma Liga inexistente", async () => {
    const response = await get(db, "/leagues/mls/teams/aston-villa");

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/^Liga inexistente: "mls"\. Use /);
  });
});

describe("ranking por mando", () => {
  const villa = { slug: "aston-villa", name: "Aston Villa" };

  it("como Mandante, só conta as Partidas em casa e deixa de fora quem não jogou em casa", async () => {
    const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor&venue=home");

    expect(response.body.data).toEqual([
      { team: { slug: "brighton", name: "Brighton" }, matches: 1, total: 4, average: 4 },
      {
        team: { slug: "manchester-united", name: "Manchester United" },
        matches: 1,
        total: 4,
        average: 4,
      },
      { team: villa, matches: 1, total: 3, average: 3 },
    ]);
  });

  it("como Visitante, só conta as Partidas fora", async () => {
    const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor&venue=away");

    expect(response.body.data).toEqual([
      { team: villa, matches: 2, total: 4, average: 2 },
      { team: { slug: "arsenal", name: "Arsenal" }, matches: 1, total: 1, average: 1 },
    ]);
  });

  it("todas as Partidas é o padrão e também pode ser pedido", async () => {
    const byDefault = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");
    const explicit = await get(db, "/leagues/premier-league/rankings?metric=goalsFor&venue=all");

    expect(explicit.body).toEqual(byDefault.body);
    expect(byDefault.body.data).toContainEqual({ team: villa, matches: 3, total: 7, average: 2.33 });
  });
});
