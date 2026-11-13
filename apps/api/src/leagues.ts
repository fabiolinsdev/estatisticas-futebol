import type { Db } from "@estatisticas/db";

export async function listLeagues(db: Db) {
  return db.league.findMany({
    select: { slug: true, name: true, currentSeason: true },
    orderBy: { position: "asc" },
  });
}

export async function findLeague(db: Db, slug: string) {
  return db.league.findUnique({ where: { slug }, select: { slug: true, name: true, currentSeason: true } });
}

export async function leagueSlugs(db: Db) {
  const leagues = await db.league.findMany({ select: { slug: true }, orderBy: { position: "asc" } });
  return leagues.map((league) => league.slug);
}

type CurrentLeague = { slug: string; currentSeason: string };

export async function findParticipatingTeam(db: Db, league: CurrentLeague, teamSlug: string) {
  const participation = await db.teamSeason.findUnique({
    where: {
      leagueSlug_season_teamSlug: { leagueSlug: league.slug, season: league.currentSeason, teamSlug },
    },
    select: { team: { select: { slug: true, name: true } } },
  });
  return participation?.team ?? null;
}
