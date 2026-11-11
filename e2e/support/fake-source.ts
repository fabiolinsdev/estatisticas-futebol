import { readFileSync } from "node:fs";
import type { Source } from "@estatisticas/collector";

export function fakeSource(fixturesByDivision: Record<string, string>): Source {
  return {
    async fetchCsv({ divisionCode }) {
      const fixture = fixturesByDivision[divisionCode];
      if (!fixture) throw new Error(`Sem fixture para a divisão ${divisionCode}`);
      return readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), "utf8");
    },
  };
}
