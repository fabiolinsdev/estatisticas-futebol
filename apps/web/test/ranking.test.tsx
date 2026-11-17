import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { apiUrl, envelope, server } from "./support/fake-api.ts";
import { renderApp } from "./support/render-app.tsx";

function rankingRows() {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("ranking de uma Liga", () => {
  it("a raiz abre o ranking de Gols marcados da Premier League", async () => {
    renderApp("/");

    expect(await screen.findByRole("cell", { name: "Brighton" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Premier League" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Gols marcados" })).toHaveAttribute("aria-current", "page");
    expect(rankingRows()).toEqual([
      ["1", "Brighton", "10", "26", "2,60", ""],
      ["2", "Manchester City", "10", "21", "2,10", ""],
      ["3", "Chelsea", "10", "19", "1,90", ""],
    ]);
  });

  it("troca a Liga e a métrica pelas abas, guardando as duas no endereço", async () => {
    const { user, location } = renderApp("/premier-league");
    await screen.findByRole("cell", { name: "Brighton" });

    await user.click(screen.getByRole("link", { name: "Cartões amarelos" }));
    await user.click(screen.getByRole("link", { name: "Serie A" }));

    expect(await screen.findByRole("cell", { name: "Fiorentina" })).toBeInTheDocument();
    expect(location()).toBe("/serie-a?metrica=yellowCards");
    expect(screen.getByRole("link", { name: "Serie A" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Cartões amarelos" })).toHaveAttribute("aria-current", "page");
    expect(rankingRows()[0]).toEqual(["1", "Fiorentina", "11", "24", "2,18", ""]);
  });

  it("uma métrica desconhecida no endereço cai em Gols marcados", async () => {
    renderApp("/premier-league?metrica=escanteios");

    expect(await screen.findByRole("cell", { name: "Brighton" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gols marcados" })).toHaveAttribute("aria-current", "page");
  });

  it("mostra o líder da métrica e a média da Liga", async () => {
    renderApp("/premier-league");

    const panel = await screen.findByRole("complementary");
    expect(within(panel).getByText("Líder em gols marcados")).toBeInTheDocument();
    expect(within(panel).getByText("Brighton")).toBeInTheDocument();
    expect(within(panel).getByText("26 em 10 Partidas (2,60 por Partida)")).toBeInTheDocument();
    expect(within(panel).getByText("2,20")).toBeInTheDocument();
  });

  it("a média da Liga é a soma dos totais dividida pela soma das Partidas", async () => {
    server.use(
      http.get(apiUrl("/leagues/:league/rankings"), () =>
        HttpResponse.json(
          envelope([
            { team: { slug: "brighton", name: "Brighton" }, matches: 1, total: 3, average: 3 },
            { team: { slug: "chelsea", name: "Chelsea" }, matches: 10, total: 20, average: 2 },
          ]),
        ),
      ),
    );
    renderApp("/premier-league");

    const panel = await screen.findByRole("complementary");
    expect(within(panel).getByText("3 em 1 Partida (3,00 por Partida)")).toBeInTheDocument();
    expect(within(panel).getByText("2,09")).toBeInTheDocument();
  });

  it("um ranking sem nenhum Time avisa que não há Partidas no recorte", async () => {
    server.use(http.get(apiUrl("/leagues/:league/rankings"), () => HttpResponse.json(envelope([]))));
    renderApp("/premier-league?mando=away");

    expect(await screen.findByText("Nenhum Time tem Partidas neste recorte ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("um endereço que não existe mostra página não encontrada, com as abas das Ligas", async () => {
    renderApp("/premier-league/qualquer-coisa");

    expect(await screen.findByText("Página não encontrada.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Premier League" })).toBeInTheDocument();
    expect(screen.queryByText(/falar com a API/)).not.toBeInTheDocument();
  });

  it("mostra a fonte e quando foi a última coleta", async () => {
    renderApp("/premier-league");

    expect(await screen.findByRole("link", { name: "football-data.co.uk" })).toHaveAttribute(
      "href",
      "https://www.football-data.co.uk",
    );
    expect(screen.getByText(/Atualizado em 16\/11\/2026 às 18:51/)).toBeInTheDocument();
  });

  it("mostra um aviso enquanto os dados chegam", async () => {
    renderApp("/premier-league");

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "Brighton" })).toBeInTheDocument();
    expect(screen.queryByText("Carregando…")).not.toBeInTheDocument();
  });

  it("mostra um aviso ao trocar de aba, até o novo ranking chegar", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get(apiUrl("/leagues/:league/rankings"), async ({ request }) => {
        if (new URL(request.url).searchParams.get("metric") === "yellowCards") await gate;
      }),
    );
    const { user } = renderApp("/premier-league");
    await screen.findByRole("cell", { name: "Brighton" });

    await user.click(screen.getByRole("link", { name: "Cartões amarelos" }));
    expect(await screen.findByText("Carregando…")).toBeInTheDocument();

    release();
    expect(await screen.findByRole("cell", { name: "Newcastle" })).toBeInTheDocument();
    expect(screen.queryByText("Carregando…")).not.toBeInTheDocument();
  });

  it("uma Liga inexistente mostra a mensagem da API, com as abas das Ligas", async () => {
    renderApp("/mls");

    expect(
      await screen.findByText(
        'Liga inexistente: "mls". Use premier-league, la-liga, serie-a, bundesliga ou ligue-1.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Premier League" })).toBeInTheDocument();
  });

  it("uma falha da API mostra uma mensagem de erro", async () => {
    server.use(http.get(apiUrl("/leagues/:league/rankings"), () => new HttpResponse("Bad Gateway", { status: 502 })));
    renderApp("/premier-league");

    expect(
      await screen.findByText("Não foi possível carregar os dados (a API respondeu 502). Tente de novo em instantes."),
    ).toBeInTheDocument();
  });
});
