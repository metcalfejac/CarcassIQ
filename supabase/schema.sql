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
