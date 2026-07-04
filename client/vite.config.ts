import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// please got through it if anything more needed https://vite.dev/config/
export default defineConfig(({ mode }) => {
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
      allowedHosts: [devHost],
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true
        },
      },
    },
  }
})
