# 智能任务管理系统（Task Manager）

练习二完整实现：**Node.js（Express）+ React（Vite）+ Supabase（PostgreSQL）+ GitHub + Vercel**。

## 1. 功能

- 输入框 + 优先级下拉（高 / 中 / 低）添加任务
- 任务列表按 `created_at` 倒序显示（最新在最上面）
- 每条任务显示标题、优先级标签、完成状态、创建时间
- 每条任务可「标记完成 / 标记未完成」「删除」
- 已完成任务文字加删除线并变淡
- 顶部按优先级筛选：全部 / 高 / 中 / 低
- 数据保存在 Supabase 云端，关掉浏览器再打开依然存在

## 2. 目录结构

```
task-manager/
├── api/
│   └── [...path].js        # Vercel Serverless 入口，转发所有 /api/* 到 Express
├── server/
│   ├── app.js              # Express 应用：任务 CRUD 接口、参数校验、错误处理
│   ├── supabase.js         # Supabase 客户端（只用 anon / publishable key）
│   └── index.js            # 本地启动入口，生产模式同时托管前端打包产物
├── client/                 # React 前端（Vite）
│   ├── index.html
│   └── src/{main.jsx, App.jsx, styles.css}
├── supabase/
│   ├── schema.sql          # 建表 + 索引
│   └── rls.sql             # 行级安全策略（教学演示：匿名可读写）
├── test/
│   ├── mock-supabase.js    # 离线自测用的 Mock PostgREST
│   └── e2e.test.js         # 11 项接口端到端测试
├── .env.example
├── vercel.json
└── package.json
```

## 3. 接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 检查数据库连接是否正常 |
| GET | `/api/tasks?priority=高` | 查询任务（不传或 `全部` 不筛选，按时间倒序） |
| POST | `/api/tasks` | 新增任务，body：`{"title": "...", "priority": "高"}` |
| PATCH | `/api/tasks/:id` | 切换完成状态，body：`{"completed": true}` |
| DELETE | `/api/tasks/:id` | 删除任务 |

统一返回：成功 `{ "data": ... }`，失败 `{ "error": "可读的中文错误信息" }`。

## 4. 第一步：准备工作

1. 安装 Node.js 18+（`node -v` 能输出版本号即可）
2. 在 [supabase.com](https://supabase.com) 新建项目（Region 选 Singapore）
3. 在 SQL Editor 依次执行 `supabase/schema.sql`、`supabase/rls.sql`
4. 在 Project Settings → API Keys 复制 **Project URL** 与 **Publishable key**（`sb_publishable_...`）

## 5. 第二步：本地跑起来

```bash
git clone <你的仓库地址> task-manager
cd task-manager
npm install
cp .env.example .env      # 然后把 .env 里两行换成自己的 Supabase 值
npm run dev               # 后端 3000 + 前端 5173，浏览器打开 http://localhost:5173
```

只跑后端 / 只跑前端：

```bash
npm run dev:server        # http://localhost:3000
npx vite                  # http://localhost:5173（/api 会代理到 3000）
```

生产模式本地验证（后端同时托管前端）：

```bash
npm run build && npm start   # 打开 http://localhost:3000
```

## 6. 第三步：接入并验证 Supabase

```bash
curl http://localhost:3000/api/health
# {"ok":true,"message":"数据库连接正常"}

curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"复习数据库范式","priority":"高"}'

curl http://localhost:3000/api/tasks
```

| 现象 | 含义 | 处理 |
| --- | --- | --- |
| 查询列表成功 | 表、URL、key 都对 | 继续 |
| 添加任务报 `row-level security policy` | RLS 策略没开全 | 重跑 `supabase/rls.sql` |
| 报 `relation "tasks" does not exist` | 表没建成功 | 重跑 `supabase/schema.sql` |
| 报 `Invalid API key` | key 复制错了 | 重新复制 `sb_publishable_...` |

## 7. 第四步：离线自测（不需要 Supabase）

```bash
npm test
```

会用本地 Mock PostgREST 跑完 11 项检查（增、查、筛选、切换完成、删除、参数校验、持久化），全部 ✅ 说明代码逻辑没问题。

## 8. 第五步：部署到 Vercel

1. 把仓库推到 GitHub（公开仓库，Vercel 免费版需要）
2. Vercel → Add New → Project → 选中本仓库 → Import
3. Environment Variables 添加：

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://你的项目ID.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_你的key` |

4. Deploy，1～3 分钟出域名
5. 打开域名，添加一条任务，回到 Supabase Table Editor 确认能看到这条数据

> 变量名不能改：代码里读的就是 `SUPABASE_URL` / `SUPABASE_ANON_KEY`。值用新的 `sb_publishable_...` 即可，SDK 两种格式都认。

## 9. 验证清单

- [ ] 页面能添加、完成、删除、筛选任务
- [ ] Supabase Table Editor 能看到 `tasks` 表和新增数据
- [ ] GitHub 仓库能看到完整代码
- [ ] `.env` 没有出现在仓库里（`.gitignore` 已排除）
- [ ] Vercel 域名能正常打开
- [ ] 在线上新增任务，Supabase 里能看到
- [ ] 关掉浏览器再打开，数据还在

## 10. 安全说明

- `.env` 已被 `.gitignore` 排除，**不要把 key 提交到 GitHub**
- 只使用 `sb_publishable_...`（可公开的 key），**绝不要**把 `sb_secret_...` / `service_role` key 放进前端或仓库
- 当前 RLS 策略是「任何人可读写」，仅适合教学演示；正式项目应接入 Supabase Auth，改成 `auth.uid() = user_id` 的行级策略
- 如果 key 不小心泄露：立刻在 Supabase 后台 rotate，再更新 Vercel 环境变量并 Redeploy

## 11. 常见问题

**Q：首页 404 但 `/api/*` 正常？**
`vercel.json` 里的 `outputDirectory` 必须是 `client/dist`；改完要重新部署，并用 `curl -o /dev/null -w "%{http_code}" https://域名/` 验证。

**Q：Vercel 构建失败？**
检查 Build Logs：最常见是环境变量没配或变量名拼错；改完记得 Redeploy。

**Q：本地能看到数据，线上看不到？**
两边连的不是同一个 Supabase 项目，核对 `SUPABASE_URL` 的项目 ID。

**Q：`git push` 提示 Permission denied？**
GitHub 已不支持账号密码推送，改用 PAT 或 SSH key。
