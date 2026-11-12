import { parse } from "csv-parse/sync";
import { type Team, teamFromSourceName } from "./teams.ts";

export type ParsedMatch = {
  date: Date;
  homeTeam: Team;
  awayTeam: Team;
  homeGoals: number;
  awayGoals: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
};

type Row = Record<string, string>;

export function parseMatches(csv: string, divisionCode: string): ParsedMatch[] {
  const rows: Row[] = parse(csv, { bom: true, columns: true, skip_empty_lines: true });
  for (const row of rows) {
    const division = column(row, "Div");
    if (division !== divisionCode) {
      throw new Error(`Divisão errada no CSV: esperada "${divisionCode}", encontrada "${division}"`);
    }
  }
  return rows.filter(hasScore).map((row) => ({
    date: parseDate(column(row, "Date")),
    homeTeam: teamFromSourceName(column(row, "HomeTeam")),
    awayTeam: teamFromSourceName(column(row, "AwayTeam")),
    homeGoals: parseGoals(column(row, "FTHG")),
    awayGoals: parseGoals(column(row, "FTAG")),
    homeShotsOnTarget: parseStat(row, "HST"),
    awayShotsOnTarget: parseStat(row, "AST"),
    homeYellowCards: parseStat(row, "HY"),
    awayYellowCards: parseStat(row, "AY"),
    homeRedCards: parseStat(row, "HR"),
    awayRedCards: parseStat(row, "AR"),
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

function isCount(value: string): boolean {
  return /^\d+$/.test(value);
}

function parseGoals(value: string): number {
  if (!isCount(value)) throw new Error(`Placar inválido no CSV: "${value}"`);
  return Number(value);
}

function parseStat(row: Row, name: string): number {
  const value = column(row, name);
  if (!isCount(value)) throw new Error(`Valor inválido na coluna ${name} do CSV: "${value}"`);
  return Number(value);
}

function parseDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) throw new Error(`Data inválida no CSV: "${value}"`);
  return new Date(Date.UTC(year, month - 1, day));
}
