import { supabase } from './supabase';

// ── Attack Logs ────────────────────────────────────────────────────────────
export async function fetchAttackLogs({ page = 1, limit = 50, attackType, severity, status, search } = {}) {
  let q = supabase
    .from('attack_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false });

  if (attackType && attackType !== 'All') q = q.eq('attack_type', attackType);
  if (severity   && severity !== 'All')   q = q.eq('severity', severity);
  if (status     && status !== 'All')     q = q.eq('status', status);
  if (search) q = q.or(`source_ip.ilike.%${search}%,path.ilike.%${search}%,attack_type.ilike.%${search}%`);

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

export async function fetchRecentAttacks(limit = 10) {
  const { data, error } = await supabase
    .from('attack_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ── Dashboard Stats ────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  const since24h = new Date(Date.now() - 86400000).toISOString();

  const [totalRes, blockedRes, healedRes, criticalRes, logsRes] = await Promise.all([
    supabase.from('attack_logs').select('*', { count: 'exact', head: true }).gte('timestamp', since24h),
    supabase.from('attack_logs').select('*', { count: 'exact', head: true }).eq('status', 'Blocked').gte('timestamp', since24h),
    supabase.from('attack_logs').select('*', { count: 'exact', head: true }).eq('status', 'Healed').gte('timestamp', since24h),
    supabase.from('attack_logs').select('*', { count: 'exact', head: true }).eq('severity', 'Critical').gte('timestamp', since24h),
    supabase.from('attack_logs').select('timestamp, status, attack_type').gte('timestamp', since24h),
  ]);

  return {
    totalRequests:   totalRes.count  || 0,
    attacksBlocked:  blockedRes.count || 0,
    activeThreat:    criticalRes.count || 0,
    rulesHealed:     healedRes.count || 0,
    logs:            logsRes.data || [],
  };
}

// ── Traffic Chart (last 24h grouped by hour) ───────────────────────────────
export async function fetchTrafficChartData() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data, error } = await supabase
    .from('attack_logs')
    .select('timestamp, status')
    .gte('timestamp', since)
    .order('timestamp', { ascending: true });

  if (error) throw error;

  const hourMap = {};
  for (let h = 0; h < 24; h++) {
    const label = `${String(h).padStart(2, '0')}:00`;
    hourMap[label] = { time: label, requests: 0, attacks: 0 };
  }

  (data || []).forEach(row => {
    const h = new Date(row.timestamp).getHours();
    const label = `${String(h).padStart(2, '0')}:00`;
    if (hourMap[label]) {
      hourMap[label].requests++;
      if (row.status === 'Blocked' || row.status === 'Healed') {
        hourMap[label].attacks++;
      }
    }
  });

  return Object.values(hourMap);
}

// ── Attack Distribution (pie chart) ────────────────────────────────────────
export async function fetchAttackDistribution() {
  const { data, error } = await supabase
    .from('attack_logs')
    .select('attack_type');
  if (error) throw error;

  const counts = {};
  (data || []).forEach(row => {
    if (!row.attack_type) return;
    counts[row.attack_type] = (counts[row.attack_type] || 0) + 1;
  });

  const COLORS = ['#f44336','#ff9800','#7c4dff','#00bcd4','#607d8b','#00e676'];
  return Object.entries(counts).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length],
  }));
}

// ── Weekly Healing Activity ────────────────────────────────────────────────
export async function fetchHealingActivity() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('healing_events')
    .select('deployed_at')
    .gte('deployed_at', since);
  if (error) throw error;

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayMap = {};
  days.forEach(d => { dayMap[d] = { day: d, rules: 0 }; });

  (data || []).forEach(row => {
    const d = days[new Date(row.deployed_at).getDay()];
    if (dayMap[d]) dayMap[d].rules++;
  });

  return Object.values(dayMap);
}

// ── WAF Rules ─────────────────────────────────────────────────────────────
export async function fetchRules() {
  const { data, error } = await supabase
    .from('waf_rules')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRule(rule) {
  const { data, error } = await supabase.from('waf_rules').insert([rule]).select().single();
  if (error) throw error;
  return data;
}

export async function updateRule(id, updates) {
  const { data, error } = await supabase.from('waf_rules').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRule(id) {
  const { error } = await supabase.from('waf_rules').delete().eq('id', id);
  if (error) throw error;
}

// ── Healing History ────────────────────────────────────────────────────────
export async function fetchHealingHistory(limit = 20) {
  const { data, error } = await supabase
    .from('healing_events')
    .select(`*, waf_rules(name, pattern, attack_type, accuracy:hits)`)
    .order('deployed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function insertHealingEvent(event) {
  const { data, error } = await supabase.from('healing_events').insert([event]).select().single();
  if (error) throw error;
  return data;
}

// ── Model Stats ────────────────────────────────────────────────────────────
export async function fetchModelStats() {
  const { data, error } = await supabase
    .from('ml_models')
    .select('*')
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}

// ── Reports: weekly attack data ────────────────────────────────────────────
export async function fetchWeeklyAttackData() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('attack_logs')
    .select('timestamp, status')
    .gte('timestamp', since);
  if (error) throw error;

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const jsDay = [1,2,3,4,5,6,0]; // JS getDay() index for Mon-Sun
  const map = {};
  days.forEach((d, i) => { map[jsDay[i]] = { day: d, attacks: 0, blocked: 0 }; });

  (data || []).forEach(row => {
    const d = new Date(row.timestamp).getDay();
    if (map[d]) {
      map[d].attacks++;
      if (row.status === 'Blocked') map[d].blocked++;
    }
  });

  return days.map((d, i) => map[jsDay[i]]);
}

// ── Notifications ──────────────────────────────────────────────────────────
export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw error;
}
