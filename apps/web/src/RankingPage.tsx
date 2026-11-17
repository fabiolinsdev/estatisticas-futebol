import { Link, useLoaderData, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { getJson, type RankingRow } from "./api.ts";
import { formatAverage, formatMatches } from "./format.ts";
import { metrics, venues, type Metric } from "./labels.ts";

const orders = { desc: "Maior média primeiro", asc: "Menor média primeiro" };

const filters = {
  metrica: { options: metrics, fallback: "goalsFor" },
  mando: { options: venues, fallback: "all" },
  ordem: { options: orders, fallback: "desc" },
} as const;

type Filter = keyof typeof filters;

function read<F extends Filter>(search: URLSearchParams, filter: F) {
  const { options, fallback } = filters[filter];
  const value = search.get(filter);
  return (value !== null && value in options ? value : fallback) as keyof (typeof filters)[F]["options"];
}

function linkWith(search: URLSearchParams, filter: Filter, value: string) {
  const next = new URLSearchParams(search);
  if (value === filters[filter].fallback) next.delete(filter);
  else next.set(filter, value);
  const query = next.toString();
  return query ? `?${query}` : "";
}

export async function rankingLoader({ params, request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams({
    metric: read(search, "metrica"),
    venue: read(search, "mando"),
    order: read(search, "ordem"),
  });
  return getJson<RankingRow[]>(`/leagues/${params.league}/rankings?${query}`, request.signal);
}

function Tabs({ filter, label }: { filter: Filter; label: string }) {
  const [search] = useSearchParams();
  const current = read(search, filter);
  return (
    <nav aria-label={label} className={`tabs ${filter === "metrica" ? "metrics" : "filters"}`}>
      {Object.entries(filters[filter].options).map(([value, text]) => (
        <Link
          key={value}
          to={{ search: linkWith(search, filter, value) }}
          aria-current={value === current ? "page" : undefined}
        >
          {text}
        </Link>
      ))}
    </nav>
  );
}

function Ranking({ rows, leader, metric }: { rows: RankingRow[]; leader: RankingRow; metric: Metric }) {
  const max = Math.max(...rows.map((row) => row.average), 0);
  const sum = (field: "total" | "matches") => rows.reduce((acc, row) => acc + row[field], 0);
  const leagueAverage = sum("total") / sum("matches");

  return (
    <div className="ranking">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th className="number">Partidas</th>
            <th className="number">Total</th>
            <th className="number">Média</th>
            <th aria-label="Comparação" className="comparison" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team.slug}>
              <td>{index + 1}</td>
              <td>
                <Link to={`times/${row.team.slug}`}>{row.team.name}</Link>
              </td>
              <td className="number">{row.matches}</td>
              <td className="number">{row.total}</td>
              <td className="number">{formatAverage(row.average)}</td>
              <td>
                <div className="bar" style={{ width: `${max > 0 ? (row.average / max) * 100 : 0}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <aside>
        <h2>Líder em {metrics[metric].toLowerCase()}</h2>
        <p className="highlight">{leader.team.name}</p>
        <p>
          {leader.total} em {formatMatches(leader.matches)} ({formatAverage(leader.average)} por Partida)
        </p>
        <h2>Média da Liga</h2>
        <p className="highlight secondary">{formatAverage(leagueAverage)}</p>
        <p>por Time, por Partida</p>
      </aside>
    </div>
  );
}

export function RankingPage() {
  const { data: rows } = useLoaderData<typeof rankingLoader>();
  const [search] = useSearchParams();
  const leader = rows[0];

  return (
    <>
      <Tabs filter="metrica" label="Métricas" />
      <div aria-label="Filtros" role="navigation" className="tabs filters">
        <Tabs filter="mando" label="Mando" />
        <Tabs filter="ordem" label="Ordem" />
      </div>
      {leader ? (
        <Ranking rows={rows} leader={leader} metric={read(search, "metrica")} />
      ) : (
        <p className="status">Nenhum Time tem Partidas neste recorte ainda.</p>
      )}
    </>
  );
}
