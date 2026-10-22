-- Partar: föll og triggerar

-- updated_at
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- Prófíll búinn til sjálfkrafa við nýskráningu (nafn = hluti netfangs fyrir @)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(split_part(coalesce(new.email, 'notandi'), '@', 1), 60));
  insert into public.profile_contacts (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- published_at sett þegar auglýsing er birt í fyrsta sinn
create function public.set_published_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger listings_published before insert or update of status on public.listings
  for each row execute function public.set_published_at();

-- Passar auglýsing í tiltekinn bíl?
create function public.listing_fits(p_listing uuid, p_make int, p_model int, p_year int)
returns boolean language sql stable as $$
  select p_make is null
    or exists (select 1 from public.listings l where l.id = p_listing and l.universal_fit)
    or exists (
      select 1 from public.listing_fitments f
      where f.listing_id = p_listing
        and f.make_id = p_make
        and (p_model is null or f.model_id is null or f.model_id = p_model)
        and (p_year is null or (
          (f.year_from is null or f.year_from <= p_year) and
          (f.year_to is null or f.year_to >= p_year)))
    )
$$;

-- Passar texti við auglýsingu? (orð, hlutstrengur eða líkindi)
create function public.text_matches(p_search tsvector, p_title text, p_q text)
returns boolean language sql stable set search_path = public, extensions as $$
  select coalesce(trim(p_q), '') = ''
    or p_search @@ websearch_to_tsquery('simple', p_q)
    or p_title ilike '%' || trim(p_q) || '%'
    or word_similarity(lower(p_q), lower(p_title)) > 0.6
$$;

-- Leit með síum. security invoker: RLS gildir.
create function public.search_listings(
  q text default null,
  p_kind public.listing_kind default null,
  p_category int default null,
  p_make int default null,
  p_model int default null,
  p_year int default null,
  p_min_price int default null,
  p_max_price int default null,
  p_conditions public.item_condition[] default null,
  p_region public.region default null,
  p_sort text default 'newest',
  p_limit int default 24,
  p_offset int default 0
) returns setof public.listings
language sql stable as $$
  select l.*
  from public.listings l
  where l.status = 'active'
    and public.text_matches(l.search, l.title, q)
    and (p_kind is null or l.kind = p_kind)
    and (p_category is null or l.category_id = p_category
         or l.category_id in (select c.id from public.categories c where c.parent_id = p_category))
    and (p_min_price is null or l.price_isk >= p_min_price)
    and (p_max_price is null or l.price_isk <= p_max_price)
    and (p_conditions is null or l.condition = any (p_conditions))
    and (p_region is null or l.region = p_region)
    and public.listing_fits(l.id, p_make, p_model, p_year)
  order by
    case when p_sort = 'price_asc' then l.price_isk end asc nulls last,
    case when p_sort = 'price_desc' then l.price_isk end desc nulls last,
    l.published_at desc
  limit least(p_limit, 100) offset p_offset
$$;

-- „Óska eftir“: þegar auglýsing verður virk fá eigendur samsvarandi óska tilkynningu.
-- Auglýsing er fyrst vistuð sem draft og birt eftir að fitments eru komin inn.
create function public.match_wanted() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  insert into public.notifications (user_id, type, listing_id, wanted_id)
  select w.user_id, 'wanted_match', new.id, w.id
  from public.wanted_requests w
  where w.active
    and w.user_id <> new.seller_id
    and (w.kind is null or w.kind = new.kind)
    and (w.category_id is null or w.category_id = new.category_id
         or exists (select 1 from public.categories c
                    where c.id = new.category_id and c.parent_id = w.category_id))
    and (w.max_price_isk is null or (new.price_isk is not null and new.price_isk <= w.max_price_isk))
    and (w.region is null or w.region = new.region)
    and public.listing_fits(new.id, w.make_id, w.model_id, w.year)
    and public.text_matches(new.search, new.title, w.query)
  on conflict (wanted_id, listing_id) do nothing;

  return new;
end $$;

create trigger listings_match_wanted after insert or update of status on public.listings
  for each row execute function public.match_wanted();

-- Uppfæra samtal þegar skilaboð berast
create function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c
  set last_message_at = new.created_at,
      last_sender_id = new.sender_id,
      buyer_last_read_at = case when c.buyer_id = new.sender_id then new.created_at else c.buyer_last_read_at end,
      seller_last_read_at = case when c.seller_id = new.sender_id then new.created_at else c.seller_last_read_at end
  where c.id = new.conversation_id;
  return new;
end $$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

-- Merkja samtal lesið (aðeins eigin lestrartími)
create function public.mark_conversation_read(p_conversation uuid) returns void
language sql security definer set search_path = public as $$
  update public.conversations
  set buyer_last_read_at = case when buyer_id = auth.uid() then now() else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = auth.uid() then now() else seller_last_read_at end
  where id = p_conversation and auth.uid() in (buyer_id, seller_id)
$$;

-- Fjöldi ólesinna samtala og tilkynninga (fyrir merki í valmynd)
create function public.my_unread_counts(out conversations int, out notifications int)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.conversations c
      where c.last_message_at is not null and c.last_sender_id <> auth.uid()
        and ((c.buyer_id = auth.uid() and c.last_message_at > coalesce(c.buyer_last_read_at, '-infinity'))
          or (c.seller_id = auth.uid() and c.last_message_at > coalesce(c.seller_last_read_at, '-infinity')))),
    (select count(*)::int from public.notifications n
      where n.user_id = auth.uid() and n.read_at is null)
$$;

-- Hefja (eða sækja) samtal um auglýsingu
create function public.start_conversation(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_seller uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select seller_id into v_seller from public.listings where id = p_listing and status = 'active';
  if v_seller is null then
    raise exception 'listing_not_found';
  end if;
  if v_seller = auth.uid() then
    raise exception 'own_listing';
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing, auth.uid(), v_seller)
  on conflict (listing_id, buyer_id) do nothing;

  select id into v_id from public.conversations where listing_id = p_listing and buyer_id = auth.uid();
  return v_id;
end $$;

revoke execute on function public.match_wanted() from public, anon, authenticated;
revoke execute on function public.on_message_insert() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.start_conversation(uuid) from public, anon;
revoke execute on function public.my_unread_counts() from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.my_unread_counts() to authenticated;
