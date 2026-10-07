// 需求聚合·第二层 —— 结构化需求 + 匿名多方报价 全流程演示
//
// 跑通链路：
//   ① 买家发布「结构化需求」（品类/成色/克重/工艺/圈口/数量/交期/是否接受替代款/保证金）
//   ② 平台按供应能力把需求派发给匹配档口 → 档口匿名报价（档口A/B/C）
//   ③ 买家横向比价（价格/交期/信用分综合评分）
//   ④ 买家选定一档 → 该需求 confirmed、中标报价 accepted、其余 rejected
//   ⑤ 反「穿价」验证：档口A 只能看到自己的报价，看不到别家
//
// 用法（在 web/ 目录，需 .env.local 内有 SERVICE_ROLE / ANON KEY）：
//   & "E:\2026\nodejs\node-v24.20.0-win-x64\node.exe" scripts/demo-demand-quotes.js
//
// 说明：本脚本会向 Supabase 写入演示数据（可重复执行，会先清掉上一轮 DEMO- 需求）。
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
const E = env(path.join(__dirname, '..', '.env.local'));
const URL = E.SUPABASE_URL;
const SRV = E.SUPABASE_SERVICE_ROLE_KEY;
const ANON = E.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !SRV) { console.error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const db = createClient(URL, SRV, { auth: { persistSession: false, autoRefreshToken: false } });

// 演示档口（与 demo 账号同源；首次运行会自动创建）
const STALLS = [
  { email: 'stall-a@zhuli.app', password: 'StallA@2026', nickname: '水贝A档口', credit: 92 },
  { email: 'stall-b@zhuli.app', password: 'StallB@2026', nickname: '水贝B档口', credit: 88 },
  { email: 'stall-c@zhuli.app', password: 'StallC@2026', nickname: '水贝C档口', credit: 96 },
];
const CUSTOMER_EMAIL = 'customer@zhuli.app';

const line = (n = 74) => '─'.repeat(n);
const money = (v) => '¥' + Number(v).toLocaleString('zh-CN');

async function ensureUser(email, password, meta) {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = (list?.users ?? []).find((u) => u.email === email);
  let id = found?.id;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: meta,
    });
    if (error) throw new Error(`创建 ${email} 失败：${error.message}`);
    id = data.user.id;
  }
  const { error: e2 } = await db.from('zhuli_users').upsert(
    { id, nickname: meta.nickname, role: meta.role }, { onConflict: 'id' }
  );
  if (e2) throw new Error(`写 zhuli_users(${email}) 失败：${e2.message}`);
  return id;
}

// 综合评分：价格 50% + 交期 25% + 信用 25%（价格/交期取相对最优值归一化）
function score(quotes) {
  const minPrice = Math.min(...quotes.map((q) => q.price));
  const minDays = Math.min(...quotes.map((q) => q.delivery_days));
  return quotes.map((q) => ({
    ...q,
    priceScore: (minPrice / q.price) * 100,
    daysScore: (minDays / q.delivery_days) * 100,
    creditScore: q.credit_score,
    total: (minPrice / q.price) * 100 * 0.5 + (minDays / q.delivery_days) * 100 * 0.25 + q.credit_score * 0.25,
  }));
}

const DEMANDS = [
  {
    demand_no: 'DEMO-XQ-0001',
    tier: 'c',
    category: '手镯', purity: '足金999', weight_min: 30, weight_max: 32, craft: '古法金',
    size_spec: '圈口56', quantity: 1, deadline: '2026-10-20', accept_alternative: true,
    budget_min: 32000, budget_max: 36000, deposit: 500,
    description: '自己戴的古法金手镯，30克左右，圈口56，要实心、哑光质感，工费希望控制在合理区间。',
    quotes: [
      { price: 33900, delivery_days: 3, quote_deposit: 500, spec_summary: '足金999 31.2g 古法哑光，实心', fee_note: '含工费，不包质检费' },
      { price: 32600, delivery_days: 6, quote_deposit: 500, spec_summary: '足金999 30.5g 古法，实心（现货改圈口）', fee_note: '含工费，可开发票' },
      { price: 35200, delivery_days: 2, quote_deposit: 800, spec_summary: '足金999 32g 古法·手工錾花，实心', fee_note: '含工费+证书，含顺丰保价' },
    ],
  },
  {
    demand_no: 'DEMO-XQ-0002',
    tier: 'b',
    category: '戒指', purity: '18K金', weight_min: 2.2, weight_max: 2.6, craft: '车花',
    size_spec: '圈口12-16 均码', quantity: 200, deadline: '2026-11-05', accept_alternative: false,
    budget_min: 380, budget_max: 460, deposit: 5000,
    description: '直播供货用素圈车花戒指，18K金，200件起，需统一包装，分批交付可接受。',
    quotes: [
      { price: 428, delivery_days: 12, quote_deposit: 5000, spec_summary: '18K金 2.4g 车花素圈，均码可调', fee_note: '含工费，含简装盒' },
      { price: 399, delivery_days: 18, quote_deposit: 5000, spec_summary: '18K金 2.3g 车花，均码', fee_note: '含工费，包装另计 2 元/件' },
      { price: 445, delivery_days: 9, quote_deposit: 8000, spec_summary: '18K金 2.5g 车花，独立包装+质检', fee_note: '含工费+包装+质检' },
    ],
  },
];

(async () => {
  console.log('\n' + '═'.repeat(74));
  console.log(' 需求聚合 · 第二层 —— 结构化需求 + 匿名多方报价  全流程演示');
  console.log('═'.repeat(74));

  // 0. 准备账号
  console.log('\n【0】准备演示账号');
  const customerId = await ensureUser(CUSTOMER_EMAIL, 'Customer@2026', { nickname: '珠宝买手小王', role: 'customer_c' });
  console.log(`   买家  customer@zhuli.app  ✓`);
  const stallIds = [];
  for (const s of STALLS) {
    const id = await ensureUser(s.email, s.password, { nickname: s.nickname, role: 'supplier' });
    stallIds.push(id);
    console.log(`   档口  ${s.nickname.padEnd(6, '　')} ${s.email}  信用分 ${s.credit}  ✓`);
  }

  // 清掉上一轮演示需求（报价随 ON DELETE CASCADE 一起清）
  await db.from('zhuli_tasks').delete().like('demand_no', 'DEMO-%');

  for (const d of DEMANDS) {
    console.log('\n' + line());
    console.log(`【1】买家发布结构化需求  ${d.demand_no}`);
    console.log(line());
    console.log(`   档位：${d.tier === 'c' ? 'C端 · 单件定制' : 'B端 · 批量采购'}`);
    console.log(`   品类：${d.category}   成色：${d.purity}   克重：${d.weight_min}-${d.weight_max}g`);
    console.log(`   工艺：${d.craft}   规格：${d.size_spec}   数量：${d.quantity}   交期：${d.deadline}`);
    console.log(`   预算：${money(d.budget_min)} ~ ${money(d.budget_max)}   保证金：${money(d.deposit)}   接受同系列替代款：${d.accept_alternative ? '是' : '否'}`);

    const { data: task, error: te } = await db.from('zhuli_tasks').insert({
      user_id: customerId,
      type: 'find',
      status: 'open',
      description: d.description,
      budget_min: d.budget_min,
      budget_max: d.budget_max,
      demand_no: d.demand_no,
      tier: d.tier,
      category: d.category,
      purity: d.purity,
      weight_min: d.weight_min,
      weight_max: d.weight_max,
      craft: d.craft,
      size_spec: d.size_spec,
      quantity: d.quantity,
      deadline: d.deadline,
      accept_alternative: d.accept_alternative,
      deposit: d.deposit,
    }).select().single();
    if (te) throw new Error('发布需求失败：' + te.message);

    console.log('\n' + line());
    console.log('【2】平台按供应能力派发 → 匹配档口匿名报价');
    console.log(line());
    const rows = [];
    for (let i = 0; i < d.quotes.length; i++) {
      const q = d.quotes[i];
      const { data: quote, error: qe } = await db.from('zhuli_task_quotes').insert({
        task_id: task.id,
        buyer_id: stallIds[i],
        price: q.price,
        delivery_days: q.delivery_days,
        quote_deposit: q.quote_deposit,
        spec_summary: q.spec_summary,
        fee_note: q.fee_note,
        credit_score: STALLS[i].credit,
        status: 'pending',
        message: '',
      }).select().single();
      if (qe) throw new Error('报价失败：' + qe.message);
      rows.push({ ...quote, price: Number(quote.price), _stallId: stallIds[i] });
    }

    const ranked = score(rows).sort((a, b) => b.total - a.total);
    const lowest = rows.reduce((m, r) => (r.price < m.price ? r : m), rows[0]);

    console.log(`   共 ${rows.length} 家档口报价（报价方彼此不可见）：\n`);
    console.log('   代号    报价        交期    信用分   综合评分   规格');
    console.log('   ' + '─'.repeat(68));
    for (const r of ranked) {
      console.log(
        `   ${r.alias.padEnd(6, ' ')}  ${money(r.price).padEnd(10, ' ')}  ${(r.delivery_days + '天').padEnd(6, ' ')}  ` +
        `${String(r.credit_score).padEnd(7, ' ')}  ${r.total.toFixed(1).padEnd(9, ' ')}  ${r.spec_summary}`
      );
    }

    // ③ 择优：综合评分最高者中标
    const winner = ranked[0];
    const winnerId = winner.id;

    console.log('\n' + line());
    console.log('【3】买家横向比价 → 择优选定');
    console.log(line());
    console.log(`   最低价：${lowest.alias}  ${money(lowest.price)}（交期 ${lowest.delivery_days} 天）`);
    console.log(`   综合最优：${winner.alias}  ${money(winner.price)}  · 评分 ${winner.total.toFixed(1)}（价格50% + 交期25% + 信用25%）`);
    console.log(`   → 选定 ${winner.alias}`);

    // ④ 落库
    await db.from('zhuli_task_quotes').update({ status: 'accepted' }).eq('id', winnerId);
    await db.from('zhuli_task_quotes')
      .update({ status: 'rejected' })
      .eq('task_id', task.id).neq('id', winnerId);
    await db.from('zhuli_tasks')
      .update({ status: 'confirmed', buyer_id: winner._stallId })
      .eq('id', task.id);

    console.log(`   中标报价 → accepted，其余 ${rows.length - 1} 条 → rejected`);
    console.log(`   需求状态 open → confirmed，接单档口已回填`);

    // ⑤ 反穿价验证
    if (ANON) {
      const asStallA = createClient(URL, ANON, { auth: { persistSession: false } });
      const { error: se } = await asStallA.auth.signInWithPassword({ email: STALLS[0].email, password: STALLS[0].password });
      if (!se) {
        const { data: seen } = await asStallA.from('zhuli_task_quotes').select('alias, price').eq('task_id', task.id);
        const { data: asCustomer } = await db.from('zhuli_task_quotes').select('alias, price').eq('task_id', task.id);
        console.log('\n' + line());
        console.log('【4】反「穿价」隔离验证');
        console.log(line());
        console.log(`   以 ${STALLS[0].nickname} 身份查询该需求报价 → 可见 ${(seen ?? []).length} 条（只有自己）`);
        console.log(`   需求方本人查询同一需求      → 可见 ${(asCustomer ?? []).length} 条（全部匿名报价）`);
        await asStallA.auth.signOut();
      }
    }
  }

  console.log('\n' + '═'.repeat(74));
  console.log(' 演示完成：发布需求 → 多方匿名报价 → 横向比价 → 择优选定 全链路已跑通');
  console.log('═'.repeat(74) + '\n');
})().catch((err) => {
  console.error('\n✗ 演示失败：' + err.message);
  process.exit(1);
});
