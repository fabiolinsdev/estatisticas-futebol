import type { Db } from "@estatisticas/db";
import { leagues } from "./leagues.ts";
import { parseMatches } from "./parse.ts";
import type { Source } from "./source.ts";

export async function ingest({ db, source, season }: { db: Db; source: Source; season: string }) {
  for (const league of leagues) {
    const csv = await source.fetchCsv({ divisionCode: league.divisionCode, season });
    const matches = parseMatches(csv);

    await db.$transaction(async (tx) => {
      await tx.league.upsert({
        where: { slug: league.slug },
        create: { ...league, currentSeason: season },
        update: { name: league.name, divisionCode: league.divisionCode },
      });

      for (const match of matches) {
        for (const team of [match.homeTeam, match.awayTeam]) {
          await tx.team.upsert({ where: { slug: team.slug }, create: team, update: { name: team.name } });
        }

        const key = {
          leagueSlug: league.slug,
          season,
          homeTeamSlug: match.homeTeam.slug,
          awayTeamSlug: match.awayTeam.slug,
        };
        const details = { date: match.date, homeGoals: match.homeGoals, awayGoals: match.awayGoals };
        await tx.match.upsert({
          where: { leagueSlug_season_homeTeamSlug_awayTeamSlug: key },
          create: { ...key, ...details },
          update: details,
        });
      }
    });
  }
}
