// ── Helpers ────────────────────────────────────────────────────────────────
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rndFloat = (a, b, d = 2) => parseFloat((Math.random() * (b - a) + a).toFixed(d));

const IPS = ['192.168.1.','10.0.0.','172.16.0.','203.0.113.','198.51.100.'];
const ip  = () => rnd(IPS) + rndInt(1, 254);
const PATHS = ['/api/users','/api/login','/search','/products','/admin','/exec','/api/orders','/api/logs','/static'];
const ATTACK_TYPES = ['SQL Injection','XSS','Command Injection','Path Traversal','CSRF','XXE'];
const SEVERITIES   = ['Critical','Critical','High','High','Medium','Low'];
const STATUSES     = ['Blocked','Blocked','Blocked','Healed','Healed','Allowed'];
const COUNTRIES    = ['IN','US','CN','RU','DE','BR','Unknown'];
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64)',
  'sqlmap/1.7 (https://sqlmap.org)',
  'curl/7.81.0',
  'python-requests/2.28',
  'Googlebot/2.1',
];
const PAYLOADS = {
  'SQL Injection': ["' OR 1=1--", "UNION SELECT * FROM users", "'; DROP TABLE users;--", "1' AND SLEEP(5)--"],
  'XSS': ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "javascript:alert(document.cookie)"],
  'Command Injection': ['; ls -la', '| cat /etc/passwd', '$(whoami)', '`id`'],
  'Path Traversal': ['../../etc/passwd', '../../../windows/win.ini', '%2e%2e%2f%2e%2e%2f'],
  'CSRF': ['forged_token_abc123', 'csrf_bypass_payload'],
  'XXE': ['<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'],
};
const RULES = {
  'SQL Injection': 'SQLI_001: (?i)(union|select|drop|insert|delete)',
  'XSS': 'XSS_003: <script|onerror|javascript:',
  'Command Injection': 'CMDI_002: ;\\s*(ls|cat|id|whoami|rm)',
  'Path Traversal': 'PATH_001: \\.\\./|\\.\\.',
  'CSRF': 'CSRF_001: Missing CSRF token',
  'XXE': 'XXE_001: <!DOCTYPE.*ENTITY',
};

let logIdCounter = 1;
let ruleIdCounter = 1;

// ── Traffic Data ───────────────────────────────────────────────────────────
export function generateTrafficData(hours = 24) {
  return Array.from({ length: hours }, (_, i) => ({
    time: `${String(i).padStart(2,'0')}:00`,
    requests: rndInt(5000, 80000),
    attacks:  rndInt(10, 500),
    blocked:  rndInt(8, 450),
  }));
}

// ── Attack Distribution ────────────────────────────────────────────────────
export function generateAttackDistribution() {
  return ATTACK_TYPES.map(t => ({ name: t, value: rndInt(5, 40) }));
}

// ── Healing Activity ───────────────────────────────────────────────────────
export function generateHealingActivity(days = 7) {
  const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].slice(-days);
  return labels.map(d => ({ day: d, rules: rndInt(10, 60) }));
}

// ── Attack Logs ────────────────────────────────────────────────────────────
export function generateAttackLogs(count = 50) {
  return Array.from({ length: count }, (_, i) => {
    const type = rnd(ATTACK_TYPES);
    return {
      id:       logIdCounter++,
      time:     new Date(Date.now() - rndInt(0, 86400000)).toLocaleString(),
      type,
      ip:       ip(),
      path:     rnd(PATHS),
      severity: rnd(SEVERITIES),
      status:   rnd(STATUSES),
      payload:  rnd(PAYLOADS[type] || ['unknown_payload']),
      rule:     RULES[type] || 'GENERIC_001',
      aiScore:  rndFloat(0.1, 0.99),
      country:  rnd(COUNTRIES),
      ua:       rnd(UAS),
      bytes:    rndInt(100, 8000),
    };
  });
}

// ── Anomaly Scatter Data ───────────────────────────────────────────────────
export function generateAnomalyData(count = 100) {
  return Array.from({ length: count }, (_, i) => {
    const anomaly = Math.random() < 0.15;
    const attackType = anomaly ? rnd(ATTACK_TYPES) : null;
    return {
      x:         anomaly ? rndInt(300, 2000) : rndInt(10, 300),
      y:         anomaly ? rndFloat(0.6, 1.0) : rndFloat(0.0, 0.4),
      anomaly,
      score:     anomaly ? rndFloat(0.6, 1.0) : rndFloat(0.0, 0.4),
      ip:        ip(),
      attackType,
    };
  });
}

// ── SHAP Feature Values ────────────────────────────────────────────────────
export function generateSHAPData() {
  const features = [
    { name: 'Payload Length',    value: rndFloat(0.1,  0.45) },
    { name: 'Special Chars',     value: rndFloat(0.05, 0.4)  },
    { name: 'SQL Keywords',      value: rndFloat(0.1,  0.5)  },
    { name: 'Request Rate',      value: rndFloat(-0.2, 0.1)  },
    { name: 'Path Depth',        value: rndFloat(-0.1, 0.2)  },
    { name: 'Header Anomaly',    value: rndFloat(0.05, 0.3)  },
    { name: 'Encoding Pattern',  value: rndFloat(0.02, 0.25) },
    { name: 'User-Agent Score',  value: rndFloat(-0.15,0.15) },
  ];
  const maxVal = Math.max(...features.map(f => Math.abs(f.value)));
  return { features, maxVal, score: rndFloat(0.6, 0.98) };
}

// ── Rules ──────────────────────────────────────────────────────────────────
const RULE_NAMES = [
  'Block SQL UNION SELECT','Block XSS Script Tags','Prevent Path Traversal',
  'Command Injection Guard','CSRF Token Validation','XXE Entity Block',
  'Block SSRF Requests','Rate Limit Login','SQL SLEEP Detection',
  'JS Event Handler Block','Base64 Injection','Null Byte Block',
];

export function generateRules(count = 20) {
  return Array.from({ length: count }, (_, i) => {
    const type = rnd(ATTACK_TYPES);
    const auto = Math.random() < 0.4;
    return {
      id:          ruleIdCounter++,
      name:        auto ? `AUTO_HEAL_${rndInt(10000,99999)}` : rnd(RULE_NAMES),
      type,
      pattern:     rnd(Object.values(PAYLOADS).flat()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0,30),
      action:      rnd(['Block','Block','Block','Log','Rate Limit']),
      severity:    rnd(SEVERITIES),
      enabled:     Math.random() > 0.15,
      hits:        rndInt(0, 50000),
      auto,
      created:     new Date(Date.now() - rndInt(0, 30 * 86400000)).toLocaleDateString(),
      description: `Auto-generated rule for ${type} attack pattern detection`,
    };
  });
}

// ── Healing History ────────────────────────────────────────────────────────
export function generateHealingHistory(count = 10) {
  return Array.from({ length: count }, (_, i) => {
    const type = rnd(ATTACK_TYPES);
    return {
      id:       i + 1,
      name:     `AUTO_HEAL_${rndInt(10000,99999)}`,
      type,
      pattern:  rnd(Object.values(PAYLOADS).flat()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0,40),
      accuracy: rndFloat(90, 99, 1),
      fpRate:   rndFloat(0.5, 2.5, 2),
      hits:     rndInt(0, 5000),
      status:   rnd(['Active','Active','Active','Retired']),
      deployed: new Date(Date.now() - rndInt(0, 7 * 86400000)).toLocaleString(),
    };
  });
}
