import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { footballDataSource } from "@estatisticas/collector";

const csv = "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,HST,AST,HY,AY,HR,AR\n";
const userAgent = "estatisticas-futebol/1.0 (+https://github.com/fabiolinsdev/estatisticas-futebol)";

type Handler = (response: ServerResponse) => void;

const requests: IncomingMessage[] = [];
let respond: (path: string, attempt: number) => Handler;
let server: Server;
let origin: string;

const ok: Handler = (response) => response.writeHead(200, { "content-type": "text/csv" }).end(csv);
const status = (code: number): Handler => (response) => response.writeHead(code).end("<html></html>");

beforeAll(async () => {
  server = createServer((request, response) => {
    requests.push(request);
    const path = request.url ?? "";
    if (path.startsWith("/www/")) {
      response.writeHead(301, { location: path.slice("/www".length) }).end();
      return;
    }
    const attempt = requests.filter((earlier) => earlier.url === path).length;
    respond(path, attempt)(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.closeAllConnections();
  return new Promise<void>((resolve) => server.close(() => resolve()));
});

const waits: number[] = [];
beforeEach(() => {
  requests.length = 0;
  waits.length = 0;
  respond = () => ok;
});

function source(timeoutMs = 1000) {
  return footballDataSource({
    baseUrl: `${origin}/www`,
    timeoutMs,
    sleep: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  });
}

const premierLeague2627 = { divisionCode: "E0", season: "2026/27" };

describe("Fonte real (football-data.co.uk)", () => {
  it("baixa o arquivo da Liga e Temporada pelo código de quatro dígitos, seguindo o redirecionamento e enviando o User-Agent", async () => {
    const content = await source().fetchCsv(premierLeague2627);

    expect(content).toBe(csv);
    expect(requests.map((request) => request.url)).toEqual(["/www/mmz4281/2627/E0.csv", "/mmz4281/2627/E0.csv"]);
    expect(requests.map((request) => request.headers["user-agent"])).toEqual([userAgent, userAgent]);
  });

  it("um arquivo inexistente (404) é sinalizado como ainda não publicado", async () => {
    respond = () => status(404);

    expect(await source().fetchCsv({ divisionCode: "E0", season: "2027/28" })).toBeNull();
    expect(waits).toEqual([]);
  });

  it("uma falha transitória ganha nova tentativa, com espera de 5 e depois 15 segundos", async () => {
    respond = (_path, attempt) => (attempt < 3 ? status(503) : ok);

    expect(await source().fetchCsv(premierLeague2627)).toBe(csv);
    expect(waits).toEqual([5000, 15000]);
  });

  it("depois de 3 tentativas, a falha transitória vira erro com o status", async () => {
    respond = () => status(500);

    await expect(source().fetchCsv(premierLeague2627)).rejects.toThrow(
      `Falha ao baixar ${origin}/www/mmz4281/2627/E0.csv depois de 3 tentativas: HTTP 500`,
    );
    expect(waits).toEqual([5000, 15000]);
  });

  it("429 também é transitório", async () => {
    respond = (_path, attempt) => (attempt < 2 ? status(429) : ok);

    expect(await source().fetchCsv(premierLeague2627)).toBe(csv);
    expect(waits).toEqual([5000]);
  });

  it("outros 4xx falham na hora, sem nova tentativa", async () => {
    respond = () => status(403);

    await expect(source().fetchCsv(premierLeague2627)).rejects.toThrow(
      `Falha ao baixar ${origin}/www/mmz4281/2627/E0.csv: HTTP 403`,
    );
    expect(waits).toEqual([]);
  });

  it("o tempo esgotado é transitório", async () => {
    respond = (_path, attempt) => (attempt < 2 ? () => undefined : ok);

    expect(await source(100).fetchCsv(premierLeague2627)).toBe(csv);
    expect(waits).toEqual([5000]);
  });
});
