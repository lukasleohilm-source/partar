-- Uppáhalds, „Ýta upp“, einkunnir seljenda og fjarlægð (póstnúmer)

-- ===== Uppáhalds =====
create table public.favorites (
  user_id uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index on public.favorites (listing_id);
alter table public.favorites enable row level security;
create policy "eigin uppáhalds" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== Ýta upp =====
alter table public.listings add column bumped_at timestamptz;
-- Röðunartími: nýjast af birtingu og síðustu „ýtingu“
alter table public.listings
  add column sort_at timestamptz generated always as (greatest(published_at, bumped_at)) stored;
create index on public.listings (status, sort_at desc);

-- Seljandi má ýta auglýsingu upp einu sinni á 7 dögum
create function public.bump_listing(p_listing uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_next timestamptz;
begin
  select greatest(coalesce(bumped_at, published_at), published_at) + interval '7 days' into v_next
  from public.listings
  where id = p_listing and seller_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'not_allowed';
  end if;
  if v_next > now() then
    raise exception 'too_soon' using detail = v_next::text;
  end if;
  update public.listings set bumped_at = now() where id = p_listing;
  return now();
end $$;
revoke execute on function public.bump_listing(uuid) from public, anon;
grant execute on function public.bump_listing(uuid) to authenticated;

-- ===== Einkunnir seljenda =====
create table public.reviews (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations on delete cascade,
  reviewer_id uuid not null references public.profiles on delete cascade,
  seller_id uuid not null references public.profiles on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (conversation_id, reviewer_id)
);
create index on public.reviews (seller_id, created_at desc);
alter table public.reviews enable row level security;
create policy "lesa einkunnir" on public.reviews for select using (true);
-- Aðeins kaupandi í samtali þar sem seljandinn hefur svarað getur gefið einkunn
create policy "gefa einkunn" on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.buyer_id = auth.uid() and c.seller_id = reviews.seller_id
        and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_id = c.seller_id)
    )
  );
create policy "breyta eigin einkunn" on public.reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

create function public.seller_rating(p_seller uuid, out average numeric, out total int)
language sql stable set search_path = public as $$
  select round(avg(stars)::numeric, 1), count(*)::int from public.reviews where seller_id = p_seller
$$;

-- ===== Póstnúmer og fjarlægð =====
create table public.postal_codes (
  code text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null
);
alter table public.postal_codes enable row level security;
create policy "lesa póstnúmer" on public.postal_codes for select using (true);

-- Hnit auglýsingar: póstnúmer ef það er þekkt, annars miðja landshlutans
create function public.listing_coords(p_postal text, p_region public.region, out lat double precision, out lng double precision)
language sql stable set search_path = public as $$
  select coalesce(p.lat, r.lat), coalesce(p.lng, r.lng)
  from (values
    ('hofudborgarsvaedid'::public.region, 64.12, -21.88), ('sudurnes', 63.99, -22.55),
    ('vesturland', 64.6, -22.0), ('vestfirdir', 65.9, -23.2), ('nordurland_vestra', 65.7, -19.9),
    ('nordurland_eystra', 65.75, -17.8), ('austurland', 65.15, -14.3), ('sudurland', 63.95, -20.6)
  ) r(region, lat, lng)
  left join public.postal_codes p on p.code = p_postal
  where r.region = p_region
$$;

-- Fjarlægð í km (haversine)
create function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Leit: röðun eftir sort_at (ýtt upp) og fjarlægð frá póstnúmeri notanda
drop function public.search_listings(text, public.listing_kind, int, int, int, int, int, int, public.item_condition[], public.region, text, int, int);
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
  p_max_km int default null       -- hámarksfjarlægð
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

-- Póstnúmer (búið til með scripts/gen-postal-sql.mjs)
insert into public.postal_codes (code, name, lat, lng) values
  ('101', 'Reykjavík', 64.147, -21.94),
  ('102', 'Reykjavík', 64.13, -21.94),
  ('103', 'Reykjavík', 64.13, -21.89),
  ('104', 'Reykjavík', 64.14, -21.88),
  ('105', 'Reykjavík', 64.135, -21.9),
  ('107', 'Reykjavík', 64.145, -21.97),
  ('108', 'Reykjavík', 64.13, -21.87),
  ('109', 'Reykjavík', 64.105, -21.85),
  ('110', 'Reykjavík', 64.115, -21.79),
  ('111', 'Reykjavík', 64.1, -21.83),
  ('112', 'Reykjavík', 64.14, -21.79),
  ('113', 'Reykjavík', 64.12, -21.75),
  ('116', 'Kjalarnes', 64.22, -21.75),
  ('170', 'Seltjarnarnes', 64.153, -21.995),
  ('190', 'Vogar', 63.98, -22.38),
  ('200', 'Kópavogur', 64.11, -21.91),
  ('201', 'Kópavogur', 64.1, -21.89),
  ('203', 'Kópavogur', 64.09, -21.85),
  ('210', 'Garðabær', 64.088, -21.92),
  ('220', 'Hafnarfjörður', 64.067, -21.957),
  ('221', 'Hafnarfjörður', 64.06, -21.98),
  ('225', 'Álftanes', 64.1, -22.0),
  ('230', 'Reykjanesbær', 64.002, -22.56),
  ('232', 'Reykjanesbær', 64.0, -22.55),
  ('233', 'Reykjanesbær', 63.99, -22.6),
  ('235', 'Keflavíkurflugvöllur', 63.98, -22.6),
  ('240', 'Grindavík', 63.84, -22.43),
  ('245', 'Sandgerði', 64.04, -22.71),
  ('250', 'Garður', 64.07, -22.65),
  ('260', 'Njarðvík', 63.98, -22.53),
  ('270', 'Mosfellsbær', 64.167, -21.7),
  ('271', 'Mosfellsbær', 64.17, -21.65),
  ('276', 'Mosfellsbær', 64.2, -21.5),
  ('300', 'Akranes', 64.32, -22.07),
  ('301', 'Akranes', 64.35, -21.95),
  ('310', 'Borgarnes', 64.54, -21.92),
  ('311', 'Borgarnes', 64.6, -21.8),
  ('320', 'Reykholt', 64.66, -21.29),
  ('340', 'Stykkishólmur', 65.075, -22.73),
  ('345', 'Flatey', 65.37, -22.92),
  ('350', 'Grundarfjörður', 64.92, -23.25),
  ('355', 'Ólafsvík', 64.89, -23.71),
  ('356', 'Snæfellsbær', 64.83, -23.5),
  ('360', 'Hellissandur', 64.91, -23.86),
  ('370', 'Búðardalur', 65.11, -21.77),
  ('371', 'Búðardalur', 65.2, -21.6),
  ('380', 'Reykhólar', 65.45, -22.2),
  ('400', 'Ísafjörður', 66.075, -23.13),
  ('401', 'Ísafjörður', 66.05, -23.2),
  ('410', 'Hnífsdalur', 66.11, -23.13),
  ('415', 'Bolungarvík', 66.16, -23.25),
  ('420', 'Súðavík', 66.03, -22.99),
  ('425', 'Flateyri', 66.05, -23.51),
  ('430', 'Suðureyri', 66.13, -23.53),
  ('450', 'Patreksfjörður', 65.6, -23.99),
  ('451', 'Patreksfjörður', 65.55, -23.8),
  ('460', 'Tálknafjörður', 65.62, -23.82),
  ('465', 'Bíldudalur', 65.69, -23.6),
  ('470', 'Þingeyri', 65.88, -23.49),
  ('471', 'Þingeyri', 65.85, -23.4),
  ('500', 'Staður', 65.2, -21.1),
  ('510', 'Hólmavík', 65.71, -21.68),
  ('512', 'Hólmavík', 65.75, -21.5),
  ('520', 'Drangsnes', 65.69, -21.45),
  ('524', 'Árneshreppur', 66.03, -21.45),
  ('530', 'Hvammstangi', 65.4, -20.94),
  ('531', 'Hvammstangi', 65.35, -20.8),
  ('540', 'Blönduós', 65.66, -20.29),
  ('541', 'Blönduós', 65.6, -20.1),
  ('545', 'Skagaströnd', 65.83, -20.32),
  ('550', 'Sauðárkrókur', 65.75, -19.64),
  ('551', 'Sauðárkrókur', 65.7, -19.5),
  ('560', 'Varmahlíð', 65.55, -19.45),
  ('565', 'Hofsós', 65.9, -19.41),
  ('566', 'Hofsós', 65.85, -19.35),
  ('570', 'Fljót', 66.0, -19.1),
  ('580', 'Siglufjörður', 66.15, -18.91),
  ('600', 'Akureyri', 65.68, -18.09),
  ('601', 'Akureyri', 65.7, -18.2),
  ('603', 'Akureyri', 65.7, -18.11),
  ('607', 'Akureyri', 65.67, -18.1),
  ('610', 'Grenivík', 65.95, -18.18),
  ('611', 'Grímsey', 66.54, -18.0),
  ('620', 'Dalvík', 65.97, -18.53),
  ('621', 'Dalvík', 65.95, -18.45),
  ('625', 'Ólafsfjörður', 66.07, -18.65),
  ('630', 'Hrísey', 66.0, -18.38),
  ('640', 'Húsavík', 66.04, -17.34),
  ('641', 'Húsavík', 66.0, -17.2),
  ('645', 'Fosshóll', 65.7, -17.55),
  ('650', 'Laugar', 65.72, -17.37),
  ('660', 'Mývatn', 65.64, -16.91),
  ('670', 'Kópasker', 66.3, -16.45),
  ('671', 'Kópasker', 66.2, -16.4),
  ('675', 'Raufarhöfn', 66.45, -15.95),
  ('680', 'Þórshöfn', 66.2, -15.33),
  ('681', 'Þórshöfn', 66.15, -15.4),
  ('685', 'Bakkafjörður', 66.03, -14.8),
  ('690', 'Vopnafjörður', 65.76, -14.83),
  ('700', 'Egilsstaðir', 65.265, -14.4),
  ('701', 'Egilsstaðir', 65.3, -14.5),
  ('710', 'Seyðisfjörður', 65.26, -14.01),
  ('715', 'Mjóifjörður', 65.2, -13.8),
  ('720', 'Borgarfjörður eystri', 65.53, -13.81),
  ('730', 'Reyðarfjörður', 65.03, -14.22),
  ('735', 'Eskifjörður', 65.07, -14.02),
  ('740', 'Neskaupstaður', 65.15, -13.69),
  ('750', 'Fáskrúðsfjörður', 64.93, -14.01),
  ('755', 'Stöðvarfjörður', 64.83, -13.87),
  ('760', 'Breiðdalsvík', 64.79, -14.01),
  ('765', 'Djúpivogur', 64.66, -14.28),
  ('780', 'Höfn', 64.25, -15.21),
  ('781', 'Höfn', 64.3, -15.4),
  ('785', 'Öræfi', 63.99, -16.65),
  ('800', 'Selfoss', 63.93, -21.0),
  ('801', 'Selfoss', 63.95, -20.9),
  ('802', 'Selfoss', 63.9, -21.05),
  ('803', 'Selfoss', 63.95, -20.85),
  ('804', 'Selfoss', 64.05, -20.7),
  ('805', 'Selfoss', 64.1, -20.95),
  ('806', 'Selfoss', 64.15, -20.5),
  ('810', 'Hveragerði', 64.0, -21.19),
  ('815', 'Þorlákshöfn', 63.86, -21.37),
  ('816', 'Ölfus', 63.95, -21.3),
  ('820', 'Eyrarbakki', 63.86, -21.15),
  ('825', 'Stokkseyri', 63.84, -21.06),
  ('840', 'Laugarvatn', 64.21, -20.73),
  ('845', 'Flúðir', 64.13, -20.31),
  ('846', 'Flúðir', 64.15, -20.2),
  ('850', 'Hella', 63.83, -20.4),
  ('851', 'Hella', 63.8, -20.3),
  ('860', 'Hvolsvöllur', 63.75, -20.23),
  ('861', 'Hvolsvöllur', 63.7, -20.0),
  ('870', 'Vík', 63.42, -19.01),
  ('871', 'Vík', 63.5, -18.8),
  ('880', 'Kirkjubæjarklaustur', 63.79, -18.05),
  ('881', 'Kirkjubæjarklaustur', 63.75, -17.9),
  ('900', 'Vestmannaeyjar', 63.44, -20.27);
