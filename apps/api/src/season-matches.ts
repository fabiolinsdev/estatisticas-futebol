import { Prisma } from "@estatisticas/db";

const columnsByMetric = {
  goalsFor: { home: "home_goals", away: "away_goals" },
  goalsAgainst: { home: "away_goals", away: "home_goals" },
  shotsOnTarget: { home: "home_shots_on_target", away: "away_shots_on_target" },
  yellowCards: { home: "home_yellow_cards", away: "away_yellow_cards" },
  redCards: { home: "home_red_cards", away: "away_red_cards" },
} as const;

export type Metric = keyof typeof columnsByMetric;
export const metrics = Object.keys(columnsByMetric) as Metric[];

export type Side = "home" | "away";

export function metricColumn(metric: Metric, side: Side) {
  return Prisma.raw(columnsByMetric[metric][side]);
}

export function teamColumn(side: Side) {
  return Prisma.raw(`${side}_team_slug`);
}

export function currentSeasonMatches(leagueSlug: string) {
  return Prisma.sql`
    SELECT m.*
    FROM matches m
    JOIN leagues l ON l.slug = m.league_slug AND l.current_season = m.season
    WHERE l.slug = ${leagueSlug}
  `;
}
