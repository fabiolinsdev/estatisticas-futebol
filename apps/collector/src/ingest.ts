import { createHash } from "node:crypto";
import type { Db } from "@estatisticas/db";
import { type ExcludedMatch, excludedMatches as maintainedExclusions } from "./excluded-matches.ts";
import { type League, leagues } from "./leagues.ts";
import { type ParsedMatch, parseMatches } from "./parse.ts";
import { isNextSeasonDue, nextSeason, seasonEndingIn } from "./seasons.ts";
import type { Source } from "./source.ts";
import { teamsOfLeague } from "./teams.ts";

type IngestOptions = {
  db: Db;
  source: Source;
  excludedMatches?: ExcludedMatch[];
  now?: () => Date;
};

type IngestContext = Required<IngestOptions> & { startedAt: Date };

type SeasonFile = {
  season: string;
  content: string;
  contentHash: string;
  rulesHash: string;
  downloadedAt: Date;
  matches: () => ParsedMatch[];
};

export async function ingest(options: IngestOptions) {
  const defaults = { excludedMatches: maintainedExclusions, now: () => new Date() };
  const withDefaults = { ...defaults, ...options };
  const context = { ...withDefaults, startedAt: withDefaults.now() };
  const failures: string[] = [];
  for (const [position, league] of leagues.entries()) {
    try {
      await ingestLeague(context, league, position);
    } catch (error) {
      failures.push(`- ${league.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    const summary = `A coleta falhou em ${failures.length} de ${leagues.length} Ligas`;
    throw new Error(`${summary}:\n${failures.join("\n")}`);
  }

  await context.db.collectionState.upsert({
    where: { id: 1 },
    create: { id: 1, lastCollectedAt: context.startedAt },
    update: { lastCollectedAt: context.startedAt },
  });
}

async function ingestLeague(context: IngestContext, league: League, position: number) {
  const registered = await context.db.league.findUnique({
    where: { slug: league.slug },
    select: { currentSeason: true },
  });
  const currentSeason = registered?.currentSeason ?? seasonEndingIn(context.startedAt.getUTCFullYear());

  if (isNextSeasonDue(currentSeason, context.startedAt)) {
    const next = await download(context, league, nextSeason(currentSeason));
    const matches = next?.matches() ?? [];
    if (next && matches.length > 0) {
      await save(context, league, position, next, matches);
      return;
    }
  }

  const current = await download(context, league, currentSeason);
  if (!current) throw new Error(`Arquivo da Temporada ${currentSeason} não encontrado na fonte`);

  const stored = await context.db.sourceFile.findUnique({
    where: { leagueSlug_season: { leagueSlug: league.slug, season: currentSeason } },
  });
  if (stored?.contentHash === current.contentHash && stored.rulesHash === current.rulesHash) return;

  await save(context, league, position, current, current.matches());
}

async function download(context: IngestContext, league: League, season: string): Promise<SeasonFile | null> {
  const content = await context.source.fetchCsv({ divisionCode: league.divisionCode, season });
  if (content === null) return null;

  const teamsBySourceName = teamsOfLeague(league.slug);
  const exclusions = context.excludedMatches
    .filter((match) => match.leagueSlug === league.slug && match.season === season)
    .map(({ homeTeamSlug, awayTeamSlug }) => ({ homeTeamSlug, awayTeamSlug }));
  return {
    season,
    content,
    contentHash: sha256(content),
    rulesHash: sha256(JSON.stringify({ teamsBySourceName, exclusions })),
    downloadedAt: context.now(),
    matches: () => parseMatches(content, league, teamsBySourceName, exclusions),
  };
}

async function save(
  { db }: IngestContext,
  league: League,
  position: number,
  file: SeasonFile,
  matches: ParsedMatch[],
) {
  const { season } = file;
  const leagueSeason = { leagueSlug: league.slug, season };
  const teams = new Map(
    matches.flatMap(({ homeTeam, awayTeam }) => [homeTeam, awayTeam]).map((team) => [team.slug, team]),
  );

  await db.$transaction(async (tx) => {
    const registryFields = { name: league.name, divisionCode: league.divisionCode, position, currentSeason: season };
    await tx.league.upsert({
      where: { slug: league.slug },
      create: { slug: league.slug, ...registryFields },
      update: registryFields,
    });

    for (const team of teams.values()) {
      await tx.team.upsert({ where: { slug: team.slug }, create: team, update: { name: team.name } });
    }

    const wholeLeague = { leagueSlug: league.slug };
    await tx.match.deleteMany({ where: wholeLeague });
    await tx.teamSeason.deleteMany({ where: wholeLeague });
    await tx.sourceFile.deleteMany({ where: { ...wholeLeague, season: { not: season } } });
    await tx.teamSeason.createMany({
      data: [...teams.keys()].map((teamSlug) => ({ ...leagueSeason, teamSlug })),
    });
    await tx.match.createMany({
      data: matches.map(({ homeTeam, awayTeam, ...details }) => ({
        ...leagueSeason,
        homeTeamSlug: homeTeam.slug,
        awayTeamSlug: awayTeam.slug,
        ...details,
      })),
    });

    const { content, contentHash, rulesHash, downloadedAt } = file;
    const copy = { content, contentHash, rulesHash, downloadedAt };
    await tx.sourceFile.upsert({
      where: { leagueSlug_season: leagueSeason },
      create: { ...leagueSeason, ...copy },
      update: copy,
    });
  });
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
