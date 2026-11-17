import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const apiUrl = process.env.API_URL ?? "https://estatisticas-futebol-flame.vercel.app";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: apiUrl, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, "") },
    },
  },
  test: {
    name: "web",
    environment: "jsdom",
    include: ["test/**/*.test.tsx"],
    setupFiles: ["test/setup.ts"],
  },
});
