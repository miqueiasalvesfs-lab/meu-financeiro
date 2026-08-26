create table if not exists public.open_finance_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_slot smallint not null default 1 check (app_slot in (1,2)),
  provider text not null default 'pluggy',
  item_id text not null,
  connector_id text,
  institution_name text,
  institution_logo text,
  status text not null default 'CONNECTED',
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, app_slot, provider, item_id)
);

alter table public.open_finance_connections enable row level security;
revoke all on table public.open_finance_connections from anon;
revoke all on table public.open_finance_connections from authenticated;
grant select on table public.open_finance_connections to authenticated;

drop policy if exists open_finance_connections_select_own on public.open_finance_connections;
create policy open_finance_connections_select_own
on public.open_finance_connections
for select to authenticated
using ((select auth.uid()) = user_id);

create index if not exists open_finance_connections_user_slot_idx
on public.open_finance_connections(user_id, app_slot);
