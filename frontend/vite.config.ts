import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// http://localhost:5173 → proxy /api → backend http://localhost:3000
// base '/sgb-maquetacion-ev04/': ruta para el despliegue en GitHub Pages.
// En desarrollo local el proxy /api sigue apuntando al backend real.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'demo' ? '/sgb-maquetacion-ev04/' : '/',
  define: {
    // Inyectado en main.tsx para el basename del BrowserRouter.
    // (define es opción de nivel superior en Vite; dentro de build se ignora)
    __BASE__: JSON.stringify(mode === 'demo' ? '/sgb-maquetacion-ev04/' : '/'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}));
