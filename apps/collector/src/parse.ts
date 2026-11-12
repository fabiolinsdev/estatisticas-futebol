import { parse } from "csv-parse/sync";
import { type Team, teamFromSourceName } from "./teams.ts";

export type ParsedMatch = {
  date: Date;
  homeTeam: Team;
  awayTeam: Team;
  homeGoals: number;
  awayGoals: number;
};

type Row = Record<string, string>;

export function parseMatches(csv: string): ParsedMatch[] {
  const rows: Row[] = parse(csv, { bom: true, columns: true, skip_empty_lines: true });
  return rows.filter(hasScore).map((row) => ({
    date: parseDate(column(row, "Date")),
    homeTeam: teamFromSourceName(column(row, "HomeTeam")),
    awayTeam: teamFromSourceName(column(row, "AwayTeam")),
    homeGoals: parseGoals(column(row, "FTHG")),
    awayGoals: parseGoals(column(row, "FTAG")),
  }));
}

function hasScore(row: Row): boolean {
  return column(row, "FTHG") !== "" && column(row, "FTAG") !== "";
}

function column(row: Row, name: string): string {
  const value = row[name];
  if (value === undefined) throw new Error(`Coluna ausente no CSV: ${name}`);
  return value;
}

function parseGoals(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`Placar inválido no CSV: "${value}"`);
  return Number(value);
}

function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) throw new Error(`Data inválida no CSV: "${value}"`);
  return new Date(Date.UTC(year, month - 1, day));
}
