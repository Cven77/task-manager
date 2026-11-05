const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;
let cachedSignature = '';

/**
 * 按当前环境变量创建（并复用）Supabase 客户端。
 * 只使用 Publishable / anon key，绝不使用 service_role / secret key。
 */
function getSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();

  if (!url || !key) {
    const err = new Error(
      '缺少环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY，请复制 .env.example 为 .env 并填入自己的 Supabase 项目信息'
    );
    err.status = 500;
    throw err;
  }

  const signature = `${url}::${key}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedSignature = signature;
  }
  return cachedClient;
}

module.exports = { getSupabase };
