export type Team = {
  slug: string;
  name: string;
};

const teamsBySourceName: Record<string, Team> = {
  Arsenal: { slug: "arsenal", name: "Arsenal" },
  "Aston Villa": { slug: "aston-villa", name: "Aston Villa" },
  "Man United": { slug: "manchester-united", name: "Manchester United" },
};

export function teamFromSourceName(sourceName: string): Team {
  const team = teamsBySourceName[sourceName];
  if (!team) throw new Error(`Time desconhecido na fonte: "${sourceName}"`);
  return team;
}
