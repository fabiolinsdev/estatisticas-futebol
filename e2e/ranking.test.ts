import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ingest } from "@estatisticas/collector";
import { get, source } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const villa = { slug: "aston-villa", name: "Aston Villa" };
const united = { slug: "manchester-united", name: "Manchester United" };
const alaves = { slug: "alaves", name: "Alavés" };
const getafe = { slug: "getafe", name: "Getafe" };
const brighton = { slug: "brighton", name: "Brighton" };

async function laLigaRanking(metric: string) {
  await ingest({ db, source: fakeSource({ SP1: "SP1-sample.csv" }), season: "2026/27" });
  return (await get(db, `/leagues/la-liga/rankings?metric=${metric}`)).body.data;
}

describe("ranking de uma Liga", () => {
  it("mostra os dois Times do 4×4 entre Man United e Aston Villa com 4 Gols marcados", async () => {
    await ingest({ db, source: fakeSource({ E0: "E0-sample.csv" }), season: "2026/27" });

    const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        { team: villa, matches: 1, total: 4, average: 4 },
        { team: united, matches: 1, total: 4, average: 4 },
      ],
      source,
    });
  });

  it("deriva os Gols sofridos dos Gols marcados do adversário", async () => {
    expect(await laLigaRanking("goalsAgainst")).toEqual([
      { team: getafe, matches: 1, total: 3, average: 3 },
      { team: alaves, matches: 1, total: 0, average: 0 },
    ]);
  });

  it("ranqueia os Chutes ao gol como a fonte informa", async () => {
    expect(await laLigaRanking("shotsOnTarget")).toEqual([
      { team: alaves, matches: 1, total: 8, average: 8 },
      { team: getafe, matches: 1, total: 2, average: 2 },
    ]);
  });

  it("repassa os Cartões amarelos como a fonte informa, na Premier League e numa Liga continental", async () => {
    await ingest({
      db,
      source: fakeSource({ E0: "E0-cartoes.csv", SP1: "SP1-sample.csv" }),
      season: "2026/27",
    });

    const premierLeague = await get(db, "/leagues/premier-league/rankings?metric=yellowCards");
    const laLiga = await get(db, "/leagues/la-liga/rankings?metric=yellowCards");

    expect(premierLeague.body.data).toEqual([
      { team: villa, matches: 1, total: 3, average: 3 },
      { team: brighton, matches: 1, total: 2, average: 2 },
    ]);
    expect(laLiga.body.data).toEqual([
      { team: alaves, matches: 1, total: 4, average: 4 },
      { team: getafe, matches: 1, total: 3, average: 3 },
    ]);
  });

  it("ranqueia os Cartões vermelhos como a fonte informa", async () => {
    await ingest({ db, source: fakeSource({ E0: "E0-cartoes.csv" }), season: "2026/27" });

    const response = await get(db, "/leagues/premier-league/rankings?metric=redCards");

    expect(response.body.data).toEqual([
      { team: villa, matches: 1, total: 1, average: 1 },
      { team: brighton, matches: 1, total: 0, average: 0 },
    ]);
  });

  describe("ordem, desempate e arredondamento", () => {
    const arsenal = { slug: "arsenal", name: "Arsenal" };
    const ranked = {
      arsenal: { team: arsenal, matches: 2, total: 4, average: 2 },
      brighton: { team: brighton, matches: 1, total: 2, average: 2 },
      villa: { team: villa, matches: 3, total: 4, average: 1.33 },
      united: { team: united, matches: 4, total: 1, average: 0.25 },
    };

    beforeEach(() =>
      ingest({ db, source: fakeSource({ E0: "E0-sintetico-ordem.csv" }), season: "2026/27" }),
    );

    it("ordena pela média decrescente por padrão e desempata pelo maior total", async () => {
      const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");

      expect(response.body.data).toEqual([
        ranked.arsenal,
        ranked.brighton,
        ranked.villa,
        ranked.united,
      ]);
    });

    it("na ordem crescente inverte só a média e mantém o desempate pelo maior total", async () => {
      const response = await get(
        db,
        "/leagues/premier-league/rankings?metric=goalsFor&order=asc",
      );

      expect(response.body.data).toEqual([
        ranked.united,
        ranked.villa,
        ranked.arsenal,
        ranked.brighton,
      ]);
    });
  });

  it("ignora uma Partida ainda sem placar na fonte", async () => {
    await ingest({ db, source: fakeSource({ E0: "E0-placar-vazio.csv" }), season: "2026/27" });

    const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");

    expect(response.body.data).toEqual([
      { team: villa, matches: 1, total: 4, average: 4 },
      { team: united, matches: 1, total: 4, average: 4 },
    ]);
  });

  it("falha a coleta da Liga quando o arquivo é de outra divisão, sem gravar nada", async () => {
    const collecting = ingest({
      db,
      source: fakeSource({ E0: "E0-sample.csv", SP1: "E0-sample.csv" }),
      season: "2026/27",
    });

    await expect(collecting).rejects.toThrow(
      'la-liga: Divisão errada no CSV: esperada "SP1", encontrada "E0"',
    );

    const laLiga = await get(db, "/leagues/la-liga/rankings?metric=goalsFor");
    expect(laLiga.status).toBe(404);
    const premierLeague = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");
    expect(premierLeague.body.data).toHaveLength(2);
  });

  it("falha a coleta da Liga quando o placar não é um número, sem gravar nada", async () => {
    const collecting = ingest({
      db,
      source: fakeSource({ E0: "E0-placar-invalido.csv" }),
      season: "2026/27",
    });

    await expect(collecting).rejects.toThrow('Placar inválido no CSV: "x"');

    const response = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");
    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      'Liga inexistente: "premier-league". Use la-liga, serie-a, bundesliga ou ligue-1.',
    );
  });
});
