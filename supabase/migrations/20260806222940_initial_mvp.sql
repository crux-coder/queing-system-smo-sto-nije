create extension if not exists pgcrypto with schema extensions;

create type public.order_status as enum (
  'ordered',
  'ready',
  'collected',
  'cancelled',
  'expired'
);

create table public.locations (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_counters (
  location_id uuid not null references public.locations(id) on delete restrict,
  sequence_date date not null,
  last_value bigint not null check (last_value > 0),
  primary key (location_id, sequence_date)
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete restrict,
  sequence_date date not null,
  sequence_number bigint not null check (sequence_number > 0),
  public_number text not null,
  description text not null check (char_length(description) between 1 and 500),
  status public.order_status not null default 'ordered',
  tracking_token uuid not null unique default extensions.gen_random_uuid(),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  collected_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  expired_at timestamptz,
  unique (location_id, sequence_date, sequence_number),
  unique (location_id, idempotency_key)
);

create index orders_active_location_created_idx
  on public.orders (location_id, created_at, id)
  where status in ('ordered', 'ready');
create index orders_location_ready_idx
  on public.orders (location_id, ready_at, id)
  where status = 'ready';

-- This table is intentionally the only anonymous Realtime surface. It cannot
-- contain descriptions, tracking credentials, auth identifiers, or metadata.
create table public.public_queue (
  order_id uuid primary key,
  location_id uuid not null,
  public_number text not null,
  status public.order_status not null check (status in ('ordered', 'ready')),
  created_at timestamptz not null,
  ready_at timestamptz
);

create index public_queue_location_created_idx
  on public.public_queue (location_id, created_at, order_id);
create index public_queue_location_ready_idx
  on public.public_queue (location_id, ready_at, order_id)
  where status = 'ready';

create or replace function private_sync_order_to_public_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('ordered', 'ready') then
    insert into public.public_queue (
      order_id, location_id, public_number, status, created_at, ready_at
    ) values (
      new.id, new.location_id, new.public_number, new.status, new.created_at, new.ready_at
    )
    on conflict (order_id) do update set
      status = excluded.status,
      ready_at = excluded.ready_at;
  else
    delete from public.public_queue where order_id = new.id;
  end if;

  return new;
end;
$$;

create or replace function private_guard_order_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.description := trim(new.description);

  if tg_op = 'INSERT' then
    if new.status <> 'ordered' then
      raise exception 'New orders must start ordered';
    end if;
    new.expires_at := new.created_at + interval '24 hours';
    return new;
  end if;

  if old.status = new.status then
    if new.status <> 'ordered' and new.description is distinct from old.description then
      raise exception 'Only ordered descriptions can be edited';
    end if;
    return new;
  end if;

  if old.status = 'ordered' and new.status = 'ready' then
    new.ready_at := coalesce(new.ready_at, now());
  elsif old.status = 'ordered' and new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif old.status = 'ready' and new.status = 'collected' then
    new.collected_at := coalesce(new.collected_at, now());
  elsif old.status in ('ordered', 'ready') and new.status = 'expired' and now() >= old.expires_at then
    new.expired_at := coalesce(new.expired_at, now());
  else
    raise exception 'Invalid order transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger guard_order_lifecycle
before insert or update on public.orders
for each row execute function private_guard_order_lifecycle();

create trigger sync_order_to_public_queue
after insert or update on public.orders
for each row execute function private_sync_order_to_public_queue();

create or replace function public.create_order(
  p_description text,
  p_idempotency_key uuid
)
returns table (
  order_id uuid,
  order_public_number text,
  order_tracking_token uuid,
  order_status public.order_status,
  order_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id uuid;
  v_description text;
  v_date date;
  v_sequence bigint;
  v_prefix text;
  v_existing public.orders%rowtype;
  v_created public.orders%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select id into v_location_id
  from public.locations
  where owner_user_id = (select auth.uid());

  if v_location_id is null then
    raise exception 'No location is provisioned for this account';
  end if;

  v_description := trim(coalesce(p_description, ''));
  if char_length(v_description) = 0 then
    raise exception 'Narudžba je prazna';
  end if;
  if char_length(v_description) > 500 then
    raise exception 'Narudžba može imati najviše 500 znakova';
  end if;

  select * into v_existing
  from public.orders
  where location_id = v_location_id and idempotency_key = p_idempotency_key;

  if found then
    return query select
      v_existing.id,
      v_existing.public_number,
      v_existing.tracking_token,
      v_existing.status,
      v_existing.created_at;
    return;
  end if;

  v_date := (now() at time zone 'UTC')::date;

  insert into public.order_counters (location_id, sequence_date, last_value)
  values (v_location_id, v_date, 1)
  on conflict (location_id, sequence_date)
  do update set last_value = public.order_counters.last_value + 1
  returning last_value into v_sequence;

  v_prefix := chr(64 + extract(isodow from v_date)::integer);

  insert into public.orders (
    location_id,
    sequence_date,
    sequence_number,
    public_number,
    description,
    idempotency_key
  ) values (
    v_location_id,
    v_date,
    v_sequence,
    v_prefix || '-' || lpad(v_sequence::text, 3, '0'),
    v_description,
    p_idempotency_key
  )
  returning * into v_created;

  return query select
    v_created.id,
    v_created.public_number,
    v_created.tracking_token,
    v_created.status,
    v_created.created_at;
end;
$$;

create or replace function public.update_order(
  p_order_id uuid,
  p_expected_status public.order_status,
  p_next_status public.order_status,
  p_description text default null
)
returns table (
  order_id uuid,
  order_public_number text,
  order_description text,
  order_status public.order_status,
  order_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_description text;
  v_updated public.orders%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not (
    (p_expected_status = 'ordered' and p_next_status in ('ordered', 'ready', 'cancelled'))
    or (p_expected_status = 'ready' and p_next_status = 'collected')
  ) then
    raise exception 'Invalid staff transition';
  end if;

  if p_expected_status <> 'ordered' and p_description is not null then
    raise exception 'Only ordered descriptions can be edited';
  end if;

  if p_description is not null then
    v_description := trim(p_description);
    if char_length(v_description) = 0 then
      raise exception 'Narudžba je prazna';
    end if;
    if char_length(v_description) > 500 then
      raise exception 'Narudžba može imati najviše 500 znakova';
    end if;
  end if;

  update public.orders as target
  set
    description = coalesce(v_description, target.description),
    status = p_next_status
  where target.id = p_order_id
    and target.status = p_expected_status
    and exists (
      select 1 from public.locations
      where locations.id = target.location_id
        and locations.owner_user_id = (select auth.uid())
    )
  returning target.* into v_updated;

  if not found then
    raise exception 'Order changed on another device or is unavailable';
  end if;

  return query select
    v_updated.id,
    v_updated.public_number,
    v_updated.description,
    v_updated.status,
    v_updated.updated_at;
end;
$$;

create or replace function public.track_order(p_tracking_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_location_name text;
  v_queue jsonb;
begin
  select orders.*
  into v_order
  from public.orders as orders
  where orders.tracking_token = p_tracking_token;

  if not found then
    return null;
  end if;

  select locations.display_name
  into v_location_name
  from public.locations as locations
  where locations.id = v_order.location_id;

  if v_order.status in ('ordered', 'ready') then
    select coalesce(jsonb_agg(to_jsonb(q) order by
      case when q.status = 'ready' then q.ready_at end asc nulls last,
      q.created_at asc,
      q.order_id asc
    ), '[]'::jsonb)
    into v_queue
    from public.public_queue as q
    where q.location_id = v_order.location_id;
  else
    v_queue := null;
  end if;

  return jsonb_build_object(
    'locationId', v_order.location_id,
    'locationName', v_location_name,
    'trackedOrderId', v_order.id,
    'publicNumber', v_order.public_number,
    'status', v_order.status,
    'createdAt', v_order.created_at,
    'readyAt', v_order.ready_at,
    'collectedAt', v_order.collected_at,
    'cancelledAt', v_order.cancelled_at,
    'expiredAt', v_order.expired_at,
    'queue', v_queue
  );
end;
$$;

create schema if not exists private;

create extension if not exists pg_cron;

create or replace function private.expire_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.orders
  set status = 'expired'
  where status in ('ordered', 'ready') and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.locations enable row level security;
alter table public.order_counters enable row level security;
alter table public.orders enable row level security;
alter table public.public_queue enable row level security;

create policy "Staff read own location"
on public.locations for select to authenticated
using (owner_user_id = (select auth.uid()));

create policy "Staff read own orders"
on public.orders for select to authenticated
using (
  exists (
    select 1 from public.locations
    where locations.id = orders.location_id
      and locations.owner_user_id = (select auth.uid())
  )
);

create policy "Public queue is anonymously readable"
on public.public_queue for select to anon, authenticated
using (true);

revoke all on public.locations from anon, authenticated;
revoke all on public.order_counters from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.public_queue from anon, authenticated;
grant select on public.locations to authenticated;
grant select on public.orders to authenticated;
grant select on public.public_queue to anon, authenticated;

revoke all on function public.create_order(text, uuid) from public, anon, authenticated;
revoke all on function public.update_order(uuid, public.order_status, public.order_status, text) from public, anon, authenticated;
revoke all on function public.track_order(uuid) from public, anon, authenticated;
grant execute on function public.create_order(text, uuid) to authenticated;
grant execute on function public.update_order(uuid, public.order_status, public.order_status, text) to authenticated;
grant execute on function public.track_order(uuid) to anon, authenticated;

revoke all on function private_sync_order_to_public_queue() from public, anon, authenticated;
revoke all on function private_guard_order_lifecycle() from public, anon, authenticated;
revoke all on function private.expire_orders() from public, anon, authenticated;

select cron.schedule(
  'expire-stale-orders',
  '*/5 * * * *',
  'select private.expire_orders()'
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'public_queue'
  ) then
    alter publication supabase_realtime add table public.public_queue;
  end if;
end;
$$;
