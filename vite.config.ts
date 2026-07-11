// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import pkg from "./package.json";

export default defineConfig({
  plugins: [react(), copyPdfJsAssets()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          maps: ["leaflet", "react-leaflet"],
          pdf: ["pdfjs-dist"],
          storage: ["dexie"]
        }
      }
    }
  }
});

function copyPdfJsAssets() {
  return {
    name: "copy-pdfjs-assets",
    closeBundle() {
      const outputRoot = resolve(__dirname, "dist/assets/pdfjs");
      const pdfjsRoot = resolve(__dirname, "node_modules/pdfjs-dist");
      rmSync(outputRoot, { recursive: true, force: true });
      mkdirSync(outputRoot, { recursive: true });
      cpSync(resolve(pdfjsRoot, "build/pdf.worker.min.mjs"), resolve(outputRoot, "pdf.worker.min.js"));
      for (const folder of ["cmaps", "standard_fonts", "wasm"]) {
        const source = resolve(pdfjsRoot, folder);
        if (existsSync(source)) {
          cpSync(source, resolve(outputRoot, folder), { recursive: true });
        }
      }
    }
  };
}
