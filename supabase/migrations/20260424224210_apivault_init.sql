-- APIvault Database Migration
-- Run this in your Supabase SQL editor (single pass)

-- ─── Tables ────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  vault_key   uuid UNIQUE DEFAULT gen_random_uuid(),
  role        text DEFAULT 'user' CHECK (role IN ('user','admin')),
  credits     numeric(12,6) DEFAULT 0 CHECK (credits >= 0),
  status      text DEFAULT 'active' CHECK (status IN ('active','suspended')),
  plan        text DEFAULT 'dev' CHECK (plan IN ('dev','creator','business')),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE pools (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  label       text NOT NULL,
  balance     numeric(12,4) DEFAULT 0,
  floor       numeric(12,4) DEFAULT 0,
  daily_avg   numeric(12,4) DEFAULT 0,
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE api_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  category        text CHECK (category IN ('ai','payments','comms','data','dev')),
  pool_id         uuid REFERENCES pools(id),
  upstream_url    text NOT NULL,
  master_key_ref  text NOT NULL,
  cost_per_call   numeric(12,8) DEFAULT 0,
  markup          numeric(6,2)  DEFAULT 0,
  billing_unit    text DEFAULT 'per_request',
  status          text DEFAULT 'live' CHECK (status IN ('live','paused','pending')),
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE user_api_access (
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  categories  text[] DEFAULT ARRAY['ai','dev'],
  daily_limit integer DEFAULT 1000,
  PRIMARY KEY (user_id)
);

CREATE TABLE usage_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  api_id      uuid REFERENCES api_registry(id),
  cost        numeric(12,8),
  charged     numeric(12,8),
  profit      numeric(12,8),
  http_status integer,
  ts          timestamptz DEFAULT now()
);

CREATE TABLE credit_ledger (
  id           bigserial PRIMARY KEY,
  user_id      uuid REFERENCES users(id),
  delta        numeric(12,6) NOT NULL,
  reason       text,
  type         text CHECK (type IN ('topup','deduct','refund')),
  balance_after numeric(12,6),
  ts           timestamptz DEFAULT now()
);

CREATE TABLE pool_log (
  id       bigserial PRIMARY KEY,
  pool_id  uuid REFERENCES pools(id),
  event    text,
  amount   numeric(12,4),
  ts       timestamptz DEFAULT now()
);

CREATE TABLE admin_alerts (
  id        bigserial PRIMARY KEY,
  type      text NOT NULL,
  pool_id   uuid REFERENCES pools(id),
  api_id    uuid REFERENCES api_registry(id),
  message   text,
  resolved  boolean DEFAULT false,
  ts        timestamptz DEFAULT now()
);

CREATE TABLE stripe_events (
  event_id  text PRIMARY KEY,
  user_id   uuid REFERENCES users(id),
  amount    numeric(12,4),
  ts        timestamptz DEFAULT now()
);

CREATE TABLE api_requests (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug      text NOT NULL,
  name      text NOT NULL,
  requested_by uuid REFERENCES users(id),
  status    text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  ts        timestamptz DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_usage_log_user  ON usage_log(user_id, ts DESC);
CREATE INDEX idx_usage_log_api   ON usage_log(api_id, ts DESC);
CREATE INDEX idx_usage_log_ts    ON usage_log(ts DESC);
CREATE INDEX idx_credit_ledger_u ON credit_ledger(user_id, ts DESC);
CREATE INDEX idx_alerts_resolved ON admin_alerts(resolved, ts DESC);

-- ─── Atomic Functions ──────────────────────────────────────────────────────

-- Deduct credits — returns false if balance too low (race-safe)
CREATE OR REPLACE FUNCTION deduct_credits(uid uuid, amount numeric)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE users
    SET credits = credits - amount
  WHERE id = uid AND credits >= amount
  RETURNING credits INTO new_balance;

  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO credit_ledger (user_id, delta, reason, type, balance_after)
  VALUES (uid, -amount, 'api_call', 'deduct', new_balance);

  RETURN true;
END;
$$;

-- Add credits (purchase or refund)
CREATE OR REPLACE FUNCTION add_credits(uid uuid, amount numeric, reason text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE users SET credits = credits + amount
  WHERE id = uid
  RETURNING credits INTO new_balance;

  INSERT INTO credit_ledger (user_id, delta, reason, type, balance_after)
  VALUES (uid, amount, reason, 'topup', new_balance);
END;
$$;

-- Debit pool balance
CREATE OR REPLACE FUNCTION debit_pool(pid uuid, amount numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE pools SET balance = balance - amount, updated_at = now() WHERE id = pid;
$$;

-- Add to pool balance
CREATE OR REPLACE FUNCTION add_to_pool(pid uuid, amount numeric)
RETURNS void LANGUAGE sql AS $$
  UPDATE pools SET balance = balance + amount, updated_at = now() WHERE id = pid;
$$;

-- 7-day rolling daily average cost for a pool
CREATE OR REPLACE FUNCTION pool_daily_avg(pid uuid)
RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(SUM(cost) / NULLIF(COUNT(DISTINCT ts::date), 0), 0)
  FROM usage_log ul
  JOIN api_registry ar ON ul.api_id = ar.id
  WHERE ar.pool_id = pid AND ul.ts > now() - interval '7 days';
$$;

-- ─── Seed: Default Pools ───────────────────────────────────────────────────

INSERT INTO pools (name, label, balance, floor) VALUES
  ('ai_pool',     'AI & Image',    500.00, 210.00),
  ('pay_pool',    'Payments',      300.00, 120.00),
  ('comms_pool',  'Communication', 200.00, 100.00),
  ('data_pool',   'Data & Search', 150.00,  70.00),
  ('dev_pool',    'Dev Tools',      50.00,  10.00);

-- ─── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger  ENABLE ROW LEVEL SECURITY;

-- Users see only their own rows
CREATE POLICY "users_own" ON users         FOR ALL USING (id = auth.uid());
CREATE POLICY "usage_own" ON usage_log     FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ledger_own" ON credit_ledger FOR SELECT USING (user_id = auth.uid());

-- ─── Trigger: auto-create user_api_access on new user ─────────────────────
-- Prevents the silent gap where /user/apis returns nothing for new users

CREATE OR REPLACE FUNCTION create_user_access()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_api_access (user_id, categories, daily_limit)
  VALUES (
    NEW.id,
    CASE NEW.plan
      WHEN 'creator'  THEN ARRAY['ai','comms']
      WHEN 'business' THEN ARRAY['payments','comms','data']
      ELSE                 ARRAY['ai','dev']          -- dev plan default
    END,
    1000
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_access();

-- ─── Trigger: update user_api_access when plan changes ────────────────────

CREATE OR REPLACE FUNCTION sync_user_access()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan <> OLD.plan THEN
    UPDATE user_api_access
    SET categories = CASE NEW.plan
      WHEN 'creator'  THEN ARRAY['ai','comms']
      WHEN 'business' THEN ARRAY['payments','comms','data']
      ELSE                 ARRAY['ai','dev']
    END
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_plan_changed
  AFTER UPDATE OF plan ON users
  FOR EACH ROW EXECUTE FUNCTION sync_user_access();

-- ─── Helper: get burn rate for admin dashboard ─────────────────────────────

CREATE OR REPLACE FUNCTION daily_burn_rate()
RETURNS numeric LANGUAGE sql AS $$
  SELECT COALESCE(SUM(cost), 0)
  FROM usage_log
  WHERE ts > now() - interval '24 hours';
$$;

-- ─── Helper: top APIs by calls in last 24h ─────────────────────────────────

CREATE OR REPLACE FUNCTION top_apis_today(lim int DEFAULT 5)
RETURNS TABLE (api_name text, call_count bigint, total_cost numeric, total_charged numeric)
LANGUAGE sql AS $$
  SELECT ar.name, COUNT(*) as call_count, SUM(ul.cost), SUM(ul.charged)
  FROM usage_log ul
  JOIN api_registry ar ON ul.api_id = ar.id
  WHERE ul.ts > now() - interval '24 hours'
  GROUP BY ar.name
  ORDER BY call_count DESC
  LIMIT lim;
$$;
