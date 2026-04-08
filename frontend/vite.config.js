import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, //frontend server port
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:6000', //Declare port of backend server
        changeOrigin: true
      }
    }
  }
});
