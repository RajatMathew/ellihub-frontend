import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            const match = id.match(/node_modules[\\/](@?[^\\/]+)/);
            const pkg = match ? match[1].replace("@", "") : "";
            if (pkg === "react" || pkg === "react-dom" || pkg === "scheduler") return "react";
            if (pkg.startsWith("react-router")) return "router";
            if (pkg.startsWith("tanstack")) return "tanstack";
            if (pkg === "recharts" || pkg.startsWith("d3-")) return "charts";
            if (pkg === "motion") return "motion";
            if (pkg === "radix-ui" || pkg === "lucide-react") return "ui-vendor";
            return "vendor";
          }
        },
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
    chunkSizeWarningLimit: 600,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Elle Hub",
        short_name: "Elle",
        description: "construction company erp",
        theme_color: "#ffffff",
      },
    }),
  ],
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app"),
      "@core": path.resolve(__dirname, "src/core"),
      "@modules": path.resolve(__dirname, "src/modules"),
    },
  },
});
