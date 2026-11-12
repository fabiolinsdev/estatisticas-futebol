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

const metricsHint = "Use goalsFor, goalsAgainst, shotsOnTarget, yellowCards ou redCards.";

describe("erros do ranking", () => {
  it("responde 400 para uma métrica inválida, listando as aceitas", async () => {
    const response = await get(db, "/leagues/premier-league/rankings?metric=gols");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      error: "Bad Request",
      message: `Métrica inválida: "gols". ${metricsHint}`,
    });
  });

  it("responde 400 quando a métrica não é informada", async () => {
    const response = await get(db, "/leagues/premier-league/rankings");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(`Informe a métrica. ${metricsHint}`);
  });

  it("responde 400 para uma ordem inválida, listando as aceitas", async () => {
    const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor&order=maior");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Ordem inválida: "maior". Use desc ou asc.');
  });

  it("responde 404 para uma Liga inexistente", async () => {
    const response = await get(db, "/leagues/mls/rankings?metric=goalsFor");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      error: "Not Found",
      message:
        'Liga inexistente: "mls". Use premier-league, la-liga, serie-a, bundesliga ou ligue-1.',
    });
  });
});
