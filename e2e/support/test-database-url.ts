import { existsSync } from "node:fs";

const envFile = new URL("../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://estatisticas:estatisticas@localhost:5433/estatisticas_test";
