import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@estatisticas/collector";
import { get, source } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(async () => {
  await resetDatabase(db);
  await ingest({ db, source: fakeSource({ E0: "E0-mando.csv" }), season: "2026/27" });
});
afterAll(() => db.$disconnect());

const enabled = { TEAM_MATCHES_ENABLED: "true" };
const villaMatches = "/leagues/premier-league/teams/aston-villa/matches";
const villa = { slug: "aston-villa", name: "Aston Villa" };

describe("Partidas de um Time", () => {
  it("lista as Partidas em ordem cronológica, com adversário, mando, placar e as estatísticas dos dois lados", async () => {
    const response = await get(db, villaMatches, enabled);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          date: "2026-08-16",
          venue: "home",
          team: { ...villa, goals: 3, shotsOnTarget: 7, yellowCards: 1, redCards: 0 },
          opponent: {
            slug: "arsenal",
            name: "Arsenal",
            goals: 1,
            shotsOnTarget: 2,
            yellowCards: 3,
            redCards: 1,
          },
        },
        {
          date: "2026-08-23",
          venue: "away",
          team: { ...villa, goals: 0, shotsOnTarget: 0, yellowCards: 3, redCards: 1 },
          opponent: {
            slug: "brighton",
            name: "Brighton",
            goals: 4,
            shotsOnTarget: 6,
            yellowCards: 2,
            redCards: 0,
          },
        },
        {
          date: "2026-11-08",
          venue: "away",
          team: { ...villa, goals: 4, shotsOnTarget: 6, yellowCards: 1, redCards: 0 },
          opponent: {
            slug: "manchester-united",
            name: "Manchester United",
            goals: 4,
            shotsOnTarget: 9,
            yellowCards: 1,
            redCards: 0,
          },
        },
      ],
      source,
    });
  });

  it("responde 404 para um Time sem Participação na Temporada atual da Liga", async () => {
    const response = await get(db, "/leagues/premier-league/teams/alaves/matches", enabled);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Time inexistente na Premier League: "alaves".');
  });

  it("responde 404 para uma Liga inexistente", async () => {
    const response = await get(db, "/leagues/mls/teams/aston-villa/matches", enabled);

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/^Liga inexistente: "mls"\. Use /);
  });
});

describe("interruptor da lista de Partidas", () => {
  const routeNotFound = {
    statusCode: 404,
    error: "Not Found",
    message: `Route GET:${villaMatches} not found`,
  };

  it.each([
    ["ausente", {}],
    ["false", { TEAM_MATCHES_ENABLED: "false" }],
    ["TRUE", { TEAM_MATCHES_ENABLED: "TRUE" }],
    ["1", { TEAM_MATCHES_ENABLED: "1" }],
  ])("com a variável %s, a rota responde o mesmo 404 de uma rota inexistente", async (_, env) => {
    const response = await get(db, villaMatches, env);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(routeNotFound);
  });

  it("desligada, nem valida a Liga ou o Time", async () => {
    const url = "/leagues/mls/teams/wrexham/matches";
    const response = await get(db, url);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ ...routeNotFound, message: `Route GET:${url} not found` });
  });
});
