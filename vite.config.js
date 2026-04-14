import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        report: resolve(__dirname, "report.html"),
        signin: resolve(__dirname, "signin.html"),
        myaccount: resolve(__dirname, "myaccount.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
