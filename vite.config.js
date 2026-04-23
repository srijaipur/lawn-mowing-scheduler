import { defineConfig } from 'vite'

export default defineConfig({
  base: '/lawn-mowing-scheduler/',
  server: {
    proxy: {
      '/api/weather': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/weather/, '/v1/forecast'),
      },
    },
  },
})