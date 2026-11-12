import type { Db } from "@estatisticas/db";
import { type League, leagues } from "./leagues.ts";
import { parseMatches } from "./parse.ts";
import type { Source } from "./source.ts";
import { teamsOfLeague } from "./teams.ts";

type IngestContext = { db: Db; source: Source; season: string };

export async function ingest(context: IngestContext) {
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
}

async function ingestLeague({ db, source, season }: IngestContext, league: League, position: number) {
  const csv = await source.fetchCsv({ divisionCode: league.divisionCode, season });
  const matches = parseMatches(csv, league, teamsOfLeague(league.slug));
  const leagueSeason = { leagueSlug: league.slug, season };

  await db.$transaction(async (tx) => {
    const registryFields = { name: league.name, divisionCode: league.divisionCode, position };
    await tx.league.upsert({
      where: { slug: league.slug },
      create: { slug: league.slug, ...registryFields, currentSeason: season },
      update: registryFields,
    });

    const teams = new Map(
      matches.flatMap(({ homeTeam, awayTeam }) => [homeTeam, awayTeam]).map((team) => [team.slug, team]),
    );
    for (const team of teams.values()) {
      await tx.team.upsert({ where: { slug: team.slug }, create: team, update: { name: team.name } });
      const participation = { ...leagueSeason, teamSlug: team.slug };
      await tx.teamSeason.upsert({
        where: { leagueSlug_season_teamSlug: participation },
        create: participation,
        update: {},
      });
    }

    for (const { homeTeam, awayTeam, ...details } of matches) {
      const key = { ...leagueSeason, homeTeamSlug: homeTeam.slug, awayTeamSlug: awayTeam.slug };
      await tx.match.upsert({
        where: { leagueSlug_season_homeTeamSlug_awayTeamSlug: key },
        create: { ...key, ...details },
        update: details,
      });
    }
  });
}
