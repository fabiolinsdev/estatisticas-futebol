import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./support/render-app.tsx";

const filters = () => screen.getByRole("navigation", { name: "Filtros" });

function searchOf(location: string) {
  return Object.fromEntries(new URL(location, "http://site").searchParams);
}

describe("filtros de Mando e ordem do ranking", () => {
  it("filtra por Mandante e inverte a ordem, guardando os filtros no endereço", async () => {
    const { user, location } = renderApp("/premier-league");
    await screen.findByRole("cell", { name: "Brighton" });

    await user.click(within(filters()).getByRole("link", { name: "Mandante" }));
    await user.click(within(filters()).getByRole("link", { name: "Menor média primeiro" }));

    expect(await screen.findByRole("cell", { name: "Sunderland" })).toBeInTheDocument();
    expect(new URL(location(), "http://site").pathname).toBe("/premier-league");
    expect(searchOf(location())).toEqual({ mando: "home", ordem: "asc" });
  });

  it("um endereço com os filtros abre o mesmo ranking, com os filtros marcados", async () => {
    renderApp("/premier-league?mando=home&ordem=asc");

    expect(await screen.findByRole("cell", { name: "Sunderland" })).toBeInTheDocument();
    expect(within(filters()).getByRole("link", { name: "Mandante" })).toHaveAttribute("aria-current", "page");
    expect(within(filters()).getByRole("link", { name: "Menor média primeiro" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("valores desconhecidos de Mando e ordem caem no padrão", async () => {
    renderApp("/premier-league?mando=casa&ordem=aleatoria");

    expect(await screen.findByRole("cell", { name: "Brighton" })).toBeInTheDocument();
    expect(within(filters()).getByRole("link", { name: "Todas" })).toHaveAttribute("aria-current", "page");
    expect(within(filters()).getByRole("link", { name: "Maior média primeiro" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("trocar a métrica ou a Liga mantém os filtros", async () => {
    const { user, location } = renderApp("/premier-league?mando=home&ordem=asc");
    await screen.findByRole("cell", { name: "Sunderland" });

    await user.click(screen.getByRole("link", { name: "Cartões amarelos" }));
    expect(await screen.findByRole("cell", { name: "Manchester City" })).toBeInTheDocument();
    expect(searchOf(location())).toEqual({ mando: "home", ordem: "asc", metrica: "yellowCards" });

    await user.click(screen.getByRole("link", { name: "Serie A" }));
    expect(await screen.findByRole("cell", { name: "Atalanta" })).toBeInTheDocument();
    expect(new URL(location(), "http://site").pathname).toBe("/serie-a");
    expect(searchOf(location())).toEqual({ mando: "home", ordem: "asc", metrica: "yellowCards" });
  });

  it("voltar para Todas tira o Mando do endereço", async () => {
    const { user, location } = renderApp("/premier-league?mando=home&ordem=asc");
    await screen.findByRole("cell", { name: "Sunderland" });

    await user.click(within(filters()).getByRole("link", { name: "Todas" }));
    await user.click(within(filters()).getByRole("link", { name: "Maior média primeiro" }));

    expect(await screen.findByRole("cell", { name: "Brighton" })).toBeInTheDocument();
    expect(location()).toBe("/premier-league");
  });
});
