import Fastify from "fastify";
import type { Db } from "@estatisticas/db";
import { goalsForRanking } from "./rankings.ts";

type RankingRequest = {
  Params: { leagueSlug: string };
  Querystring: { metric: "goalsFor" };
};

export function buildApp({ db }: { db: Db }) {
  const app = Fastify();

  app.get<RankingRequest>(
    "/leagues/:leagueSlug/rankings",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { metric: { type: "string", enum: ["goalsFor"] } },
          required: ["metric"],
        },
      },
    },
    async (request) => ({ data: await goalsForRanking(db, request.params.leagueSlug) }),
  );

  return app;
}
