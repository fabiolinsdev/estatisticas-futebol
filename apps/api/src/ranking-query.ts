import { badRequest } from "./http-errors.ts";
import { type Order, orders, type Venue, venues } from "./rankings.ts";
import { type Metric, metrics } from "./season-matches.ts";

type QueryValue = string | string[];

export type RawRankingQuery = { metric?: QueryValue; order?: QueryValue; venue?: QueryValue };

export function parseRankingQuery(query: RawRankingQuery): {
  metric: Metric;
  order: Order;
  venue: Venue;
} {
  const metricsHint = `Use ${listWithOr(metrics)}.`;
  if (query.metric === undefined) throw badRequest(`Informe a métrica. ${metricsHint}`);
  if (!isOneOf(metrics, query.metric)) {
    throw badRequest(`Métrica inválida: "${joinRepeated(query.metric)}". ${metricsHint}`);
  }

  const order = query.order ?? "desc";
  if (!isOneOf(orders, order)) {
    throw badRequest(`Ordem inválida: "${joinRepeated(order)}". Use ${listWithOr(orders)}.`);
  }

  const venue = query.venue ?? "all";
  if (!isOneOf(venues, venue)) {
    throw badRequest(`Mando inválido: "${joinRepeated(venue)}". Use ${listWithOr(venues)}.`);
  }

  return { metric: query.metric, order, venue };
}

function isOneOf<T extends string>(allowed: readonly T[], value: QueryValue): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function joinRepeated(value: QueryValue): string {
  return Array.isArray(value) ? value.join(",") : value;
}

export function listWithOr(values: readonly string[]): string {
  return `${values.slice(0, -1).join(", ")} ou ${values.at(-1)}`;
}
