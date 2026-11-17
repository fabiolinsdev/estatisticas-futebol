import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiUrl, brightonSummary, envelope, noMatches, server } from "./support/fake-api.ts";
import { renderApp } from "./support/render-app.tsx";

function rowsOf(name: string) {
  const table = screen.getByRole("table", { name });
  return within(table)
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("cell").length > 0)
    .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("página do Time", () => {
  it("clicar no nome do Time no ranking abre a página dele", async () => {
    const { user, location } = renderApp("/premier-league");

    await user.click(await screen.findByRole("link", { name: "Brighton" }));

    expect(await screen.findByRole("heading", { name: "Brighton" })).toBeInTheDocument();
    expect(location()).toBe("/premier-league/times/brighton");
    expect(screen.getByText("Premier League · Temporada 2026/27")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Premier League" })).toHaveAttribute("aria-current", "page");
  });

  it("mostra o resumo com total e média de cada métrica, em todas as Partidas, como Mandante e como Visitante", async () => {
    renderApp("/premier-league/times/brighton");

    await screen.findByRole("heading", { name: "Brighton" });
    const summary = screen.getByRole("table", { name: "Resumo" });
    expect(within(summary).getByRole("columnheader", { name: "Todas (10 Partidas)" })).toBeInTheDocument();
    expect(within(summary).getByRole("columnheader", { name: "Mandante (5 Partidas)" })).toBeInTheDocument();
    expect(within(summary).getByRole("columnheader", { name: "Visitante (5 Partidas)" })).toBeInTheDocument();
    expect(rowsOf("Resumo")).toEqual([
      ["Gols marcados", "26", "2,60", "15", "3,00", "11", "2,20"],
      ["Gols sofridos", "7", "0,70", "1", "0,20", "6", "1,20"],
      ["Chutes ao gol", "52", "5,20", "31", "6,20", "21", "4,20"],
      ["Cartões amarelos", "24", "2,40", "15", "3,00", "9", "1,80"],
      ["Cartões vermelhos", "1", "0,10", "0", "0,00", "1", "0,20"],
    ]);
  });

  it("um recorte sem Partidas aparece como sem Partidas, não como média 0", async () => {
    server.use(
      http.get(apiUrl("/leagues/premier-league/teams/brighton"), () =>
        HttpResponse.json(envelope({ ...brightonSummary, away: noMatches })),
      ),
    );
    renderApp("/premier-league/times/brighton");

    await screen.findByRole("heading", { name: "Brighton" });
    expect(screen.getByRole("columnheader", { name: "Visitante (0 Partidas)" })).toBeInTheDocument();
    expect(rowsOf("Resumo")[0]).toEqual(["Gols marcados", "26", "2,60", "15", "3,00", "0", "sem Partidas"]);
  });

  it("lista as Partidas na visão do Time, com o Adversário, o placar, os Chutes ao gol e os cartões", async () => {
    renderApp("/premier-league/times/brighton");

    await screen.findByRole("heading", { name: "Brighton" });
    expect(rowsOf("Partidas")).toEqual([
      ["23/08/2026", "Mandante", "Aston Villa", "4 × 0", "6 × 0", "2 × 3", "0 × 1"],
      ["30/08/2026", "Visitante", "Chelsea", "3 × 4", "6 × 6", "3 × 1", "0 × 0"],
    ]);
  });

  it("sem a rota de Partidas na API, a lista não aparece e o resumo continua", async () => {
    server.use(
      http.get(apiUrl("/leagues/premier-league/teams/brighton/matches"), () =>
        HttpResponse.json(
          { statusCode: 404, error: "Not Found", message: "Route GET:/leagues/premier-league/teams/brighton/matches not found" },
          { status: 404 },
        ),
      ),
    );
    renderApp("/premier-league/times/brighton");

    await screen.findByRole("heading", { name: "Brighton" });
    expect(screen.getByRole("table", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Partidas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("um Time inexistente mostra a mensagem da API e o caminho de volta para o ranking", async () => {
    const { user, location } = renderApp("/premier-league/times/wrexham");

    expect(await screen.findByText('Time inexistente na Premier League: "wrexham".')).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Premier League" }));
    expect(await screen.findByRole("cell", { name: "Brighton" })).toBeInTheDocument();
    expect(location()).toBe("/premier-league");
  });

  it("o link de volta leva ao ranking da Liga", async () => {
    const { user, location } = renderApp("/premier-league/times/brighton");

    await user.click(await screen.findByRole("link", { name: "← Ranking da Premier League" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(location()).toBe("/premier-league");
  });
});
