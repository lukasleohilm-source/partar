-- Ýtitilkynningar (Web Push)
--
-- Flæði: trigger á messages/notifications → net.http_post (pg_net) á /api/push á Worker
-- með leyndarlykli → Worker kallar á push_payload() með sama lykli, fær áskriftir og texta,
-- og sendir Web Push. Lykillinn er búinn til hér í gagnagrunninum og fer aldrei í git;
-- Worker þarf aldrei að vita hann fyrirfram, aðeins senda hann áfram.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.push_config (
  id boolean primary key default true check (id),
  endpoint text not null,
  secret text not null
);
-- gen_random_uuid() notar dulmálslega örugga slembitölu
insert into private.push_config (endpoint, secret)
values ('https://partar.lukels255.com/api/push',
        replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "eigin áskriftir" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "eyða eigin áskrift" on public.push_subscriptions for delete using (user_id = auth.uid());

-- Vista áskrift tækis. Ef tækið var áður skráð á annan notanda færist hún yfir.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- Sendir beiðni á Worker ef viðtakandi á einhverja áskrift
create function public.queue_push(p_user uuid, p_kind text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare
  c private.push_config;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = p_user) then
    return;
  end if;
  select * into c from private.push_config;
  if c is null or to_regnamespace('net') is null then
    return;
  end if;
  perform net.http_post(
    url := c.endpoint,
    body := jsonb_build_object('kind', p_kind, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-partar-secret', c.secret),
    timeout_milliseconds := 5000
  );
end $$;
revoke execute on function public.queue_push(uuid, text, text) from public, anon, authenticated;

create function public.push_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_recipient uuid;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end
    into v_recipient
  from public.conversations c where c.id = new.conversation_id;
  perform public.queue_push(v_recipient, 'message', new.id::text);
  return new;
end $$;
revoke execute on function public.push_on_message() from public, anon, authenticated;

create trigger messages_push after insert on public.messages
  for each row execute function public.push_on_message();

create function public.push_on_notification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.queue_push(new.user_id, 'wanted_match', new.id::text);
  return new;
end $$;
revoke execute on function public.push_on_notification() from public, anon, authenticated;

create trigger notifications_push after insert on public.notifications
  for each row execute function public.push_on_notification();

-- Worker sækir áskriftir og texta. Leyndarlykillinn er eina auðkenningin.
create function public.push_payload(p_secret text, p_kind text, p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid;
  v_title text;
  v_body text;
  v_url text;
  v_tag text;
begin
  if p_secret is distinct from (select secret from private.push_config) then
    raise exception 'forbidden';
  end if;

  if p_kind = 'message' then
    select case when c.buyer_id = m.sender_id then c.seller_id else c.buyer_id end,
           p.display_name, left(m.body, 140), '/skilabod/' || c.id, 'samtal-' || c.id
      into v_user, v_title, v_body, v_url, v_tag
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    join public.profiles p on p.id = m.sender_id
    where m.id = p_id::bigint;
  elsif p_kind = 'wanted_match' then
    select n.user_id, 'Passar við ósk þína',
           l.title || ' · ' || case when l.price_isk is null then 'Tilboð'
                                    when l.price_isk = 0 then 'Gefins'
                                    else replace(to_char(l.price_isk, 'FM999,999,999'), ',', '.') || ' kr.' end,
           '/auglysing/' || l.id, 'osk-' || n.wanted_id
      into v_user, v_title, v_body, v_url, v_tag
    from public.notifications n
    join public.listings l on l.id = n.listing_id
    where n.id = p_id::bigint;
  end if;

  if v_user is null then
    return null;
  end if;

  return jsonb_build_object(
    'message', jsonb_build_object('title', v_title, 'body', v_body, 'url', v_url, 'tag', v_tag),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = v_user
    ), '[]'::jsonb)
  );
end $$;
revoke execute on function public.push_payload(text, text, text) from public;
grant execute on function public.push_payload(text, text, text) to anon, authenticated;

-- Worker fjarlægir áskriftir sem push-þjónustan segir útrunnar (404/410)
create function public.remove_push_subscription(p_secret text, p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from (select secret from private.push_config) then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end $$;
revoke execute on function public.remove_push_subscription(text, text) from public;
grant execute on function public.remove_push_subscription(text, text) to anon, authenticated;
