-- Leit eftir mörgum stöðum í einu (eins og á mbl fasteignum): p_places er listi af
-- landshlutum (t.d. 'sudurnes') og/eða póstnúmerum (t.d. '210'). Auglýsing passar ef
-- landshluti hennar eða póstnúmer er á listanum. Annað er óbreytt frá 20261024000004.

drop function public.search_listings(text, public.listing_kind, int, int, int, int, int, int, public.item_condition[], public.region, text, int, int, text, int);

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
  p_offset int default 0,
  p_near text default null,       -- póstnúmer notanda
  p_max_km int default null,      -- hámarksfjarlægð
  p_places text[] default null    -- landshlutar og/eða póstnúmer
) returns setof public.listings
language sql stable as $$
  with me as (select lat, lng from public.postal_codes where code = p_near)
  select l.*
  from public.listings l
  left join me on true
  cross join lateral public.listing_coords(l.postal_code, l.region) c
  where l.status = 'active'
    and public.search_matches(l.search_text, q)
    and (p_kind is null or l.kind = p_kind)
    and (p_category is null or l.category_id = p_category
         or l.category_id in (select cat.id from public.categories cat where cat.parent_id = p_category))
    and (p_min_price is null or l.price_isk >= p_min_price)
    and (p_max_price is null or l.price_isk <= p_max_price)
    and (p_conditions is null or l.condition = any (p_conditions))
    and (p_region is null or l.region = p_region)
    and (p_places is null or cardinality(p_places) = 0
         or l.region::text = any (p_places) or l.postal_code = any (p_places))
    and public.listing_fits(l.id, p_make, p_model, p_year)
    and not public.has_blocked(auth.uid(), l.seller_id)
    and (p_max_km is null or me.lat is null or public.distance_km(me.lat, me.lng, c.lat, c.lng) <= p_max_km)
  order by
    case when p_sort = 'price_asc' then l.price_isk end asc nulls last,
    case when p_sort = 'price_desc' then l.price_isk end desc nulls last,
    case when p_sort = 'distance' and me.lat is not null then public.distance_km(me.lat, me.lng, c.lat, c.lng) end asc nulls last,
    case when coalesce(trim(q), '') <> '' and public.fold(l.title) like '%' || public.fold(trim(q)) || '%' then 0 else 1 end,
    l.sort_at desc
  limit least(p_limit, 100) offset p_offset
$$;
