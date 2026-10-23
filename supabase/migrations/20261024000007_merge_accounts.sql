-- Sameina gestaaðgang við aðgang sem er þegar til (t.d. Google-aðgangur með sama netfangi).
--
-- 1. Gesturinn kallar á create_merge_token() og fær einnota lykil (gildir í 15 mín.).
-- 2. Hann skráir sig inn á hinn aðganginn og kallar á claim_merge_token(lykill).
-- 3. Allt sem gesturinn átti flyst yfir og gestaaðganginum er eytt.
-- Aðeins sá sem hafði gestalotuna getur búið til lykilinn, svo ekki er hægt að taka gögn annarra.

create table private.merge_tokens (
  token text primary key,
  guest_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null
);

create function public.create_merge_token() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'not_guest';
  end if;
  delete from private.merge_tokens where guest_id = auth.uid() or expires_at < now();
  insert into private.merge_tokens (token, guest_id, expires_at) values (v_token, auth.uid(), now() + interval '15 minutes');
  return v_token;
end $$;

create function public.claim_merge_token(p_token text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_new uuid := auth.uid();
  v_guest uuid;
  v_listings int;
  c record;
  v_existing uuid;
begin
  if v_new is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'not_signed_in';
  end if;
  delete from private.merge_tokens where token = p_token and expires_at > now() returning guest_id into v_guest;
  if v_guest is null then
    raise exception 'invalid_token';
  end if;
  if v_guest = v_new then
    return 0;
  end if;

  -- Auglýsingar
  update public.listings set seller_id = v_new where seller_id = v_guest;
  get diagnostics v_listings = row_count;

  -- Samtöl þar sem gesturinn var kaupandi: sameina ef nýi notandinn á þegar samtal um sömu auglýsingu
  for c in select * from public.conversations where buyer_id = v_guest loop
    select id into v_existing from public.conversations where listing_id = c.listing_id and buyer_id = v_new;
    if v_existing is not null then
      update public.messages set conversation_id = v_existing where conversation_id = c.id;
      delete from public.conversations where id = c.id;
    elsif c.seller_id = v_new then
      delete from public.conversations where id = c.id; -- samtal við sjálfan sig
    else
      update public.conversations set buyer_id = v_new where id = c.id;
    end if;
  end loop;
  -- Samtöl þar sem gesturinn var seljandi (auglýsingin er þegar flutt)
  delete from public.conversations where seller_id = v_guest and buyer_id = v_new;
  update public.conversations set seller_id = v_new where seller_id = v_guest;
  update public.conversations set last_sender_id = v_new where last_sender_id = v_guest;
  update public.messages set sender_id = v_new where sender_id = v_guest;

  -- Óskir, tilkynningar, ýtiáskriftir, bílar
  update public.wanted_requests set user_id = v_new where user_id = v_guest;
  update public.notifications set user_id = v_new where user_id = v_guest;
  update public.push_subscriptions set user_id = v_new where user_id = v_guest;
  update public.user_vehicles set user_id = v_new where user_id = v_guest;

  -- Tengitöflur með einkvæmum lyklum: afrita án tvítekninga (rest fer með cascade)
  insert into public.favorites (user_id, listing_id, created_at)
    select v_new, listing_id, created_at from public.favorites where user_id = v_guest
    on conflict do nothing;
  insert into public.blocks (blocker_id, blocked_id, created_at)
    select v_new, blocked_id, created_at from public.blocks where blocker_id = v_guest and blocked_id <> v_new
    on conflict do nothing;
  update public.reports r set reporter_id = v_new
    where reporter_id = v_guest and not exists (select 1 from public.reports x where x.listing_id = r.listing_id and x.reporter_id = v_new);
  update public.reviews r set reviewer_id = v_new
    where reviewer_id = v_guest and not exists (select 1 from public.reviews x where x.conversation_id = r.conversation_id and x.reviewer_id = v_new);
  update public.reviews set seller_id = v_new where seller_id = v_guest;

  -- Stjórnandaréttindi
  insert into public.admins (user_id) select v_new from public.admins where user_id = v_guest on conflict do nothing;

  -- Prófíll: halda nafni, landshluta og síma gestsins ef nýi aðgangurinn hefur sjálfgefin gildi
  update public.profiles n set
    display_name = case when n.display_name ~ '^Notandi [0-9a-f]{4}$' or n.display_name = split_part(u.email, '@', 1) then g.display_name else n.display_name end,
    region = coalesce(n.region, g.region)
  from public.profiles g, auth.users u
  where n.id = v_new and g.id = v_guest and u.id = v_new and g.display_name !~ '^Notandi [0-9a-f]{4}$';
  update public.profile_contacts n set phone = g.phone, show_phone = g.show_phone
  from public.profile_contacts g
  where n.id = v_new and g.id = v_guest and n.phone is null and g.phone is not null;

  delete from auth.users where id = v_guest;
  return v_listings;
end $$;

revoke execute on function public.create_merge_token() from public, anon;
revoke execute on function public.claim_merge_token(text) from public, anon;
grant execute on function public.create_merge_token() to authenticated;
grant execute on function public.claim_merge_token(text) to authenticated;

-- Myndir fluttra auglýsinga eru í möppu gestsins; eigandi auglýsingar má lesa og eyða þeim
create policy "eigandi auglýsingar les myndir" on storage.objects for select to authenticated
  using (bucket_id = 'listing-images' and exists (
    select 1 from public.listing_images li join public.listings l on l.id = li.listing_id
    where (li.path = name or li.thumb_path = name) and l.seller_id = auth.uid()));
create policy "eigandi auglýsingar eyðir myndum" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and exists (
    select 1 from public.listing_images li join public.listings l on l.id = li.listing_id
    where (li.path = name or li.thumb_path = name) and l.seller_id = auth.uid()));
