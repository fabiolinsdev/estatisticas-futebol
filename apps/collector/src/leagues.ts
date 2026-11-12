export type League = {
  slug: string;
  name: string;
  divisionCode: string;
};

export const leagues: League[] = [
  { slug: "premier-league", name: "Premier League", divisionCode: "E0" },
  { slug: "la-liga", name: "La Liga", divisionCode: "SP1" },
  { slug: "serie-a", name: "Serie A", divisionCode: "I1" },
  { slug: "bundesliga", name: "Bundesliga", divisionCode: "D1" },
  { slug: "ligue-1", name: "Ligue 1", divisionCode: "F1" },
];
