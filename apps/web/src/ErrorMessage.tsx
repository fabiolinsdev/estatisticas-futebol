import { useRouteError } from "react-router";
import { ApiError } from "./api.ts";

export function ErrorMessage() {
  const error = useRouteError();
  const message =
    error instanceof ApiError ? error.message : "Não foi possível falar com a API. Tente de novo em instantes.";
  return (
    <p role="alert" className="error">
      {message}
    </p>
  );
}
