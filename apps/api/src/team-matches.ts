import type { Db } from "@estatisticas/db";
import type { CurrentLeague } from "./leagues.ts";
import type { Side } from "./season-matches.ts";

type TeamRef = { slug: string; name: string };
type MatchRow = Record<
  `${Side}Goals` | `${Side}ShotsOnTarget` | `${Side}YellowCards` | `${Side}RedCards`,
  number
> &
  Record<`${Side}Team`, TeamRef> & { homeTeamSlug: string; date: Date };

export async function teamMatches(db: Db, league: CurrentLeague, teamSlug: string) {
  const matches = await db.match.findMany({
    where: {
      leagueSlug: league.slug,
      season: league.currentSeason,
      OR: [{ homeTeamSlug: teamSlug }, { awayTeamSlug: teamSlug }],
    },
    include: {
      homeTeam: { select: { slug: true, name: true } },
      awayTeam: { select: { slug: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  return matches.map((match) => {
    const venue: Side = match.homeTeamSlug === teamSlug ? "home" : "away";
    return {
      date: match.date.toISOString().slice(0, 10),
      venue,
      team: sideOf(match, venue),
      opponent: sideOf(match, venue === "home" ? "away" : "home"),
    };
  });
}

function sideOf(match: MatchRow, side: Side) {
  return {
    ...match[`${side}Team`],
    goals: match[`${side}Goals`],
    shotsOnTarget: match[`${side}ShotsOnTarget`],
    yellowCards: match[`${side}YellowCards`],
    redCards: match[`${side}RedCards`],
  };
}
