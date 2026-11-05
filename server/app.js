const express = require('express');
const cors = require('cors');
const { getSupabase } = require('./supabase');

const PRIORITIES = ['高', '中', '低'];
const MAX_TITLE_LENGTH = 200;

const app = express();
app.use(cors());
app.use(express.json());

/** 统一的异步错误处理包装 */
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** 健康检查：前端启动时可用它确认后端和数据库配置是否正常 */
app.get('/api/health', handle(async (req, res) => {
  const supabase = getSupabase();
  const { error } = await supabase.from('tasks').select('id').limit(1);
  if (error) {
    return res.status(503).json({
      ok: false,
      message: '数据库连接失败：' + error.message,
    });
  }
  res.json({ ok: true, message: '数据库连接正常' });
}));

/**
 * 查询任务列表
 * GET /api/tasks?priority=高   （不传或传“全部”表示不筛选）
 * 结果按 created_at 倒序，最新在最上面
 */
app.get('/api/tasks', handle(async (req, res) => {
  const supabase = getSupabase();
  const priority = req.query.priority;

  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (priority && priority !== '全部') {
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: '优先级只能是 高 / 中 / 低' });
    }
    query = query.eq('priority', priority);
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.json({ data: data || [] });
}));

/** 新增任务 POST /api/tasks  { title, priority } */
app.post('/api/tasks', handle(async (req, res) => {
  const supabase = getSupabase();
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const priority = req.body?.priority ?? '中';

  if (!title) return res.status(400).json({ error: '任务标题不能为空' });
  if (title.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `任务标题不能超过 ${MAX_TITLE_LENGTH} 个字符` });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: '优先级只能是 高 / 中 / 低' });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, priority })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.status(201).json({ data });
}));

/** 切换完成状态 PATCH /api/tasks/:id  { completed } */
app.patch('/api/tasks/:id', handle(async (req, res) => {
  const supabase = getSupabase();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '任务 id 不合法' });
  }
  if (typeof req.body?.completed !== 'boolean') {
    return res.status(400).json({ error: 'completed 必须是布尔值' });
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ completed: req.body.completed })
    .eq('id', id)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!data) return res.status(404).json({ error: '任务不存在' });
  res.json({ data });
}));

/** 删除任务 DELETE /api/tasks/:id */
app.delete('/api/tasks/:id', handle(async (req, res) => {
  const supabase = getSupabase();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '任务 id 不合法' });
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.json({ ok: true });
}));

/** 未匹配到任何 /api 路由 */
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在：' + req.method + ' ' + req.originalUrl });
});

/** 统一错误响应：不向前端泄露堆栈，只给可读信息 */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || '服务器内部错误';
  if (status >= 500) console.error('[server error]', message);
  res.status(status).json({ error: message });
});

module.exports = { app, PRIORITIES };
