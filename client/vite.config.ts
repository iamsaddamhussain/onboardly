import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load every var in .env / .env.local (no VITE_ prefix filter) so we can use
  // them here in the config. Defaults keep things working with no .env file.
  const env = loadEnv(mode, process.cwd(), "")
  const devHost = env.DEV_HOST || "localhost"
  const devPort = Number(env.DEV_PORT) || 5173
  const apiTarget = env.DEV_API_TARGET || "https://localhost:5001"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: devHost,
      port: devPort,
      open: `http://${devHost}:${devPort}/`,
      // Allow the Laragon-style "magic host". *.localhost auto-resolves to
      // 127.0.0.1 in modern browsers, so http://<DEV_HOST>:<DEV_PORT> works.
      allowedHosts: [devHost],
      proxy: {
        // Forward all /api requests to the ASP.NET Core backend.
        // changeOrigin + secure:false lets the dev https cert work locally.
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
