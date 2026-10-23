-- Myndir í spjalli (lokuð geymsla, aðeins aðilar samtals)

alter table public.messages
  add column image_path text,
  add column image_color text check (image_color ~ '^#[0-9a-f]{6}$');
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 2000 and (char_length(body) > 0 or image_path is not null));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']);

-- Slóð: {conversation_id}/{uuid}.webp
create function public.is_conversation_member(p_conversation text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id::text = p_conversation and auth.uid() in (c.buyer_id, c.seller_id)
  )
$$;

create policy "senda mynd í samtal" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images' and public.is_conversation_member((storage.foldername(name))[1]));
create policy "skoða myndir í samtali" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and public.is_conversation_member((storage.foldername(name))[1]));

-- Mynd á mynd: myndskeyti verður að vera í möppu samtalsins
drop policy "senda skilaboð" on public.messages;
create policy "senda skilaboð" on public.messages for insert
  with check (sender_id = auth.uid() and not public.is_banned(auth.uid())
    and (image_path is null or split_part(image_path, '/', 1) = conversation_id::text)
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
        and not public.has_blocked(case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end, auth.uid())
    ));

-- Forskoðun í samtalalista og texti í ýtitilkynningu þegar aðeins mynd er send
create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c
  set last_message_at = new.created_at,
      last_sender_id = new.sender_id,
      last_message_body = coalesce(nullif(left(new.body, 140), ''), '📷 Mynd'),
      buyer_last_read_at = case when c.buyer_id = new.sender_id then new.created_at else c.buyer_last_read_at end,
      seller_last_read_at = case when c.seller_id = new.sender_id then new.created_at else c.seller_last_read_at end
  where c.id = new.conversation_id;
  return new;
end $$;
revoke execute on function public.on_message_insert() from public, anon, authenticated;

create or replace function public.push_payload(p_secret text, p_kind text, p_id text) returns jsonb
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
           p.display_name, coalesce(nullif(left(m.body, 140), ''), 'Sendi mynd'), '/skilabod/' || c.id, 'samtal-' || c.id
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
