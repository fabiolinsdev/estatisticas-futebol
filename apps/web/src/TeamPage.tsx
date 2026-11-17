import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { ApiError, getJson, type TeamMatch, type TeamSummary } from "./api.ts";
import { formatAverage, formatDay, formatMatches } from "./format.ts";
import { metrics, venues, type Metric } from "./labels.ts";

async function matchesUnlessDisabled(path: string, signal: AbortSignal) {
  try {
    return (await getJson<TeamMatch[]>(path, signal)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function teamLoader({ params, request }: LoaderFunctionArgs) {
  const path = `/leagues/${params.league}/teams/${params.team}`;
  const [summary, matches] = await Promise.all([
    getJson<TeamSummary>(path, request.signal),
    matchesUnlessDisabled(`${path}/matches`, request.signal),
  ]);
  return { summary: summary.data, matches };
}

const slices = ["all", "home", "away"] as const;

const versus = (team: number, opponent: number) => `${team} × ${opponent}`;

export function TeamPage() {
  const { summary, matches } = useLoaderData<typeof teamLoader>();

  return (
    <section className="team">
      <Link to={`/${summary.league.slug}`}>← Ranking da {summary.league.name}</Link>
      <h2 className="team-name">{summary.team.name}</h2>
      <p>
        {summary.league.name} · Temporada {summary.season}
      </p>

      <table aria-label="Resumo">
        <thead>
          <tr>
            <th rowSpan={2}>Métrica</th>
            {slices.map((slice) => (
              <th key={slice} colSpan={2}>
                {venues[slice]} ({formatMatches(summary[slice].matches)})
              </th>
            ))}
          </tr>
          <tr>
            {slices.flatMap((slice) => [
              <th key={`${slice}-total`} className="number">
                Total
              </th>,
              <th key={`${slice}-average`} className="number">
                Média
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(metrics) as Metric[]).map((metric) => (
            <tr key={metric}>
              <td>{metrics[metric]}</td>
              {slices.flatMap((slice) => {
                const { total, average } = summary[slice][metric];
                return [
                  <td key={`${slice}-total`} className="number">
                    {total}
                  </td>,
                  <td key={`${slice}-average`} className="number">
                    {average === null ? "sem Partidas" : formatAverage(average)}
                  </td>,
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {matches && (
        <table aria-label="Partidas">
          <thead>
            <tr>
              <th>Data</th>
              <th>Mando</th>
              <th>Adversário</th>
              <th className="number">Placar</th>
              <th className="number">{metrics.shotsOnTarget}</th>
              <th className="number">{metrics.yellowCards}</th>
              <th className="number">{metrics.redCards}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(({ date, venue, team, opponent }) => (
              <tr key={`${date}-${opponent.slug}`}>
                <td>{formatDay(date)}</td>
                <td>{venues[venue]}</td>
                <td>{opponent.name}</td>
                <td className="number">{versus(team.goals, opponent.goals)}</td>
                <td className="number">{versus(team.shotsOnTarget, opponent.shotsOnTarget)}</td>
                <td className="number">{versus(team.yellowCards, opponent.yellowCards)}</td>
                <td className="number">{versus(team.redCards, opponent.redCards)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
