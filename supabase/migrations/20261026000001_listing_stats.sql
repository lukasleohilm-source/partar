-- Tölfræði fyrir seljendur: hve oft auglýsing hefur verið skoðuð, hve margir eiga hana
-- í uppáhaldi og hve mörg samtöl hafa hafist. Skoðanir seljandans sjálfs teljast ekki.

alter table public.listings add column view_count int not null default 0;

-- Kallað þegar auglýsing er opnuð (vafrinn telur hverja auglýsingu einu sinni á sólarhring)
create function public.record_view(p_listing uuid) returns void
language sql security definer set search_path = public as $$
  update public.listings
     set view_count = view_count + 1
   where id = p_listing
     and status = 'active'
     and seller_id is distinct from auth.uid();
$$;
revoke execute on function public.record_view(uuid) from public;
grant execute on function public.record_view(uuid) to anon, authenticated;

-- Aðeins fyrir eigin auglýsingar (uppáhalds annarra eru annars einkamál)
create function public.my_listing_stats()
returns table (listing_id uuid, views int, favorites int, chats int)
language sql stable security definer set search_path = public as $$
  select l.id,
         l.view_count,
         (select count(*)::int from public.favorites f where f.listing_id = l.id),
         (select count(*)::int from public.conversations c where c.listing_id = l.id)
    from public.listings l
   where l.seller_id = auth.uid();
$$;
revoke execute on function public.my_listing_stats() from public, anon;
grant execute on function public.my_listing_stats() to authenticated;
