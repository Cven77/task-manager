const app = require('../server/app').app;

// Vercel Serverless Function 入口：所有 /api/* 请求都会走到这里
module.exports = app;
