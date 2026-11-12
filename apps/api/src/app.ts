import Fastify from "fastify";
import type { Db } from "@estatisticas/db";
import { notFound } from "./http-errors.ts";
import { leagueSlugs, listLeagues } from "./leagues.ts";
import { listWithOr, parseRankingQuery, type RawRankingQuery } from "./ranking-query.ts";
import { ranking } from "./rankings.ts";

type RankingRequest = {
  Params: { leagueSlug: string };
  Querystring: RawRankingQuery;
};

export function buildApp({ db }: { db: Db }) {
  const app = Fastify();

  app.addHook("onSend", async (_request, reply) => {
    if (reply.statusCode === 200) reply.header("cache-control", cdnCache);
  });

  app.get("/leagues", async () => envelope(await listLeagues(db)));

  app.get<RankingRequest>("/leagues/:leagueSlug/rankings", async (request) => {
    const { metric, order } = parseRankingQuery(request.query);
    const { leagueSlug } = request.params;
    const slugs = await leagueSlugs(db);
    if (!slugs.includes(leagueSlug)) {
      const hint = slugs.length > 0 ? ` Use ${listWithOr(slugs)}.` : "";
      throw notFound(`Liga inexistente: "${leagueSlug}".${hint}`);
    }
    return envelope(await ranking(db, leagueSlug, metric, order));
  });

  return app;
}

const cdnCache = "public, s-maxage=600, stale-while-revalidate=86400";

const source = { name: "football-data.co.uk", url: "https://www.football-data.co.uk" };

function envelope<T>(data: T) {
  return { data, source };
}
