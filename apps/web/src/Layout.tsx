import { Link, Outlet, useLoaderData, useLocation, useNavigation, useParams } from "react-router";
import { getJson, type League } from "./api.ts";
import { formatDateTime } from "./format.ts";

export async function layoutLoader({ request }: { request: Request }) {
  return getJson<League[]>("/leagues", request.signal);
}

export function Layout() {
  const { data: leagues, lastCollectedAt } = useLoaderData<typeof layoutLoader>();
  const { league: current } = useParams();
  const { search } = useLocation();
  const navigation = useNavigation();

  return (
    <>
      <header>
        <h1>⚽ Estatísticas de Futebol</h1>
        <p>Rankings por Time nas cinco principais Ligas europeias, na Temporada atual</p>
      </header>
      <nav aria-label="Ligas" className="tabs leagues">
        {leagues.map((league) => (
          <Link
            key={league.slug}
            to={{ pathname: `/${league.slug}`, search }}
            aria-current={league.slug === current ? "page" : undefined}
          >
            {league.name}
          </Link>
        ))}
      </nav>
      {navigation.state === "loading" && <p className="status">Carregando…</p>}
      <Outlet />
      <footer>{lastCollectedAt ? `Atualizado em ${formatDateTime(lastCollectedAt)}` : "Ainda sem coleta"}</footer>
    </>
  );
}
