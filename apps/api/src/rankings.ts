import { type Db, Prisma } from "@estatisticas/db";
import {
  currentSeasonMatches,
  type Metric,
  metricColumn,
  type Side,
  teamColumn,
} from "./season-matches.ts";

export const orders = ["desc", "asc"] as const;
export type Order = (typeof orders)[number];

export const venues = ["all", "home", "away"] as const;
export type Venue = (typeof venues)[number];

const sidesByVenue: Record<Venue, Side[]> = { all: ["home", "away"], home: ["home"], away: ["away"] };

type RankingRow = { slug: string; name: string; matches: number; total: number; average: number };

type RankingQuery = { metric: Metric; order: Order; venue: Venue };

export async function ranking(db: Db, leagueSlug: string, { metric, order, venue }: RankingQuery) {
  const direction = Prisma.raw(order === "asc" ? "ASC" : "DESC");
  const valuesBySide = sidesByVenue[venue].map(
    (side) => Prisma.sql`
      SELECT ${teamColumn(side)} AS team_slug, ${metricColumn(metric, side)} AS value
      FROM current_season_matches
    `,
  );
  const rows = await db.$queryRaw<RankingRow[]>`
    WITH current_season_matches AS (${currentSeasonMatches(leagueSlug)}),
    team_matches AS (${Prisma.join(valuesBySide, " UNION ALL ")})
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
