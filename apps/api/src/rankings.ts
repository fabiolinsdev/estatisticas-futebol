import type { Db } from "@estatisticas/db";

type RankingRow = { slug: string; name: string; total: number };

export async function goalsForRanking(db: Db, leagueSlug: string) {
  const rows = await db.$queryRaw<RankingRow[]>`
    WITH current_season_matches AS (
      SELECT m.*
      FROM matches m
      JOIN leagues l ON l.slug = m.league_slug AND l.current_season = m.season
      WHERE l.slug = ${leagueSlug}
    ),
    goals AS (
      SELECT home_team_slug AS team_slug, home_goals AS goals FROM current_season_matches
      UNION ALL
      SELECT away_team_slug, away_goals FROM current_season_matches
    )
    SELECT t.slug, t.name, SUM(g.goals)::int AS total
    FROM goals g
    JOIN teams t ON t.slug = g.team_slug
    GROUP BY t.slug, t.name
    ORDER BY total DESC, t.name ASC
  `;
  return rows.map(({ slug, name, total }) => ({ team: { slug, name }, total }));
}
