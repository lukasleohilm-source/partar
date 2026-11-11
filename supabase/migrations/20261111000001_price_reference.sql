-- Verðviðmið þegar auglýsing er sett inn: hvað sambærilegir hlutir kosta á Partar.
-- Byggt á virkum og seldum auglýsingum síðustu 18 mánuði með uppgefnu verði.
-- Skilar aðeins niðurstöðu ef a.m.k. 3 sambærilegar auglýsingar finnast (annars null),
-- svo ein undarleg auglýsing ráði ekki tillögunni.
--
-- Samanburður, sá nákvæmasti sem nær 3 auglýsingum:
--   1. sami hlutur (lykilorð eða líkur titill) í sömu bílgerð
--   2. sami hlutur í hvaða bíl sem er
-- Fyrir bíla (kind <> 'part'): 1. sama gerð, 2. sama tegund.

create function public.price_reference(
  p_kind public.listing_kind,
  p_title text,
  p_keyword text default null,   -- brotið lykilorð úr viðmiðunartöflu appsins, t.d. 'alternator'
  p_category int default null,
  p_make int default null,
  p_model int default null,
  p_exclude uuid default null     -- auglýsingin sjálf þegar verið er að breyta
) returns jsonb
language sql stable set search_path = public, extensions as $$
  with base as (
    select l.id, l.price_isk, l.search_text, l.title
    from listings l
    where l.status in ('active', 'sold')
      and l.kind = p_kind
      and l.price_isk > 0
      and l.published_at > now() - interval '18 months'
      and (p_exclude is null or l.id <> p_exclude)
      and (p_kind <> 'part' or p_category is null or l.category_id = p_category)
  ),
  same_thing as (
    select b.* from base b
    where p_kind <> 'part'
       or (p_keyword is not null and b.search_text like '%' || p_keyword || '%')
       or (p_keyword is null and length(p_title) >= 3
           and extensions.word_similarity(public.fold(p_title), public.fold(b.title)) >= 0.6)
  ),
  tiers as (
    select 1 as tier, s.price_isk from same_thing s
    where p_model is not null
      and exists (select 1 from listing_fitments f where f.listing_id = s.id and f.model_id = p_model)
    union all
    select 2, s.price_isk from same_thing s
    where p_kind = 'part'
       or (p_make is not null and exists (select 1 from listing_fitments f where f.listing_id = s.id and f.make_id = p_make))
  ),
  best as (
    select tier from tiers group by tier having count(*) >= 3 order by tier limit 1
  )
  select jsonb_build_object(
    'n', count(*),
    'scope', case b.tier when 1 then 'model' else case when p_kind = 'part' then 'any' else 'make' end end,
    'low', round(percentile_cont(0.25) within group (order by t.price_isk)),
    'median', round(percentile_cont(0.5) within group (order by t.price_isk)),
    'high', round(percentile_cont(0.75) within group (order by t.price_isk))
  )
  from tiers t join best b on b.tier = t.tier
  group by b.tier;
$$;

grant execute on function public.price_reference(public.listing_kind, text, text, int, int, int, uuid) to anon, authenticated;
