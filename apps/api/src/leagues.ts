import type { Db } from "@estatisticas/db";

export async function listLeagues(db: Db) {
  return db.league.findMany({
    select: { slug: true, name: true, currentSeason: true },
    orderBy: { position: "asc" },
  });
}

export async function leagueSlugs(db: Db) {
  const leagues = await db.league.findMany({ select: { slug: true }, orderBy: { position: "asc" } });
  return leagues.map((league) => league.slug);
}
