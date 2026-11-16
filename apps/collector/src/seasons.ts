const august = 7;

export function seasonEndingIn(year: number): string {
  return `${year - 1}/${String(year % 100).padStart(2, "0")}`;
}

export function nextSeason(season: string): string {
  return seasonEndingIn(endYear(season) + 1);
}

export function isNextSeasonDue(season: string, now: Date): boolean {
  return now.getTime() >= Date.UTC(endYear(season), august, 1);
}

function endYear(season: string): number {
  if (!/^\d{4}\/\d{2}$/.test(season)) throw new Error(`Temporada inválida: "${season}"`);
  return Number(season.slice(0, 4)) + 1;
}
