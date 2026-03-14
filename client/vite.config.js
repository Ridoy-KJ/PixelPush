import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy REST API calls to the Express backend
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.io handshake (polling transport)
      "/socket.io": {
        target: "http://localhost:4000",
        changeOrigin: true,
        ws: true, // <-- critical: upgrade WebSocket connections
        secure: false,
      },
    },
  },
});
