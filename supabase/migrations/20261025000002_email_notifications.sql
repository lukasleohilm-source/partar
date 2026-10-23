-- Tilkynningar í tölvupósti fyrir þá sem fá ekki ýtitilkynningar (t.d. iPhone án heimaskjás).
-- Póstur fer aðeins til notenda með netfang, sem eiga enga ýtiáskrift, og í mesta lagi
-- einn póstur á hvert samtal/efni á 30 mínútum svo spjall verði ekki að pósthríð.

alter table public.notification_prefs add column email boolean not null default true;

create table private.email_log (
  user_id uuid not null references public.profiles on delete cascade,
  tag text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, tag)
);

create function public.email_address(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select nullif(u.email, '') from auth.users u where u.id = p_user;
$$;
revoke execute on function public.email_address(uuid) from public, anon, authenticated;

create or replace function public.wants_push(p_user uuid, p_kind text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p_kind
      when 'message' then messages
      when 'wanted_match' then wanted
      when 'price_drop' then price_drop
      when 'review' then reviews
      when 'email' then email
      else true end
    from public.notification_prefs where user_id = p_user
  ), true);
$$;

create or replace function public.queue_push(p_user uuid, p_kind text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare
  c private.push_config;
begin
  if not public.wants_push(p_user, p_kind) then
    return;
  end if;
  if not exists (select 1 from public.push_subscriptions where user_id = p_user)
     and (public.email_address(p_user) is null or not public.wants_push(p_user, 'email')) then
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

-- Worker spyr hvort senda eigi póst. Skilar netfangi og skráir sendinguna, eða null.
create function public.claim_email(p_secret text, p_user uuid, p_tag text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if p_secret is distinct from (select secret from private.push_config) then
    raise exception 'forbidden';
  end if;
  v_email := public.email_address(p_user);
  if v_email is null or not public.wants_push(p_user, 'email')
     or exists (select 1 from public.push_subscriptions where user_id = p_user) then
    return null;
  end if;
  insert into private.email_log (user_id, tag) values (p_user, p_tag)
  on conflict (user_id, tag) do update set sent_at = now()
    where private.email_log.sent_at < now() - interval '30 minutes';
  if not found then
    return null;
  end if;
  return v_email;
end $$;
revoke execute on function public.claim_email(text, uuid, text) from public;
grant execute on function public.claim_email(text, uuid, text) to anon, authenticated;

-- push_payload skilar nú líka viðtakanda svo Worker geti spurt um póst
create or replace function public.push_payload(p_secret text, p_kind text, p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid;
  v_title text;
  v_body text;
  v_url text;
  v_tag text;
  v_parts text[];
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
    if coalesce(v_body, '') = '' then
      v_body := 'Sendi mynd';
    end if;
  elsif p_kind = 'wanted_match' then
    select n.user_id, 'Passar við ósk þína',
           l.title || ' · ' || public.format_isk(l.price_isk),
           '/auglysing/' || l.id, 'osk-' || n.wanted_id
      into v_user, v_title, v_body, v_url, v_tag
    from public.notifications n
    join public.listings l on l.id = n.listing_id
    where n.id = p_id::bigint;
  elsif p_kind = 'price_drop' then
    -- id = auglýsing:notandi:gamla verðið:nýja verðið
    v_parts := string_to_array(p_id, ':');
    select f.user_id, 'Verðið lækkaði',
           l.title || ' · ' || public.format_isk(v_parts[3]::int) || ' → ' || public.format_isk(v_parts[4]::int),
           '/auglysing/' || l.id, 'verd-' || l.id
      into v_user, v_title, v_body, v_url, v_tag
    from public.favorites f
    join public.listings l on l.id = f.listing_id
    where f.listing_id = v_parts[1]::uuid and f.user_id = v_parts[2]::uuid;
  elsif p_kind = 'review' then
    select r.seller_id, 'Ný umsögn: ' || repeat('★', r.stars) || repeat('☆', 5 - r.stars),
           coalesce(nullif(left(r.comment, 140), ''), p.display_name || ' gaf þér einkunn'),
           '/skilabod/' || r.conversation_id, 'umsogn-' || r.id
      into v_user, v_title, v_body, v_url, v_tag
    from public.reviews r
    join public.profiles p on p.id = r.reviewer_id
    where r.id = p_id::bigint;
  end if;

  if v_user is null then
    return null;
  end if;

  return jsonb_build_object(
    'user', v_user,
    'kind', p_kind,
    'message', jsonb_build_object('title', v_title, 'body', v_body, 'url', v_url, 'tag', v_tag),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = v_user
    ), '[]'::jsonb)
  );
end $$;
