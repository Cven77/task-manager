require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const { app } = require('./app');

const PORT = process.env.PORT || 3000;

// 生产模式（本地 npm run build 之后）由后端直接提供打包好的前端静态文件
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.type('html').send(
      '<p style="font-family:system-ui;padding:24px">前端尚未打包。开发时请访问 Vite 端口（默认 http://localhost:5173），或先运行 <code>npm run build</code>。</p>'
    );
  });
}

app.listen(PORT, () => {
  console.log(`后端已启动：http://localhost:${PORT}`);
});
