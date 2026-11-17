import type { FastifyInstance } from "fastify";
import { createDb } from "@estatisticas/db";
import { buildApp } from "./api.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida: configure a URL somente leitura do banco");

const app: FastifyInstance = buildApp({ db: createDb(url) });
await app.listen({ port: Number(process.env.PORT ?? 3000) });
