import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "@estatisticas/api";
import { ingest } from "@estatisticas/collector";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

describe("ranking de Gols marcados da Premier League", () => {
  it("mostra os dois Times do 4×4 entre Man United e Aston Villa com 4 Gols marcados", async () => {
    await ingest({ db, source: fakeSource({ E0: "E0-sample.csv" }), season: "2026/27" });
    const app = buildApp({ db });

    const response = await app.inject({
      method: "GET",
      url: "/leagues/premier-league/rankings?metric=goalsFor",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [
        { team: { slug: "aston-villa", name: "Aston Villa" }, total: 4 },
        { team: { slug: "manchester-united", name: "Manchester United" }, total: 4 },
      ],
    });
  });

  it("ignora uma Partida ainda sem placar na fonte", async () => {
    await ingest({ db, source: fakeSource({ E0: "E0-placar-vazio.csv" }), season: "2026/27" });
    const app = buildApp({ db });

    const response = await app.inject({
      method: "GET",
      url: "/leagues/premier-league/rankings?metric=goalsFor",
    });

    expect(response.json()).toEqual({
      data: [
        { team: { slug: "aston-villa", name: "Aston Villa" }, total: 4 },
        { team: { slug: "manchester-united", name: "Manchester United" }, total: 4 },
      ],
    });
  });

  it("falha a coleta da Liga quando o placar não é um número, sem gravar nada", async () => {
    const collecting = ingest({
      db,
      source: fakeSource({ E0: "E0-placar-invalido.csv" }),
      season: "2026/27",
    });

    await expect(collecting).rejects.toThrow('Placar inválido no CSV: "x"');

    const response = await buildApp({ db }).inject({
      method: "GET",
      url: "/leagues/premier-league/rankings?metric=goalsFor",
    });
    expect(response.json()).toEqual({ data: [] });
  });
});
