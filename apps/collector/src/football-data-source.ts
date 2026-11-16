import { setTimeout } from "node:timers/promises";
import type { Source } from "./source.ts";

const userAgent = "estatisticas-futebol/1.0 (+https://github.com/fabiolinsdev/estatisticas-futebol)";
const retryDelaysMs = [5000, 15000];

type FootballDataOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export function footballDataSource({
  baseUrl = "https://www.football-data.co.uk",
  timeoutMs = 30_000,
  sleep = (ms) => setTimeout(ms),
}: FootballDataOptions = {}): Source {
  return {
    async fetchCsv({ divisionCode, season }) {
      const url = `${baseUrl}/mmz4281/${seasonCode(season)}/${divisionCode}.csv`;
      let lastFailure = "";
      for (const [attempt, delay] of [0, ...retryDelaysMs].entries()) {
        if (attempt > 0) await sleep(delay);

        let response: Response;
        try {
          response = await fetch(url, {
            headers: { "user-agent": userAgent },
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch (error) {
          lastFailure = error instanceof Error ? error.message : String(error);
          continue;
        }

        if (response.ok) return await response.text();
        await response.body?.cancel();
        if (response.status === 404) return null;
        lastFailure = `HTTP ${response.status}`;
        if (!isTransient(response.status)) throw new Error(`Falha ao baixar ${url}: ${lastFailure}`);
      }
      const attempts = retryDelaysMs.length + 1;
      throw new Error(`Falha ao baixar ${url} depois de ${attempts} tentativas: ${lastFailure}`);
    },
  };
}

function seasonCode(season: string): string {
  return season.slice(2, 4) + season.slice(5, 7);
}

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}
