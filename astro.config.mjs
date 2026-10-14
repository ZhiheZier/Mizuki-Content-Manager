import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  adapter: node({
    mode: "standalone"
  }),
  output: "server",
  devToolbar: { enabled: false },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
