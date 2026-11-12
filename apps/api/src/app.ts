import Fastify from "fastify";
import type { Db } from "@estatisticas/db";
import { notFound } from "./http-errors.ts";
import { findLeague, findParticipatingTeam, leagueSlugs, listLeagues } from "./leagues.ts";
import { listWithOr, parseRankingQuery, type RawRankingQuery } from "./ranking-query.ts";
import { ranking } from "./rankings.ts";
import { teamSummary } from "./team-summary.ts";

type RankingRequest = {
  Params: { leagueSlug: string };
  Querystring: RawRankingQuery;
};

type TeamRequest = { Params: { leagueSlug: string; teamSlug: string } };

export function buildApp({ db }: { db: Db }) {
  const app = Fastify();

  app.addHook("onSend", async (_request, reply) => {
    if (reply.statusCode === 200) reply.header("cache-control", cdnCache);
  });

  async function requireLeague(slug: string) {
    const league = await findLeague(db, slug);
    if (league) return league;
    const slugs = await leagueSlugs(db);
    const hint = slugs.length > 0 ? ` Use ${listWithOr(slugs)}.` : "";
    throw notFound(`Liga inexistente: "${slug}".${hint}`);
  }

  app.get("/leagues", async () => envelope(await listLeagues(db)));

  app.get<RankingRequest>("/leagues/:leagueSlug/rankings", async (request) => {
    const query = parseRankingQuery(request.query);
    const league = await requireLeague(request.params.leagueSlug);
    return envelope(await ranking(db, league.slug, query));
  });

  app.get<TeamRequest>("/leagues/:leagueSlug/teams/:teamSlug", async (request) => {
    const { leagueSlug, teamSlug } = request.params;
    const league = await requireLeague(leagueSlug);
    const team = await findParticipatingTeam(db, league, teamSlug);
    if (!team) throw notFound(`Time inexistente na ${league.name}: "${teamSlug}".`);
    return envelope({
      team,
      league: { slug: league.slug, name: league.name },
      season: league.currentSeason,
      ...(await teamSummary(db, league.slug, team.slug)),
    });
  });

  return app;
}

const cdnCache = "public, s-maxage=600, stale-while-revalidate=86400";

const source = { name: "football-data.co.uk", url: "https://www.football-data.co.uk" };

function envelope<T>(data: T) {
  return { data, source };
}
