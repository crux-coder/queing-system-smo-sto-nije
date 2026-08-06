begin;
select plan(13);

select is(
  (select schedule from cron.job where jobname = 'expire-stale-orders'),
  '*/5 * * * *',
  'active-order expiry is scheduled every five minutes'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'location-one@example.test', '',
    now(), now(), now(), '{}'::jsonb, '{}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'location-two@example.test', '',
    now(), now(), now(), '{}'::jsonb, '{}'::jsonb
  );

insert into public.locations (id, owner_user_id, display_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Lokacija jedan'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Lokacija dva');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$select * from public.create_order('  Prva narudžba  ', '33333333-3333-4333-8333-333333333333')$$,
  'an authenticated location can create an order'
);

select lives_ok(
  $$select * from public.create_order('Prva narudžba', '33333333-3333-4333-8333-333333333333')$$,
  'retrying the same idempotency key succeeds'
);

select is(
  (select count(*)::integer from public.orders where idempotency_key = '33333333-3333-4333-8333-333333333333'),
  1,
  'idempotent retry creates no duplicate order'
);

select is(
  (select last_value::integer from public.order_counters where location_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1,
  'idempotent retry consumes no additional daily number'
);

select matches(
  (select public_number from public.orders where idempotency_key = '33333333-3333-4333-8333-333333333333'),
  '^[A-G]-001$',
  'the first daily number has the UTC weekday prefix and minimum padding'
);

select lives_ok(
  $$select * from public.update_order(
    (select id from public.orders where idempotency_key = '33333333-3333-4333-8333-333333333333'),
    'ordered', 'ready', 'Ispravljena narudžba'
  )$$,
  'ordered work can be edited and marked ready atomically'
);

select ok(
  (select status = 'ready' and ready_at is not null and description = 'Ispravljena narudžba'
   from public.orders where idempotency_key = '33333333-3333-4333-8333-333333333333'),
  'ready transition retains the edited text and lifecycle timestamp'
);

set local "request.jwt.claims" = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*)::integer from public.orders where location_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0,
  'staff cannot read another location orders'
);

set local "request.jwt.claims" = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$select * from public.update_order(
    (select id from public.orders where idempotency_key = '33333333-3333-4333-8333-333333333333'),
    'ready', 'collected', null
  )$$,
  'ready work can be collected'
);

select ok(
  (select collected_at is not null
      and (public.track_order(tracking_token)->'queue') = 'null'::jsonb
   from public.orders where idempotency_key = '33333333-3333-4333-8333-333333333333'),
  'collection records its timestamp and terminal tracking hides the live queue'
);

select lives_ok(
  $$select * from public.create_order('Zaboravljena narudžba', '44444444-4444-4444-8444-444444444444')$$,
  'a second active order can be created'
);

reset role;
update public.orders
set expires_at = now() - interval '1 second'
where idempotency_key = '44444444-4444-4444-8444-444444444444';

with expiration as materialized (
  select private.expire_orders() as expired_count
)
select ok(
  (select expired_count = 1 from expiration)
    and exists (
      select 1 from public.orders
      where idempotency_key = '44444444-4444-4444-8444-444444444444'
        and status = 'expired'
        and expired_at is not null
    )
    and not exists (
      select 1 from public.public_queue
      where order_id = (
        select id from public.orders
        where idempotency_key = '44444444-4444-4444-8444-444444444444'
      )
    ),
  'scheduled expiry records its terminal state and removes public queue data'
);

select * from finish();
rollback;
