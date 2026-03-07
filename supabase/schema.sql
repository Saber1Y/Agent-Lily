create extension if not exists pgcrypto;

create table if not exists public.agent_configs (
  id text primary key,
  current_chain_id integer not null,
  position_usdc text not null,
  auto_rebalance_enabled boolean not null default false,
  min_yield_delta_pct numeric,
  min_net_gain_usd numeric,
  max_route_cost_usd numeric,
  cooldown_minutes integer,
  allowed_destination_chain_ids jsonb,
  blocked_chain_ids jsonb,
  alert_webhook_url text,
  telegram_bot_token text,
  telegram_chat_id text,
  telegram_enabled boolean default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trigger_source text not null,
  status text not null,
  mode text not null,
  current_chain_id integer not null,
  amount_usdc text not null,
  message text not null,
  route_id text,
  tx_links jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  reasoning jsonb
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_configs_updated_at on public.agent_configs;

create trigger set_agent_configs_updated_at
before update on public.agent_configs
for each row
execute function public.set_updated_at();
