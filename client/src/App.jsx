import { useEffect, useMemo, useState } from 'react';

const PRIORITIES = ['高', '中', '低'];
const FILTERS = ['全部', ...PRIORITIES];

async function request(url, options) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `请求失败（${res.status}）`);
  return body;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('全部');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('中');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function loadTasks(currentFilter = filter) {
    setLoading(true);
    setError('');
    try {
      const query = currentFilter === '全部' ? '' : `?priority=${encodeURIComponent(currentFilter)}`;
      const { data } = await request(`/api/tasks${query}`);
      setTasks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('请先输入任务标题');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await request('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: trimmed, priority }),
      });
      setTitle('');
      await loadTasks();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(task) {
    setBusyId(task.id);
    setError('');
    try {
      await request(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`确定删除任务「${task.title}」吗？`)) return;
    setBusyId(task.id);
    setError('');
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.completed).length;
    return { total: tasks.length, done, pending: tasks.length - done };
  }, [tasks]);

  return (
    <div className="page">
      <main className="card">
        <header className="head">
          <div>
            <h1>智能任务管理系统</h1>
            <p className="subtitle">数据存在 Supabase 云端，关掉浏览器再打开也不会丢。</p>
          </div>
          <div className="stats">
            <span><b>{stats.total}</b> 条</span>
            <span className="ok"><b>{stats.done}</b> 已完成</span>
            <span className="warn"><b>{stats.pending}</b> 待办</span>
          </div>
        </header>

        <form className="add-form" onSubmit={handleAdd}>
          <input
            className="title-input"
            type="text"
            placeholder="写一个要做的任务，例如：复习数据库范式"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className={`priority-select p-${priority}`}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="优先级"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{`${p}优先级`}</option>
            ))}
          </select>
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? '添加中…' : '添加'}
          </button>
        </form>

        <div className="filters" role="tablist" aria-label="按优先级筛选">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        {loading ? (
          <div className="empty">加载中…</div>
        ) : tasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🗒️</div>
            <p>{filter === '全部' ? '还没有任务，先添加一条吧' : `暂无「${filter}」优先级的任务`}</p>
          </div>
        ) : (
          <ul className="list">
            {tasks.map((task) => (
              <li key={task.id} className={`item ${task.completed ? 'done' : ''}`}>
                <span className={`badge p-${task.priority}`}>{task.priority}</span>
                <div className="content">
                  <p className="task-title">{task.title}</p>
                  <p className="meta">
                    <span className={`status ${task.completed ? 'is-done' : ''}`}>
                      {task.completed ? '已完成' : '未完成'}
                    </span>
                    <span className="dot">·</span>
                    <span>{new Date(task.created_at).toLocaleString('zh-CN', { hour12: false })}</span>
                  </p>
                </div>
                <div className="actions">
                  <button
                    className={`btn ghost ${task.completed ? '' : 'to-done'}`}
                    disabled={busyId === task.id}
                    onClick={() => handleToggle(task)}
                  >
                    {task.completed ? '标记未完成' : '标记完成'}
                  </button>
                  <button
                    className="btn danger"
                    disabled={busyId === task.id}
                    onClick={() => handleDelete(task)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="foot">Node.js + Express + Supabase + React · 部署于 Vercel</footer>
    </div>
  );
}
