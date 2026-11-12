import type { Db } from "@estatisticas/db";
import { leagues } from "./leagues.ts";
import { parseMatches } from "./parse.ts";
import type { Source } from "./source.ts";

export async function ingest({ db, source, season }: { db: Db; source: Source; season: string }) {
  for (const [position, league] of leagues.entries()) {
    const csv = await source.fetchCsv({ divisionCode: league.divisionCode, season });
    const matches = parseMatches(csv, league.divisionCode);

    await db.$transaction(async (tx) => {
      const registryFields = { name: league.name, divisionCode: league.divisionCode, position };
      await tx.league.upsert({
        where: { slug: league.slug },
        create: { slug: league.slug, ...registryFields, currentSeason: season },
        update: registryFields,
      });

      for (const { homeTeam, awayTeam, ...details } of matches) {
        for (const team of [homeTeam, awayTeam]) {
          await tx.team.upsert({ where: { slug: team.slug }, create: team, update: { name: team.name } });
        }

        const key = {
          leagueSlug: league.slug,
          season,
          homeTeamSlug: homeTeam.slug,
          awayTeamSlug: awayTeam.slug,
        };
        await tx.match.upsert({
          where: { leagueSlug_season_homeTeamSlug_awayTeamSlug: key },
          create: { ...key, ...details },
          update: details,
        });
      }
    });
  }
}
