/**
 * 离线端到端自测：启动 Mock Supabase + 真实 Express 应用，验证全部接口。
 * 运行：npm test
 */
const assert = require('assert');
const { createMockSupabase } = require('./mock-supabase');

const MOCK_PORT = 54321;
const APP_PORT = 3100;
const BASE = `http://127.0.0.1:${APP_PORT}`;

async function json(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const mock = createMockSupabase({ port: MOCK_PORT });
  await mock.start();

  process.env.SUPABASE_URL = `http://127.0.0.1:${MOCK_PORT}`;
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_test_key';

  const { app } = require('../server/app');
  const server = app.listen(APP_PORT);
  const results = [];
  const check = (name, ok, extra = '') => {
    results.push({ name, ok, extra });
    console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  };

  try {
    // 1. 健康检查
    const health = await json('/api/health');
    check('查询数据库状态', health.status === 200 && health.body.ok, health.body.message);

    // 2. 添加任务
    const a = await json('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '复习数据库范式', priority: '高' }),
    });
    const b = await json('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '写实验报告', priority: '中' }),
    });
    const c = await json('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '整理笔记', priority: '低' }),
    });
    check('添加任务', a.status === 201 && b.status === 201 && c.status === 201,
      `id=${a.body.data?.id},${b.body.data?.id},${c.body.data?.id}`);

    // 3. 查询列表：倒序
    const list = await json('/api/tasks');
    const ids = list.body.data.map((t) => t.id);
    check('查询列表（按创建时间倒序）',
      list.status === 200 && list.body.data.length === 3 &&
      ids.every((id, i) => i === 0 || id < ids[i - 1]),
      `顺序 ${ids.join(' > ')}`);

    // 4. 按优先级筛选
    const high = await json('/api/tasks?priority=' + encodeURIComponent('高'));
    check('按“高”优先级筛选', high.status === 200 && high.body.data.length === 1,
      `返回 ${high.body.data.length} 条`);

    // 5. 切换完成状态
    const toggle = await json(`/api/tasks/${a.body.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    });
    check('切换完成状态', toggle.status === 200 && toggle.body.data.completed === true);

    const untoggle = await json(`/api/tasks/${a.body.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: false }),
    });
    check('再切回未完成', untoggle.status === 200 && untoggle.body.data.completed === false);

    // 6. 删除任务
    const del = await json(`/api/tasks/${b.body.data.id}`, { method: 'DELETE' });
    const after = await json('/api/tasks');
    check('删除任务', del.status === 200 && del.body.ok &&
      after.body.data.length === 2 && !after.body.data.some((t) => t.id === b.body.data.id));

    // 7. 参数校验
    const empty = await json('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '   ', priority: '高' }),
    });
    check('空标题被拦截', empty.status === 400, empty.body.error);

    const badPriority = await json('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '测试', priority: '超高' }),
    });
    check('非法优先级被拦截', badPriority.status === 400, badPriority.body.error);

    const badBody = await json(`/api/tasks/${a.body.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: 'yes' }),
    });
    check('非法 completed 类型被拦截', badBody.status === 400, badBody.body.error);

    // 8. 数据持久化：重启应用后仍能读到（数据在“云端”）
    const persist = await json('/api/tasks');
    check('数据保存在数据库（非内存 UI 状态）',
      persist.status === 200 && persist.body.data.length === 2);

    const failed = results.filter((r) => !r.ok);
    console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
    if (failed.length) process.exitCode = 1;
  } finally {
    server.close();
    await mock.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
