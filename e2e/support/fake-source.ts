import { readFile } from "node:fs/promises";
import type { Source } from "@estatisticas/collector";

const headerOnly = "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,HST,AST,HY,AY,HR,AR\n";
const fixtureSeason = "2026/27";

export const midSeason = () => new Date("2027-03-01T12:00:00.000Z");

// Chaves "E0" valem para a Temporada 2026/27; "E0 2027/28" para outra Temporada.
// Sem fixture, a 2026/27 existe só com o cabeçalho e as outras Temporadas não existem.
export function fakeSource(fixtures: Record<string, string>): Source {
  return {
    async fetchCsv({ divisionCode, season }) {
      const fixture =
        fixtures[`${divisionCode} ${season}`] ??
        (season === fixtureSeason ? fixtures[divisionCode] : undefined);
      if (!fixture) return season === fixtureSeason ? headerOnly : null;
      return await readFile(new URL(`../fixtures/${fixture}`, import.meta.url), "utf8");
    },
  };
}
