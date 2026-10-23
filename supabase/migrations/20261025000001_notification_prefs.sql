-- Val um hvaða ýtitilkynningar notandi fær, og tvær nýjar tegundir:
-- verðlækkun á auglýsingu í uppáhaldi og ný umsögn um seljanda.

create table public.notification_prefs (
  user_id uuid primary key references public.profiles on delete cascade,
  messages boolean not null default true,
  wanted boolean not null default true,
  price_drop boolean not null default true,
  reviews boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "eigin stillingar" on public.notification_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.notification_prefs to authenticated;

-- Engin röð = allt kveikt
create function public.wants_push(p_user uuid, p_kind text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p_kind
      when 'message' then messages
      when 'wanted_match' then wanted
      when 'price_drop' then price_drop
      when 'review' then reviews
      else true end
    from public.notification_prefs where user_id = p_user
  ), true);
$$;
revoke execute on function public.wants_push(uuid, text) from public, anon, authenticated;

create or replace function public.queue_push(p_user uuid, p_kind text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare
  c private.push_config;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = p_user)
     or not public.wants_push(p_user, p_kind) then
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

-- Verð lækkar á virkri auglýsingu → allir sem eiga hana í uppáhaldi (nema seljandinn)
create function public.push_on_price_drop() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if new.status = 'active' and old.price_isk is not null and new.price_isk is not null
     and new.price_isk < old.price_isk then
    for v_user in
      select f.user_id from public.favorites f where f.listing_id = new.id and f.user_id <> new.seller_id
    loop
      perform public.queue_push(v_user, 'price_drop', new.id || ':' || v_user || ':' || old.price_isk || ':' || new.price_isk);
    end loop;
  end if;
  return new;
end $$;
revoke execute on function public.push_on_price_drop() from public, anon, authenticated;

create trigger listings_price_drop_push after update of price_isk on public.listings
  for each row execute function public.push_on_price_drop();

create function public.push_on_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.queue_push(new.seller_id, 'review', new.id::text);
  return new;
end $$;
revoke execute on function public.push_on_review() from public, anon, authenticated;

create trigger reviews_push after insert on public.reviews
  for each row execute function public.push_on_review();

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
    'message', jsonb_build_object('title', v_title, 'body', v_body, 'url', v_url, 'tag', v_tag),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subscriptions s where s.user_id = v_user
    ), '[]'::jsonb)
  );
end $$;

create function public.format_isk(p int) returns text
language sql immutable set search_path = public as $$
  select case when p is null then 'Tilboð'
              when p = 0 then 'Gefins'
              else replace(to_char(p, 'FM999,999,999'), ',', '.') || ' kr.' end;
$$;
