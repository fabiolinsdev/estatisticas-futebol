import { createDb } from "@estatisticas/db";
import { buildApp } from "./api.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida: configure a URL somente leitura do banco");

const app = buildApp({ db: createDb(url) });
// Sem await: na Vercel o listen() é interceptado e a promessa nunca termina,
// e um await no topo impediria o módulo de terminar de carregar.
void app.listen({ port: Number(process.env.PORT ?? 3000) });
