import { createDb } from "@estatisticas/db";
import { footballDataSource } from "./football-data-source.ts";
import { ingest, type LeagueReport } from "./ingest.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida: configure o .env (veja o .env.example)");
  process.exit(1);
}

const db = createDb(url);
try {
  await ingest({ db, source: footballDataSource(), onLeague: (report) => console.log(describe(report)) });
  console.log("Coleta concluída sem erros.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

function describe(report: LeagueReport): string {
  switch (report.outcome) {
    case "saved": {
      const rollover = report.previousSeason ? ` (virada da ${report.previousSeason})` : "";
      return `${report.league}: ${report.season}, ${report.matches} Partidas gravadas${rollover}`;
    }
    case "unchanged":
      return `${report.league}: ${report.season} sem mudança`;
    case "failed":
      return `${report.league}: falhou`;
  }
}
