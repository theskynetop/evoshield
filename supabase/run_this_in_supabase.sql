-- ═══════════════════════════════════════════════════════════════════════
--  STEP 1: Run this ENTIRE file in Supabase SQL Editor
--  Go to: supabase.com → your project → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    role        TEXT DEFAULT 'Analyst' CHECK (role IN ('Admin','Analyst','Viewer')),
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waf_rules (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           TEXT NOT NULL UNIQUE,
    pattern        TEXT NOT NULL,
    attack_type    TEXT NOT NULL,
    action         TEXT DEFAULT 'Block' CHECK (action IN ('Block','Allow','Log','Rate Limit','Redirect')),
    severity       TEXT DEFAULT 'High' CHECK (severity IN ('Critical','High','Medium','Low')),
    enabled        BOOLEAN DEFAULT TRUE,
    auto_generated BOOLEAN DEFAULT FALSE,
    description    TEXT,
    hits           INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attack_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp     TIMESTAMPTZ DEFAULT NOW(),
    source_ip     TEXT NOT NULL,
    method        TEXT,
    path          TEXT,
    payload       TEXT,
    attack_type   TEXT,
    severity      TEXT CHECK (severity IN ('Critical','High','Medium','Low')),
    status        TEXT CHECK (status IN ('Blocked','Healed','Allowed','Flagged')),
    rule_id       UUID REFERENCES public.waf_rules(id) ON DELETE SET NULL,
    ai_score      FLOAT DEFAULT 0.0,
    country       TEXT,
    user_agent    TEXT,
    response_code INTEGER,
    bytes_in      INTEGER
);

CREATE TABLE IF NOT EXISTS public.healing_events (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id        UUID REFERENCES public.waf_rules(id) ON DELETE CASCADE,
    trigger_log_id UUID REFERENCES public.attack_logs(id) ON DELETE SET NULL,
    ga_generations INTEGER DEFAULT 50,
    accuracy       FLOAT,
    fp_rate        FLOAT,
    status         TEXT DEFAULT 'Active',
    deployed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ml_models (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version     TEXT NOT NULL,
    accuracy    FLOAT,
    precision   FLOAT,
    recall      FLOAT,
    f1_score    FLOAT,
    fp_rate     FLOAT,
    n_trees     INTEGER DEFAULT 200,
    is_active   BOOLEAN DEFAULT TRUE,
    trained_at  TIMESTAMPTZ DEFAULT NOW(),
    metadata    JSONB
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type       TEXT,
    title      TEXT,
    message    TEXT,
    read       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attack_logs_timestamp ON public.attack_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attack_logs_type      ON public.attack_logs(attack_type);
CREATE INDEX IF NOT EXISTS idx_attack_logs_severity  ON public.attack_logs(severity);
CREATE INDEX IF NOT EXISTS idx_attack_logs_status    ON public.attack_logs(status);
CREATE INDEX IF NOT EXISTS idx_attack_logs_ip        ON public.attack_logs(source_ip);
CREATE INDEX IF NOT EXISTS idx_waf_rules_enabled     ON public.waf_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON public.notifications(user_id, read);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waf_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- WAF Rules (authenticated read/write)
CREATE POLICY "rules_select" ON public.waf_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "rules_insert" ON public.waf_rules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "rules_update" ON public.waf_rules FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "rules_delete" ON public.waf_rules FOR DELETE USING (auth.role() = 'authenticated');

-- Attack Logs — anon bhi insert kar sake (testing script ke liye)
CREATE POLICY "logs_select" ON public.attack_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "logs_insert" ON public.attack_logs FOR INSERT WITH CHECK (true);

-- Healing Events
CREATE POLICY "healing_select" ON public.healing_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "healing_insert" ON public.healing_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "healing_update" ON public.healing_events FOR UPDATE USING (auth.role() = 'authenticated');

-- ML Models
CREATE POLICY "ml_select" ON public.ml_models FOR SELECT USING (auth.role() = 'authenticated');

-- Notifications
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── Realtime ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.attack_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.healing_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── Triggers ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_waf_rules_updated
    BEFORE UPDATE ON public.waf_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name',
            COALESCE(NEW.raw_user_meta_data->>'role','Analyst'));
    RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Seed Data ────────────────────────────────────────────────────────────
INSERT INTO public.waf_rules (name, pattern, attack_type, action, severity, auto_generated) VALUES
('SQLI_001_UNION_SELECT', '(?i)(union\s+select)',                        'SQL Injection',    'Block', 'Critical', false),
('SQLI_002_DROP_TABLE',   '(?i)(drop\s+table)',                          'SQL Injection',    'Block', 'Critical', false),
('SQLI_003_OR_BYPASS',    '(?i)(or\s+\d+=\d+)',                         'SQL Injection',    'Block', 'High',     false),
('XSS_001_SCRIPT_TAG',    '(?i)<script[\s\S]*?>',                       'XSS',              'Block', 'High',     false),
('XSS_002_ONERROR',       '(?i)onerror\s*=',                            'XSS',              'Block', 'High',     false),
('XSS_003_JAVASCRIPT',    '(?i)javascript\s*:',                         'XSS',              'Block', 'Medium',   false),
('CMDI_001_SHELL_CMDS',   '[;&|`]\s*(ls|cat|id|whoami|wget|curl)',      'Command Injection', 'Block', 'Critical', false),
('PATH_001_TRAVERSAL',    '(\.\./){2,}|(%2e%2e%2f)+',                  'Path Traversal',   'Block', 'High',     false),
('AUTO_HEAL_49821',       '(?i)(union\s+all\s+select|benchmark\(\d+,)', 'SQL Injection',    'Block', 'Critical', true),
('AUTO_HEAL_73142',       '(?i)(<svg[^>]+on\w+\s*=)',                   'XSS',              'Block', 'High',     true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ml_models (version, accuracy, precision, recall, f1_score, fp_rate, n_trees, is_active)
VALUES ('1.4.0', 94.3, 96.1, 92.7, 94.4, 1.8, 200, true)
ON CONFLICT DO NOTHING;
