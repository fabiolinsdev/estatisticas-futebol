import { readFile } from "node:fs/promises";
import type { Source } from "@estatisticas/collector";

const headerOnly = "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,HST,AST,HY,AY,HR,AR\n";

export function fakeSource(fixturesByDivision: Record<string, string>): Source {
  return {
    async fetchCsv({ divisionCode }) {
      const fixture = fixturesByDivision[divisionCode];
      if (!fixture) return headerOnly;
      return await readFile(new URL(`../fixtures/${fixture}`, import.meta.url), "utf8");
    },
  };
}
