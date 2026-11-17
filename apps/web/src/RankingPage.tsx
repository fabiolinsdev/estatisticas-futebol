import { Link, useLoaderData, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { getJson, type RankingRow } from "./api.ts";
import { formatAverage } from "./format.ts";
import { metrics, venues } from "./labels.ts";

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

function Tabs({ filter, label, className }: { filter: Filter; label: string; className: string }) {
  const [search] = useSearchParams();
  const current = read(search, filter);
  return (
    <nav aria-label={label} className={`tabs ${className}`}>
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

export function RankingPage() {
  const { data: rows } = useLoaderData<typeof rankingLoader>();
  const [search] = useSearchParams();
  const metric = read(search, "metrica");
  const max = Math.max(...rows.map((row) => row.average), 0);
  const leader = rows[0];
  const leagueAverage = rows.reduce((sum, row) => sum + row.average, 0) / rows.length;

  return (
    <>
      <Tabs filter="metrica" label="Métricas" className="metrics" />
      <div aria-label="Filtros" role="navigation" className="tabs filters">
        <Tabs filter="mando" label="Mando" className="filters" />
        <Tabs filter="ordem" label="Ordem" className="filters" />
      </div>
      <div className="ranking">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th className="number">Partidas</th>
              <th className="number">Total</th>
              <th className="number">Média</th>
              <th aria-label="Comparação" style={{ width: "30%" }} />
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
        {leader && (
          <aside>
            <h2>Líder em {metrics[metric].toLowerCase()}</h2>
            <p className="highlight">{leader.team.name}</p>
            <p>
              {leader.total} em {leader.matches} Partidas ({formatAverage(leader.average)} por Partida)
            </p>
            <h2>Média da Liga</h2>
            <p className="highlight secondary">{formatAverage(leagueAverage)}</p>
            <p>por Time, por Partida</p>
          </aside>
        )}
      </div>
    </>
  );
}
