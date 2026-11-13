import { expect } from "vitest";
import { buildApp, type Env } from "@estatisticas/api";
import type { createDb } from "@estatisticas/db";

export const source = { name: "football-data.co.uk", url: "https://www.football-data.co.uk" };

export const anyTimestamp: unknown = expect.any(String);

type Body = { data?: unknown; message?: unknown };

export async function get(db: ReturnType<typeof createDb>, url: string, env: Env = {}) {
  const response = await buildApp({ db, env }).inject({ method: "GET", url });
  return { status: response.statusCode, headers: response.headers, body: response.json<Body>() };
}
