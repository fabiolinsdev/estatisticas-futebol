export type Envelope<T> = {
  data: T;
  source: { name: string; url: string };
  lastCollectedAt: string | null;
};

export type League = { slug: string; name: string; currentSeason: string };

export type TeamRef = { slug: string; name: string };

type LeagueRef = { slug: string; name: string };

export type RankingRow = { team: TeamRef; matches: number; total: number; average: number };

type MetricValue = { total: number; average: number | null };

export type Slice = {
  matches: number;
  goalsFor: MetricValue;
  goalsAgainst: MetricValue;
  shotsOnTarget: MetricValue;
  yellowCards: MetricValue;
  redCards: MetricValue;
};

export type TeamSummary = {
  team: TeamRef;
  league: LeagueRef;
  season: string;
  all: Slice;
  home: Slice;
  away: Slice;
};

type MatchSide = TeamRef & { goals: number; shotsOnTarget: number; yellowCards: number; redCards: number };

export type TeamMatch = { date: string; venue: "home" | "away"; team: MatchSide; opponent: MatchSide };

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<Envelope<T>> {
  const response = await fetch(new URL(`/api${path}`, window.location.origin), { signal });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ??
        `Não foi possível carregar os dados (a API respondeu ${response.status}). Tente de novo em instantes.`,
    );
  }
  return body as Envelope<T>;
}
