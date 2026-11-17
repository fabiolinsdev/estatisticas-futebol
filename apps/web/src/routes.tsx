import { redirect, type RouteObject } from "react-router";
import { ErrorMessage } from "./ErrorMessage.tsx";
import { Layout, layoutLoader } from "./Layout.tsx";
import { RankingPage, rankingLoader } from "./RankingPage.tsx";
import { TeamPage, teamLoader } from "./TeamPage.tsx";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    loader: layoutLoader,
    hydrateFallbackElement: <p className="status">Carregando…</p>,
    errorElement: <ErrorMessage />,
    children: [
      { index: true, loader: () => redirect("/premier-league") },
      { path: ":league", element: <RankingPage />, loader: rankingLoader, errorElement: <ErrorMessage /> },
      { path: ":league/times/:team", element: <TeamPage />, loader: teamLoader, errorElement: <ErrorMessage /> },
    ],
  },
];
