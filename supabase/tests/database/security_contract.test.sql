begin;
select plan(12);

select has_table('public', 'locations', 'locations exists');
select has_table('public', 'orders', 'private orders exist');
select has_table('public', 'public_queue', 'sanitized public queue exists');
select has_function('public', 'create_order', array['text', 'uuid'], 'atomic create RPC exists');
select has_function('public', 'update_order', array['uuid', 'order_status', 'order_status', 'text'], 'conditional update RPC exists');
select has_function('public', 'track_order', array['uuid'], 'token tracking RPC exists');

select ok(not has_table_privilege('anon', 'public.orders', 'select'), 'anon cannot read private orders');
select ok(not has_table_privilege('anon', 'public.orders', 'insert'), 'anon cannot insert orders');
select ok(not has_table_privilege('anon', 'public.orders', 'update'), 'anon cannot update orders');
select ok(not has_table_privilege('anon', 'public.orders', 'delete'), 'anon cannot delete orders');
select ok(has_table_privilege('anon', 'public.public_queue', 'select'), 'anon can read only the sanitized queue');
select is(
  (
    select array_agg(column_name order by ordinal_position)::text
    from information_schema.columns
    where table_schema = 'public' and table_name = 'public_queue'
  ),
  '{order_id,location_id,public_number,status,created_at,ready_at}',
  'anonymous queue contains only public-safe fields'
);

select * from finish();
rollback;
