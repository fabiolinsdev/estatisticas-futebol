import { type Db, Prisma } from "@estatisticas/db";

const columnsByMetric = {
  goalsFor: { home: "home_goals", away: "away_goals" },
  goalsAgainst: { home: "away_goals", away: "home_goals" },
  shotsOnTarget: { home: "home_shots_on_target", away: "away_shots_on_target" },
  yellowCards: { home: "home_yellow_cards", away: "away_yellow_cards" },
  redCards: { home: "home_red_cards", away: "away_red_cards" },
} as const;

export type Metric = keyof typeof columnsByMetric;
export const metrics = Object.keys(columnsByMetric) as Metric[];

export const orders = ["desc", "asc"] as const;
export type Order = (typeof orders)[number];

type RankingRow = { slug: string; name: string; matches: number; total: number; average: number };

export async function ranking(db: Db, leagueSlug: string, metric: Metric, order: Order) {
  const home = Prisma.raw(columnsByMetric[metric].home);
  const away = Prisma.raw(columnsByMetric[metric].away);
  const direction = Prisma.raw(order === "asc" ? "ASC" : "DESC");
  const rows = await db.$queryRaw<RankingRow[]>`
    WITH current_season_matches AS (
      SELECT m.*
      FROM matches m
      JOIN leagues l ON l.slug = m.league_slug AND l.current_season = m.season
      WHERE l.slug = ${leagueSlug}
    ),
    team_matches AS (
      SELECT home_team_slug AS team_slug, ${home} AS value FROM current_season_matches
      UNION ALL
      SELECT away_team_slug, ${away} FROM current_season_matches
    )
    SELECT
      t.slug,
      t.name,
      COUNT(*)::int AS matches,
      SUM(tm.value)::int AS total,
      ROUND(AVG(tm.value), 2)::float8 AS average
    FROM team_matches tm
    JOIN teams t ON t.slug = tm.team_slug
    GROUP BY t.slug, t.name
    ORDER BY AVG(tm.value) ${direction}, total DESC, t.name COLLATE "C" ASC
  `;
  return rows.map(({ slug, name, matches, total, average }) => ({
    team: { slug, name },
    matches,
    total,
    average,
  }));
}
