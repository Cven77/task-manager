const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // 开发时把 /api 请求转发给本地 Express（3000 端口）
      '/api': 'http://localhost:3000',
    },
  },
});
