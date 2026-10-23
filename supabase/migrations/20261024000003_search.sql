-- Betri leit á íslensku: óháð kommum/sérstöfum, samheiti, hlutar orða, innsláttarvillur, uppástungur

create extension if not exists unaccent with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

-- „Brotið“ form texta til samanburðar: lágstafir og án kommu (ð→d, þ→th, æ→ae, ö→o, á→a…)
create function public.fold(t text) returns text
language sql immutable parallel safe set search_path = public, extensions as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

alter table public.listings
  add column search_text text generated always as (
    public.fold(title || ' ' || coalesce(part_number, '') || ' ' || coalesce(description, ''))
  ) stored;
create index on public.listings using gin (search_text extensions.gin_trgm_ops);

-- Samheitahópar (í brotnu formi). Leit að einu orði í hópi finnur öll hin.
create table public.search_synonyms (
  id serial primary key,
  terms text[] not null
);
alter table public.search_synonyms enable row level security;
create policy "lesa samheiti" on public.search_synonyms for select using (true);

insert into public.search_synonyms (terms) values
  (array['framljos', 'adalljos', 'ljoskastari']),
  (array['afturljos', 'bakljos', 'stoppljos']),
  (array['thokuljos', 'thokuljosker']),
  (array['dekk', 'hjolbardi', 'hjolbardar']),
  (array['felga', 'felgur', 'alfelga', 'alfelgur', 'stalfelgur']),
  (array['vetrardekk', 'nagladekk', 'harkornadekk']),
  (array['bremsuklossar', 'bremsuklossi', 'klossar']),
  (array['bremsudiskar', 'bremsudiskur', 'diskar']),
  (array['demparar', 'dempari', 'hoggdeyfar', 'hoggdeyfir']),
  (array['gormar', 'gormur', 'fjadrir']),
  (array['girkassi', 'skipting', 'sjalfskipting', 'beinskipting']),
  (array['vel', 'motor', 'velin']),
  (array['startari', 'startarinn']),
  (array['alternator', 'rafall', 'altenator']),
  (array['rafgeymir', 'rafgeymar', 'geymir']),
  (array['spegill', 'speglar', 'hlidarspegill']),
  (array['studari', 'studarar']),
  (array['bretti', 'aurbretti']),
  (array['hurd', 'hurdir']),
  (array['ruda', 'rudur', 'framruda', 'afturruda']),
  (array['vatnskassi', 'kaelir', 'vatnskassar']),
  (array['pust', 'pustkerfi', 'hljodkutur', 'kutur']),
  (array['drattarkrokur', 'krokur', 'drattarbeisli']),
  (array['turbina', 'turbo']),
  (array['kupling', 'kuplingsdiskur']),
  (array['oxull', 'oxlar', 'drifskaft']),
  (array['saeti', 'stoll', 'framsaeti']),
  (array['utvarp', 'hljomtaeki', 'spilari']),
  (array['tolva', 'heili', 'stjorntolva']),
  (array['toppbogar', 'thakbogar', 'farangursbogar']);

create function public.expand_term(p_word text) returns setof text
language sql stable set search_path = public as $$
  select p_word
  union
  select unnest(s.terms) from public.search_synonyms s where p_word = any (s.terms)
$$;

-- Passar texti (brotinn) við leitarstreng? Hvert orð (eða samheiti þess) verður að koma fyrir,
-- sem hluti orðs eða með innsláttarvillu (Levenshtein: 1 stafur í 4 stafa orðum; 2 í lengri orðum
-- ef fyrsti stafurinn passar, svo víxlaðir stafir eins og „yarsi“ → „yaris“ finnist).
create function public.search_matches(p_text text, p_q text) returns boolean
language sql stable set search_path = public, extensions as $$
  select coalesce(trim(p_q), '') = '' or not exists (
    select 1
    from regexp_split_to_table(public.fold(trim(p_q)), '\s+') w
    where w <> '' and not exists (
      select 1 from public.expand_term(w) s
      where p_text like '%' || s || '%'
    ) and not (
      length(w) >= 4 and exists (
        select 1 from regexp_split_to_table(p_text, '[^a-z0-9]+') x
        where abs(length(x) - length(w)) <= 2
          and extensions.levenshtein(w, x) <= case when length(w) >= 5 and left(x, 1) = left(w, 1) then 2 else 1 end
      )
    )
  )
$$;

create or replace function public.search_listings(
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
    and public.search_matches(l.search_text, q)
    and (p_kind is null or l.kind = p_kind)
    and (p_category is null or l.category_id = p_category
         or l.category_id in (select c.id from public.categories c where c.parent_id = p_category))
    and (p_min_price is null or l.price_isk >= p_min_price)
    and (p_max_price is null or l.price_isk <= p_max_price)
    and (p_conditions is null or l.condition = any (p_conditions))
    and (p_region is null or l.region = p_region)
    and public.listing_fits(l.id, p_make, p_model, p_year)
    and not public.has_blocked(auth.uid(), l.seller_id)
  order by
    case when p_sort = 'price_asc' then l.price_isk end asc nulls last,
    case when p_sort = 'price_desc' then l.price_isk end desc nulls last,
    -- Við textaleit koma auglýsingar þar sem leitarorðið er í fyrirsögninni fyrst
    case when coalesce(trim(q), '') <> '' and public.fold(l.title) like '%' || public.fold(trim(q)) || '%' then 0 else 1 end,
    l.published_at desc
  limit least(p_limit, 100) offset p_offset
$$;

create or replace function public.match_wanted() returns trigger
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
    and not public.has_blocked(w.user_id, new.seller_id)
    and (w.kind is null or w.kind = new.kind)
    and (w.category_id is null or w.category_id = new.category_id
         or exists (select 1 from public.categories c
                    where c.id = new.category_id and c.parent_id = w.category_id))
    and (w.max_price_isk is null or (new.price_isk is not null and new.price_isk <= w.max_price_isk))
    and (w.region is null or w.region = new.region)
    and public.listing_fits(new.id, w.make_id, w.model_id, w.year)
    and public.search_matches(new.search_text, w.query)
  on conflict (wanted_id, listing_id) do nothing;

  return new;
end $$;

drop function public.text_matches(tsvector, text, text);

-- Uppástungur í leitarreit: bílar, flokkar og fyrirsagnir auglýsinga
create function public.search_suggestions(p_q text)
returns table (kind text, label text, make_id int, model_id int, category_id int)
language sql stable set search_path = public, extensions as $$
  with q as (select public.fold(trim(p_q)) as f)
  (select 'car', mk.name || ' ' || mo.name, mk.id, mo.id, null::int
   from public.models mo join public.makes mk on mk.id = mo.make_id, q
   where length(q.f) >= 2 and public.fold(mk.name || ' ' || mo.name) like '%' || q.f || '%'
   order by position(q.f in public.fold(mk.name || ' ' || mo.name)), mk.name, mo.name
   limit 4)
  union all
  (select 'make', mk.name, mk.id, null::int, null::int
   from public.makes mk, q
   where length(q.f) >= 2 and public.fold(mk.name) like q.f || '%'
   limit 1)
  union all
  (select 'category', c.name, null::int, null::int, c.id
   from public.categories c, q
   where length(q.f) >= 2 and exists (
     select 1 from public.expand_term(q.f) s where public.fold(c.name) like '%' || s || '%')
   order by c.parent_id nulls first, c.sort
   limit 3)
  union all
  (select 'listing', t.title, null::int, null::int, null::int
   from (select distinct on (public.fold(l.title)) l.title, l.published_at
         from public.listings l, q
         where l.status = 'active' and length(q.f) >= 2 and public.search_matches(l.search_text, q.f)
           and not public.has_blocked(auth.uid(), l.seller_id)
         order by public.fold(l.title), l.published_at desc) t
   order by t.published_at desc
   limit 4)
$$;
