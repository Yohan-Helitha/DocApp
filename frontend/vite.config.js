import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow ngrok to forward requests to this Vite dev server.
    // Without this, Vite rejects requests from the ngrok domain with a
    // "Blocked request. This host is not allowed." error.
    allowedHosts: ["docapp.ngrok.app"],
    proxy: {
      // Proxy API requests to the API Gateway during development.
      // VITE_PROXY_TARGET is set to http://api-gateway:4000 in docker-compose
      // so that Vite (running inside Docker) can reach the api-gateway container.
      // When running Vite directly on the host (npm run dev), it falls back to
      // localhost:4000 where the api-gateway is exposed via Docker port mapping.
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
      // PayHere redirects the browser back to /payhere/return (or /payhere/cancel)
      // on the ngrok domain after payment. Since ngrok tunnels to Vite (not to the
      // api-gateway), Vite must proxy these paths to the gateway, which then issues
      // a 302 redirect to /#/payments/return (or /#/payments/cancel) on localhost:8081.
      "/payhere": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
