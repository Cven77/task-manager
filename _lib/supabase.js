const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;
let cachedSignature = '';

function getSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) {
    const err = new Error('缺少环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY');
    err.status = 500;
    throw err;
  }
  const signature = `${url}::${key}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    cachedSignature = signature;
  }
  return cachedClient;
}

module.exports = { getSupabase };
