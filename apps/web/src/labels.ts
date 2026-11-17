export const metrics = {
  goalsFor: "Gols marcados",
  goalsAgainst: "Gols sofridos",
  shotsOnTarget: "Chutes ao gol",
  yellowCards: "Cartões amarelos",
  redCards: "Cartões vermelhos",
};

export type Metric = keyof typeof metrics;

export const venues = { all: "Todas", home: "Mandante", away: "Visitante" };
