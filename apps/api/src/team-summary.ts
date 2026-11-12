import { type Db, Prisma } from "@estatisticas/db";
import {
  currentSeasonMatches,
  type Metric,
  metricColumn,
  metrics,
  type Side,
  teamColumn,
} from "./season-matches.ts";

type Slice = "all" | Side;
type MetricSummary = { total: number; average: number | null };
type SliceSummary = { matches: number } & Record<Metric, MetricSummary>;
type SummaryRow = { slice: Slice; matches: number } & Record<
  `${Metric}Total` | `${Metric}Average`,
  number
>;

export async function teamSummary(db: Db, leagueSlug: string, teamSlug: string) {
  const teamSideMatches = (side: Side) => {
    const columns = metrics.map(
      (metric) => Prisma.sql`${metricColumn(metric, side)} AS ${Prisma.raw(`"${metric}"`)}`,
    );
    return Prisma.sql`
      SELECT ${side} AS side, ${Prisma.join(columns)}
      FROM current_season_matches
      WHERE ${teamColumn(side)} = ${teamSlug}
    `;
  };
  const aggregates = metrics.map((metric) =>
    Prisma.raw(
      `SUM("${metric}")::int AS "${metric}Total", ROUND(AVG("${metric}"), 2)::float8 AS "${metric}Average"`,
    ),
  );

  const rows = await db.$queryRaw<SummaryRow[]>`
    WITH current_season_matches AS (${currentSeasonMatches(leagueSlug)}),
    team_matches AS (${teamSideMatches("home")} UNION ALL ${teamSideMatches("away")})
    SELECT COALESCE(side, 'all') AS slice, COUNT(*)::int AS matches, ${Prisma.join(aggregates)}
    FROM team_matches
    GROUP BY ROLLUP(side)
  `;

  const summarize = (slice: Slice): SliceSummary => {
    // Sem Partidas, o ROLLUP ainda devolve a linha "all", com COUNT 0 e somas nulas.
    const row = rows.find((candidate) => candidate.slice === slice && candidate.matches > 0);
    const byMetric = Object.fromEntries(
      metrics.map((metric) => [
        metric,
        row
          ? { total: row[`${metric}Total`], average: row[`${metric}Average`] }
          : { total: 0, average: null },
      ]),
    ) as Record<Metric, MetricSummary>;
    return { matches: row?.matches ?? 0, ...byMetric };
  };

  return { all: summarize("all"), home: summarize("home"), away: summarize("away") };
}
