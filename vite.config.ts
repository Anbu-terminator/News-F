import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const plugins = [
    react(),
    runtimeErrorOverlay(),
  ];

  // ✅ Only include Replit-specific plugins in dev mode
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const cartographer = await import("@replit/vite-plugin-cartographer").then((m) =>
      m.cartographer()
    );
    const devBanner = await import("@replit/vite-plugin-dev-banner").then((m) =>
      m.devBanner()
    );
    plugins.push(cartographer, devBanner);
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        // ✅ Prevent bundling of PDF.js worker and library
        external: [
          "pdfjs-dist",
          "pdfjs-dist/build/pdf.worker.entry",
          "pdfjs-dist/build/pdf.worker.mjs",
        ],
      },
    },
    optimizeDeps: {
      // ✅ Make sure pdfjs works correctly in dev mode
      include: ["pdfjs-dist/build/pdf.worker.entry"],
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
