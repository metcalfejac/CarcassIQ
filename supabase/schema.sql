-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

create table if not exists public.costings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_name text not null,
  supplier text not null,
  purchase_weight_kg numeric not null default 0,
  purchase_price_per_kg numeric not null default 0,
  saleable_weight_kg numeric not null default 0,
  trim_weight_kg numeric not null default 0,
  trim_value_per_kg numeric not null default 0,
  -- Trim breakdown by use (e.g. diced beef vs mince): [{label, weight_kg, value_per_kg}].
  -- trim_weight_kg/trim_value_per_kg above are this array's aggregate.
  trim_groups jsonb,
  -- e.g. "Bones" — what the waste/drip loss was.
  waste_label text,
  waste_weight_kg numeric not null default 0,
  selling_price_per_kg numeric not null default 0,
  -- fraction, e.g. 0.30 for 30%
  target_margin_pct numeric not null default 0,
  -- Whole-carcass costing: set on every cut saved together from one carcass.
  carcass_group_id uuid,
  carcass_product_name text,
  carcass_deadweight_kg numeric
);

create index if not exists costings_user_id_idx on public.costings (user_id);
create index if not exists costings_supplier_idx on public.costings (supplier);
create index if not exists costings_carcass_group_idx on public.costings (carcass_group_id);

alter table public.costings enable row level security;

create policy "Users can view their own costings"
  on public.costings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own costings"
  on public.costings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own costings"
  on public.costings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own costings"
  on public.costings for delete
  using (auth.uid() = user_id);

-- Manufactured products: burgers, sausages, pies, ready meals — costed
-- from a list of ingredients rather than a single purchase weight.
create table if not exists public.manufactured_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_name text not null,
  selling_method text not null default 'per_kg', -- 'per_kg' | 'per_unit'
  selling_price numeric not null default 0,
  -- [{name, weight_kg, cost_per_kg}]
  ingredients jsonb not null default '[]'::jsonb,
  -- Weight per finished unit, if known/entered.
  unit_weight_kg numeric,
  -- Actual yield, if known/entered (takes precedence over an estimate).
  units_produced numeric,
  -- fraction, e.g. 0.30 for 30%
  target_margin_pct numeric not null default 0
);

create index if not exists manufactured_products_user_id_idx on public.manufactured_products (user_id);

alter table public.manufactured_products enable row level security;

create policy "Users can view their own manufactured products"
  on public.manufactured_products for select
  using (auth.uid() = user_id);

create policy "Users can insert their own manufactured products"
  on public.manufactured_products for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own manufactured products"
  on public.manufactured_products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own manufactured products"
  on public.manufactured_products for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists costings_set_updated_at on public.costings;
create trigger costings_set_updated_at
  before update on public.costings
  for each row
  execute function public.set_updated_at();

drop trigger if exists manufactured_products_set_updated_at on public.manufactured_products;
create trigger manufactured_products_set_updated_at
  before update on public.manufactured_products
  for each row
  execute function public.set_updated_at();

-- Billing: one row per user. Only ever written by the service-role key from
-- the serverless functions (api/start-trial, api/create-checkout-session,
-- api/stripe-webhook) — regular clients can only read their own row.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- none | trialing | active | past_due | canceled
  status text not null default 'none',
  price_id text,
  current_period_end timestamptz,
  trial_end timestamptz,
  signup_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

-- Every trial-start attempt, keyed by IP, so api/start-trial can throttle
-- repeat signups from the same connection. Service-role only — no client
-- policies at all.
create table if not exists public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists trial_signups_ip_idx on public.trial_signups (ip);

alter table public.trial_signups enable row level security;
