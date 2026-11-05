-- 开启行级安全（RLS）
alter table tasks enable row level security;

-- 教学演示用：允许匿名客户端（浏览器 / 后端 anon key）读写。
-- 正式项目请改成“登录用户只能操作自己的数据”，见 README 的安全说明。
create policy "Allow anon read" on tasks for select using (true);
create policy "Allow anon insert" on tasks for insert with check (true);
create policy "Allow anon update" on tasks for update using (true) with check (true);
create policy "Allow anon delete" on tasks for delete using (true);
