import { Link, useParams, useRouteError, useRouteLoaderData } from "react-router";
import { ApiError } from "./api.ts";
import type { layoutLoader } from "./Layout.tsx";

function Alert({ message }: { message: string }) {
  return (
    <p role="alert" className="error">
      {message}
    </p>
  );
}

export function ErrorMessage() {
  const error = useRouteError();
  return (
    <Alert
      message={
        error instanceof ApiError ? error.message : "Não foi possível falar com a API. Tente de novo em instantes."
      }
    />
  );
}

export function TeamErrorMessage() {
  const layout = useRouteLoaderData<typeof layoutLoader>("root");
  const { league: slug } = useParams();
  const league = layout?.data.find((candidate) => candidate.slug === slug);
  return (
    <>
      {league && <Link to={`/${league.slug}`}>← Ranking da {league.name}</Link>}
      <ErrorMessage />
    </>
  );
}

export function NotFound() {
  return <Alert message="Página não encontrada." />;
}
