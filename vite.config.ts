import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // leetcode.com/graphql sends no CORS headers, so the browser cannot POST to it
  // directly. Native builds use CapacitorHttp instead — see src/lib/leetcode.ts.
  server: {
    proxy: {
      "/leetcode-api": {
        target: "https://leetcode.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/leetcode-api/, ""),
        headers: { Referer: "https://leetcode.com/" },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "TrackBack",
        short_name: "TrackBack",
        description: "Track your courses, notes, and progress — offline-first.",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          // Must be its own edge-to-edge asset, not the squircle again: the
          // installer crops maskable icons to the platform shape, which would
          // otherwise show our transparent rounded corners inside that shape.
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallbackDenylist: [/^\/youtubei/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
