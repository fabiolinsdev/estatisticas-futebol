export type ExcludedMatch = {
  leagueSlug: string;
  season: string;
  homeTeamSlug: string;
  awayTeamSlug: string;
  reason: string;
};

// Partidas abandonadas ou decididas fora de campo (W.O., decisão de tribunal), mantidas à mão.
export const excludedMatches: ExcludedMatch[] = [];
