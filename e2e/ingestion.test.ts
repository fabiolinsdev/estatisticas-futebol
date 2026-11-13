import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { type ExcludedMatch, ingest, type Source } from "@estatisticas/collector";
import { get, source } from "./support/api.ts";
import { fakeSource } from "./support/fake-source.ts";
import { resetDatabase, testDb } from "./support/database.ts";

const db = testDb();

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const season = "2026/27";
const firstRun = "2026-11-13T12:00:00.000Z";
const secondRun = "2026-11-13T15:00:00.000Z";
const at = (iso: string) => () => new Date(iso);

const enabled = { TEAM_MATCHES_ENABLED: "true" };
const villa = "/leagues/premier-league/teams/aston-villa";
const premierLeagueFile = { leagueSlug_season: { leagueSlug: "premier-league", season } };

function collect(fixtures: Record<string, string>, options: Partial<Parameters<typeof ingest>[0]> = {}) {
  return ingest({ db, source: fakeSource(fixtures), season, now: at(firstRun), ...options });
}

async function villaMatchDates() {
  const response = await get(db, `${villa}/matches`, enabled);
  return (response.body.data as { date: string }[]).map((match) => match.date);
}

describe("cópia do arquivo da fonte", () => {
  it("guarda a última cópia de cada arquivo baixado, com o hash do conteúdo", async () => {
    await collect({ E0: "E0-mando.csv" });

    const csv = await readFile(new URL("fixtures/E0-mando.csv", import.meta.url), "utf8");
    const stored = await db.sourceFile.findUnique({
      where: premierLeagueFile,
      select: { content: true, contentHash: true, downloadedAt: true },
    });

    expect(stored).toEqual({
      content: csv,
      contentHash: createHash("sha256").update(csv).digest("hex"),
      downloadedAt: new Date(firstRun),
    });
  });

  it("um arquivo com o mesmo hash da cópia guardada não é reprocessado", async () => {
    await collect({ E0: "E0-mando.csv" });
    const matchIds = () => db.match.findMany({ select: { id: true }, orderBy: { id: "asc" } });
    const idsBefore = await matchIds();

    await collect({ E0: "E0-mando.csv" }, { now: at(secondRun) });

    expect(await matchIds()).toEqual(idsBefore);
    const stored = await db.sourceFile.findUnique({ where: premierLeagueFile });
    expect(stored?.downloadedAt).toEqual(new Date(firstRun));
  });

  it("rodar a Ingestão duas vezes com o mesmo arquivo produz respostas idênticas", async () => {
    const fixtures = { E0: "E0-mando.csv", SP1: "SP1-sample.csv" };
    const responses = () =>
      Promise.all(
        [
          "/leagues",
          "/leagues/premier-league/rankings?metric=goalsFor",
          villa,
          `${villa}/matches`,
        ].map((url) => get(db, url, enabled).then(({ status, body }) => ({ status, body }))),
      );

    await collect(fixtures);
    const first = await responses();
    await collect(fixtures);

    expect(await responses()).toEqual(first);
  });
});

describe("arquivo corrigido", () => {
  it("substitui os números anteriores, e uma Partida removida do arquivo some do banco", async () => {
    await collect({ E0: "E0-mando.csv" });
    await collect({ E0: "E0-mando-corrigido.csv" }, { now: at(secondRun) });

    const summary = await get(db, villa);
    expect(summary.body.data).toMatchObject({
      all: {
        matches: 2,
        goalsFor: { total: 6, average: 3 },
        goalsAgainst: { total: 5, average: 2.5 },
        shotsOnTarget: { total: 12, average: 6 },
        yellowCards: { total: 3, average: 1.5 },
        redCards: { total: 0, average: 0 },
      },
    });
    expect(await villaMatchDates()).toEqual(["2026-08-16", "2026-11-08"]);

    const brighton = await get(db, "/leagues/premier-league/teams/brighton");
    expect(brighton.status).toBe(404);
  });

  it("um arquivo corrigido que falha mantém os números anteriores da Liga", async () => {
    await collect({ E0: "E0-mando.csv" });

    await expect(collect({ E0: "E0-placar-invalido.csv" })).rejects.toThrow("premier-league");

    expect(await villaMatchDates()).toEqual(["2026-08-16", "2026-08-23", "2026-11-08"]);
  });
});

describe("estatísticas faltando", () => {
  it("uma linha com estatística vazia é ignorada, mesmo com Time desconhecido, até ficar completa", async () => {
    await collect({ E0: "E0-estatistica-vazia.csv" });

    expect(await villaMatchDates()).toEqual(["2026-11-08"]);

    await collect({ E0: "E0-mando.csv" }, { now: at(secondRun) });

    expect(await villaMatchDates()).toEqual(["2026-08-16", "2026-08-23", "2026-11-08"]);
  });
});

describe("Partidas excluídas", () => {
  const abandoned: ExcludedMatch = {
    leagueSlug: "premier-league",
    season,
    homeTeamSlug: "brighton",
    awayTeamSlug: "aston-villa",
    reason: "Partida abandonada",
  };

  it("uma Partida excluída não aparece em nenhuma resposta", async () => {
    await collect({ E0: "E0-mando.csv" }, { excludedMatches: [abandoned] });

    expect(await villaMatchDates()).toEqual(["2026-08-16", "2026-11-08"]);
    const summary = await get(db, villa);
    expect(summary.body.data).toMatchObject({ all: { matches: 2 }, away: { matches: 1 } });
    const ranking = await get(db, "/leagues/premier-league/rankings?metric=goalsFor");
    const rankedTeams = (ranking.body.data as { team: { slug: string } }[]).map((item) => item.team.slug);
    expect(rankedTeams).not.toContain("brighton");
    const brighton = await get(db, "/leagues/premier-league/teams/brighton");
    expect(brighton.status).toBe(404);
  });

  it("incluir uma Partida na lista reprocessa a Liga mesmo com o arquivo igual", async () => {
    await collect({ E0: "E0-mando.csv" });
    await collect({ E0: "E0-mando.csv" }, { excludedMatches: [abandoned] });

    expect(await villaMatchDates()).toEqual(["2026-08-16", "2026-11-08"]);
  });

  it("uma exclusão de outra Temporada não afeta a Temporada coletada", async () => {
    await collect({ E0: "E0-mando.csv" }, { excludedMatches: [{ ...abandoned, season: "2025/26" }] });

    expect(await villaMatchDates()).toHaveLength(3);
  });

  it("uma exclusão que ainda não está no arquivo é aceita", async () => {
    const notYetPlayed = { ...abandoned, homeTeamSlug: "arsenal", awayTeamSlug: "brighton" };

    await collect({ E0: "E0-mando.csv" }, { excludedMatches: [notYetPlayed] });

    expect(await villaMatchDates()).toHaveLength(3);
  });

  it("uma exclusão com Time fora do mapeamento da Liga falha a coleta daquela Liga", async () => {
    const typo = { ...abandoned, homeTeamSlug: "brigthon" };

    await expect(collect({ E0: "E0-mando.csv" }, { excludedMatches: [typo] })).rejects.toThrow(
      'premier-league: Partida excluída com Time fora do mapeamento da Liga: "brigthon"',
    );
  });
});

describe("lastCollectedAt", () => {
  it("aparece no envelope de toda resposta com o início da última coleta bem-sucedida", async () => {
    let tick = 0;
    const ticking = () => new Date(Date.parse(firstRun) + 1000 * tick++);
    await collect({ E0: "E0-mando.csv" }, { now: ticking });

    for (const url of ["/leagues", "/leagues/premier-league/rankings?metric=goalsFor", villa, `${villa}/matches`]) {
      const response = await get(db, url, enabled);
      expect(response.body).toMatchObject({ source, lastCollectedAt: firstRun });
    }
  });

  it("é nulo antes da primeira coleta bem-sucedida", async () => {
    const empty = await get(db, "/leagues");
    expect(empty.body).toEqual({ data: [], source, lastCollectedAt: null });

    await expect(collect({ E0: "E0-placar-invalido.csv" })).rejects.toThrow();

    const afterFailure = await get(db, "/leagues");
    expect(afterFailure.body).toMatchObject({ lastCollectedAt: null });
  });

  it("não avança quando alguma Liga falha", async () => {
    await collect({ E0: "E0-mando.csv" });
    const failing: Source = {
      fetchCsv: () => Promise.reject(new Error("Fonte fora do ar")),
    };

    await expect(ingest({ db, source: failing, season, now: at(secondRun) })).rejects.toThrow();

    const response = await get(db, "/leagues");
    expect(response.body).toMatchObject({ lastCollectedAt: firstRun });
  });

  it("avança quando a coleta termina sem erro, mesmo sem nenhum arquivo novo", async () => {
    await collect({ E0: "E0-mando.csv" });
    await collect({ E0: "E0-mando.csv" }, { now: at(secondRun) });

    const response = await get(db, "/leagues");
    expect(response.body).toMatchObject({ lastCollectedAt: secondRun });
  });
});
