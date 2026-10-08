import { resolve } from "node:path";

// two pages: the one-page site and the all-projects page
export default {
  build: { rollupOptions: { input: { main: resolve(__dirname, "index.html"), work: resolve(__dirname, "work.html") } } },
};
