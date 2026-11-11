import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./e2e/support/test-database-url.ts";

export default defineConfig({
  test: {
    include: ["e2e/**/*.test.ts"],
    globalSetup: ["e2e/support/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: testDatabaseUrl },
  },
});
