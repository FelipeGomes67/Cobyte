import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: mode === 'https' ? '0.0.0.0' : '127.0.0.1',
    port: mode === 'https' ? 5174 : 5173,
    https: mode === 'https' ? {
      key: readFileSync(fileURLToPath(new URL('./.certs/server-key.pem', import.meta.url))),
      cert: readFileSync(fileURLToPath(new URL('./.certs/server-cert.pem', import.meta.url))),
    } : undefined,
    strictPort: true,
  },
}))
