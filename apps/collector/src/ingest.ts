import { createHash } from "node:crypto";
import type { Db } from "@estatisticas/db";
import { type ExcludedMatch, excludedMatches as maintainedExclusions } from "./excluded-matches.ts";
import { type League, leagues } from "./leagues.ts";
import { parseMatches } from "./parse.ts";
import type { Source } from "./source.ts";
import { teamsOfLeague } from "./teams.ts";

type IngestOptions = {
  db: Db;
  source: Source;
  season: string;
  excludedMatches?: ExcludedMatch[];
  now?: () => Date;
};

type IngestContext = Required<IngestOptions>;

export async function ingest(options: IngestOptions) {
  const context = { excludedMatches: maintainedExclusions, now: () => new Date(), ...options };
  const startedAt = context.now();
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
    create: { id: 1, lastCollectedAt: startedAt },
    update: { lastCollectedAt: startedAt },
  });
}

async function ingestLeague(context: IngestContext, league: League, position: number) {
  const { db, source, season } = context;
  const leagueSeason = { leagueSlug: league.slug, season };
  const content = await source.fetchCsv({ divisionCode: league.divisionCode, season });
  const downloadedAt = context.now();

  const teamsBySourceName = teamsOfLeague(league.slug);
  const exclusions = context.excludedMatches
    .filter((match) => match.leagueSlug === league.slug && match.season === season)
    .map(({ homeTeamSlug, awayTeamSlug }) => ({ homeTeamSlug, awayTeamSlug }));
  const contentHash = sha256(content);
  const rulesHash = sha256(JSON.stringify({ teamsBySourceName, exclusions }));

  const stored = await db.sourceFile.findUnique({ where: { leagueSlug_season: leagueSeason } });
  if (stored?.contentHash === contentHash && stored.rulesHash === rulesHash) return;

  const matches = parseMatches(content, league, teamsBySourceName, exclusions);
  const teams = new Map(
    matches.flatMap(({ homeTeam, awayTeam }) => [homeTeam, awayTeam]).map((team) => [team.slug, team]),
  );

  await db.$transaction(async (tx) => {
    const registryFields = { name: league.name, divisionCode: league.divisionCode, position };
    await tx.league.upsert({
      where: { slug: league.slug },
      create: { slug: league.slug, ...registryFields, currentSeason: season },
      update: registryFields,
    });

    for (const team of teams.values()) {
      await tx.team.upsert({ where: { slug: team.slug }, create: team, update: { name: team.name } });
    }

    await tx.match.deleteMany({ where: leagueSeason });
    await tx.teamSeason.deleteMany({ where: leagueSeason });
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

    const file = { content, contentHash, rulesHash, downloadedAt };
    await tx.sourceFile.upsert({
      where: { leagueSlug_season: leagueSeason },
      create: { ...leagueSeason, ...file },
      update: file,
    });
  });
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
