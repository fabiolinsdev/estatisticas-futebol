import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { RankingRow } from "../../src/api.ts";

export const lastCollectedAt = "2026-11-16T21:51:57.384Z";

export function envelope<T>(data: T) {
  return {
    data,
    source: { name: "football-data.co.uk", url: "https://www.football-data.co.uk" },
    lastCollectedAt,
  };
}

export const leagues = [
  { slug: "premier-league", name: "Premier League", currentSeason: "2026/27" },
  { slug: "la-liga", name: "La Liga", currentSeason: "2026/27" },
  { slug: "serie-a", name: "Serie A", currentSeason: "2026/27" },
  { slug: "bundesliga", name: "Bundesliga", currentSeason: "2026/27" },
  { slug: "ligue-1", name: "Ligue 1", currentSeason: "2026/27" },
];

const row = (slug: string, name: string, matches: number, total: number, average: number): RankingRow => ({
  team: { slug, name },
  matches,
  total,
  average,
});

const rankings: Record<string, RankingRow[]> = {
  "premier-league?metric=goalsFor&order=desc&venue=all": [
    row("brighton", "Brighton", 10, 26, 2.6),
    row("manchester-city", "Manchester City", 10, 21, 2.1),
    row("chelsea", "Chelsea", 10, 19, 1.9),
  ],
  "premier-league?metric=yellowCards&order=desc&venue=all": [
    row("newcastle", "Newcastle", 10, 31, 3.1),
    row("bournemouth", "Bournemouth", 10, 27, 2.7),
    row("hull", "Hull", 10, 27, 2.7),
  ],
  "serie-a?metric=yellowCards&order=desc&venue=all": [
    row("fiorentina", "Fiorentina", 11, 24, 2.18),
    row("genoa", "Genoa", 11, 24, 2.18),
    row("bologna", "Bologna", 11, 23, 2.09),
  ],
  "premier-league?metric=goalsFor&order=desc&venue=home": [
    row("brighton", "Brighton", 5, 15, 3),
    row("chelsea", "Chelsea", 5, 13, 2.6),
    row("manchester-city", "Manchester City", 5, 11, 2.2),
  ],
  "premier-league?metric=goalsFor&order=asc&venue=all": [
    row("sunderland", "Sunderland", 10, 8, 0.8),
    row("nottingham-forest", "Nottingham Forest", 10, 9, 0.9),
    row("coventry", "Coventry", 10, 10, 1),
  ],
  "premier-league?metric=goalsFor&order=asc&venue=home": [
    row("sunderland", "Sunderland", 5, 2, 0.4),
    row("nottingham-forest", "Nottingham Forest", 5, 3, 0.6),
    row("liverpool", "Liverpool", 5, 4, 0.8),
  ],
  "premier-league?metric=yellowCards&order=asc&venue=home": [
    row("manchester-city", "Manchester City", 5, 3, 0.6),
    row("coventry", "Coventry", 5, 4, 0.8),
    row("tottenham", "Tottenham", 5, 4, 0.8),
  ],
  "serie-a?metric=yellowCards&order=asc&venue=home": [
    row("atalanta", "Atalanta", 6, 2, 0.33),
    row("milan", "Milan", 5, 4, 0.8),
    row("inter", "Inter", 6, 5, 0.83),
  ],
};

const metric = (total: number, average: number | null) => ({ total, average });

export const brightonSummary = {
  team: { slug: "brighton", name: "Brighton" },
  league: { slug: "premier-league", name: "Premier League" },
  season: "2026/27",
  all: {
    matches: 10,
    goalsFor: metric(26, 2.6),
    goalsAgainst: metric(7, 0.7),
    shotsOnTarget: metric(52, 5.2),
    yellowCards: metric(24, 2.4),
    redCards: metric(1, 0.1),
  },
  home: {
    matches: 5,
    goalsFor: metric(15, 3),
    goalsAgainst: metric(1, 0.2),
    shotsOnTarget: metric(31, 6.2),
    yellowCards: metric(15, 3),
    redCards: metric(0, 0),
  },
  away: {
    matches: 5,
    goalsFor: metric(11, 2.2),
    goalsAgainst: metric(6, 1.2),
    shotsOnTarget: metric(21, 4.2),
    yellowCards: metric(9, 1.8),
    redCards: metric(1, 0.2),
  },
};

export const noMatches = {
  matches: 0,
  goalsFor: metric(0, null),
  goalsAgainst: metric(0, null),
  shotsOnTarget: metric(0, null),
  yellowCards: metric(0, null),
  redCards: metric(0, null),
};

const brightonMatches = [
  {
    date: "2026-08-23",
    venue: "home",
    team: { slug: "brighton", name: "Brighton", goals: 4, shotsOnTarget: 6, yellowCards: 2, redCards: 0 },
    opponent: { slug: "aston-villa", name: "Aston Villa", goals: 0, shotsOnTarget: 0, yellowCards: 3, redCards: 1 },
  },
  {
    date: "2026-08-30",
    venue: "away",
    team: { slug: "brighton", name: "Brighton", goals: 3, shotsOnTarget: 6, yellowCards: 3, redCards: 0 },
    opponent: { slug: "chelsea", name: "Chelsea", goals: 4, shotsOnTarget: 6, yellowCards: 1, redCards: 0 },
  },
];

const teamNotFound = (team: string) =>
  HttpResponse.json(
    { statusCode: 404, error: "Not Found", message: `Time inexistente na Premier League: "${team}".` },
    { status: 404 },
  );

export const apiUrl = (path: string) => new URL(`/api${path}`, window.location.origin).href;

export const server = setupServer(
  http.get(apiUrl("/leagues"), () => HttpResponse.json(envelope(leagues))),
  http.get(apiUrl("/leagues/:league/rankings"), ({ request, params }) => {
    if (!leagues.some((league) => league.slug === params.league)) {
      const message = `Liga inexistente: "${String(params.league)}". Use premier-league, la-liga, serie-a, bundesliga ou ligue-1.`;
      return HttpResponse.json({ statusCode: 404, error: "Not Found", message }, { status: 404 });
    }
    const query = new URL(request.url).searchParams;
    const metric = query.get("metric");
    const order = query.get("order") ?? "desc";
    const venue = query.get("venue") ?? "all";
    const data = rankings[`${String(params.league)}?metric=${metric}&order=${order}&venue=${venue}`];
    if (!data) return HttpResponse.json({ statusCode: 500, error: "Internal Server Error", message: "sem fixture" }, { status: 500 });
    return HttpResponse.json(envelope(data));
  }),
  http.get(apiUrl("/leagues/premier-league/teams/:team"), ({ params }) =>
    params.team === "brighton" ? HttpResponse.json(envelope(brightonSummary)) : teamNotFound(String(params.team)),
  ),
  http.get(apiUrl("/leagues/premier-league/teams/:team/matches"), ({ params }) =>
    params.team === "brighton" ? HttpResponse.json(envelope(brightonMatches)) : teamNotFound(String(params.team)),
  ),
);
