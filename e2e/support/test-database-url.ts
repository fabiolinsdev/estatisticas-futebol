export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://estatisticas:estatisticas@localhost:5433/estatisticas_test";
