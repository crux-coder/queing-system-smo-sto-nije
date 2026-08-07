alter table public.locations
add column image_path text,
add constraint locations_image_path_format check (
  image_path is null
  or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'location-images',
  'location-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Location owners upload their images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'location-images'
  and exists (
    select 1
    from public.locations
    where locations.owner_user_id = (select auth.uid())
      and locations.id::text = (storage.foldername(name))[1]
  )
);

create policy "Location owners delete their images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'location-images'
  and exists (
    select 1
    from public.locations
    where locations.owner_user_id = (select auth.uid())
      and locations.id::text = (storage.foldername(name))[1]
  )
);

create or replace function public.set_location_image(p_image_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select locations.id
  into v_location_id
  from public.locations as locations
  where locations.owner_user_id = (select auth.uid());

  if v_location_id is null then
    raise exception 'No location is provisioned for this account';
  end if;

  if p_image_path !~ ('^' || v_location_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    raise exception 'Invalid location image path';
  end if;

  update public.locations
  set image_path = p_image_path,
      updated_at = now()
  where id = v_location_id;

  return p_image_path;
end;
$$;

revoke all on function public.set_location_image(text) from public, anon, authenticated;
grant execute on function public.set_location_image(text) to authenticated;

create or replace function public.track_order(p_tracking_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_location_name text;
  v_location_image_path text;
  v_queue jsonb;
begin
  select orders.*
  into v_order
  from public.orders as orders
  where orders.tracking_token = p_tracking_token;

  if not found then
    return null;
  end if;

  select locations.display_name, locations.image_path
  into v_location_name, v_location_image_path
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
    'locationImagePath', v_location_image_path,
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
