import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const plugins = [react(), runtimeErrorOverlay()];

  // ✅ Add Replit plugins only in non-production environment
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    plugins.push(cartographer(), devBanner());
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        // ✅ Prevent Rollup from bundling pdfjs-dist worker
        external: ["pdfjs-dist/legacy/build/pdf.worker.entry"],
        output: {
          // ✅ Keep worker file name consistent for import
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith("pdf.worker.entry.js")) {
              return "assets/[name][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
