import { buildApp } from "@estatisticas/api";
import type { createDb } from "@estatisticas/db";

export const source = { name: "football-data.co.uk", url: "https://www.football-data.co.uk" };

type Body = { data?: unknown; message?: unknown };

export async function get(db: ReturnType<typeof createDb>, url: string) {
  const response = await buildApp({ db }).inject({ method: "GET", url });
  return { status: response.statusCode, headers: response.headers, body: response.json<Body>() };
}
