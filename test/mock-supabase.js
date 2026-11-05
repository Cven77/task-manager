/**
 * 本地 Mock Supabase REST 服务（仅用于离线自测，不参与线上部署）。
 * 模拟 PostgREST 的 /rest/v1/tasks 行为，让 supabase-js 能在没有真实项目时跑通 CRUD。
 */
const http = require('http');

function createMockSupabase({ port = 54321 } = {}) {
  let rows = [];
  let nextId = 1;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/rest/v1/tasks')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'not found' }));
    }

    const single = (req.headers.accept || '').includes('application/vnd.pgrst.object+json');
    const send = (status, payload) => {
      const body = single && Array.isArray(payload) ? payload[0] ?? null : payload;
      if (single && Array.isArray(payload) && payload.length !== 1) {
        res.writeHead(406, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'JSON object requested, multiple (or no) rows returned' }));
      }
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(body === null ? '' : JSON.stringify(body));
    };

    const filters = () => {
      const out = {};
      for (const [k, v] of url.searchParams) {
        if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
        if (v.startsWith('eq.')) out[k] = v.slice(3);
      }
      return out;
    };

    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const data = body ? JSON.parse(body) : {};
      const f = filters();

      if (req.method === 'GET') {
        let result = rows.filter((r) =>
          Object.entries(f).every(([k, v]) => String(r[k]) === String(v))
        );
        if ((url.searchParams.get('order') || '').includes('created_at.desc')) {
          result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        const limit = Number(url.searchParams.get('limit') || 0);
        if (limit > 0) result = result.slice(0, limit);
        return send(200, result);
      }

      if (req.method === 'POST') {
        const row = {
          id: nextId++,
          title: data.title,
          priority: data.priority ?? '中',
          completed: false,
          created_at: new Date(Date.now() + nextId).toISOString(),
        };
        rows.push(row);
        return send(201, [row]);
      }

      if (req.method === 'PATCH') {
        const target = rows.filter((r) =>
          Object.entries(f).every(([k, v]) => String(r[k]) === String(v))
        );
        target.forEach((r) => Object.assign(r, data));
        return send(200, target);
      }

      if (req.method === 'DELETE') {
        rows = rows.filter(
          (r) => !Object.entries(f).every(([k, v]) => String(r[k]) === String(v))
        );
        res.writeHead(204);
        return res.end();
      }

      res.writeHead(405).end();
    });
  });

  return {
    start: () => new Promise((resolve) => server.listen(port, () => resolve(server))),
    stop: () => new Promise((resolve) => server.close(resolve)),
    reset: () => { rows = []; nextId = 1; },
    get rows() { return rows; },
  };
}

module.exports = { createMockSupabase };
