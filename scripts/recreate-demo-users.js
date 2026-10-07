// 重建 4 个 demo 账号（admin/supplier/customer/buyer）
// 前置：已在 Supabase 控制台执行 sql/007_fix_auth_users.sql（清掉畸形 auth.users 行）
// 用法（在 web/ 目录）：
//   node scripts/recreate-demo-users.js
// 原理：用 SERVICE_ROLE + GoTrue 官方 admin.createUser，生成含合法 auth.identities 的账号，
//       不再经 SQL 手插 auth.users（那正是导致 "Database error querying schema" 的根因）。
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function env(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const e = env(path.join(__dirname, '..', '.env.local'));
const URL = e.SUPABASE_URL;
const SRV = e.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SRV) { console.error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(URL, SRV, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 与 005 保持一致的角色/资料
const ACCOUNTS = [
  { email: 'admin@zhuli.app',     password: 'Zhuli@2026',     meta: { nickname: '系统管理员', role: 'admin' } },
  { email: 'supplier@zhuli.app',  password: 'Supplier@2026',  meta: { nickname: '水贝演示档口', role: 'supplier' } },
  { email: 'customer@zhuli.app',  password: 'Customer@2026',  meta: { nickname: '珠宝买手小王', role: 'customer_c' } },
  { email: 'buyer@zhuli.app',     password: 'Buyer@2026',     meta: { nickname: '跑腿小周',     role: 'buyer' } },
];

(async () => {
  for (const a of ACCOUNTS) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: a.email,
        password: a.password,
        email_confirm: true,
        user_metadata: a.meta,
      });
      if (error) {
        console.log(`✗ ${a.email} -> ${error.message}`);
      } else {
        console.log(`✓ ${a.email} -> id ${data.user.id}`);
      }
    } catch (err) {
      console.log(`✗ ${a.email} -> ${err.message}`);
    }
  }
})();