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
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        // O navegador acessa a mesma origem do Vite. Na chamada interna, a origem
        // deve acompanhar o Host reescrito, evitando CORS indevido ao usar o IP.
        configure(proxy) {
          proxy.on('proxyReq', (requisicao) => {
            if (requisicao.getHeader('origin')) {
              requisicao.setHeader('origin', 'http://127.0.0.1:8080');
            }
          });
        },
        timeout: 150000,
        proxyTimeout: 150000,
      },
    },
  },
}))
