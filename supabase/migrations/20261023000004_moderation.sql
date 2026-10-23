-- Tilkynningar um auglýsingar og lokun á notendur

-- ===== Tilkynna auglýsingu =====
create type public.report_reason as enum ('stolid', 'svik', 'rangar_upplysingar', 'othaeft', 'annad');

create table public.reports (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings on delete cascade,
  reporter_id uuid not null references public.profiles on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index on public.reports (listing_id);

alter table public.reports enable row level security;
create policy "tilkynna" on public.reports for insert
  with check (reporter_id = auth.uid()
    and not exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "sjá eigin tilkynningar" on public.reports for select using (reporter_id = auth.uid());

-- Auglýsing með tilkynningar frá 3 ólíkum notendum er falin þar til hún er skoðuð
create function public.on_report_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports where listing_id = new.listing_id) >= 3 then
    update public.listings set status = 'removed' where id = new.listing_id and status in ('active', 'sold');
  end if;
  return new;
end $$;
revoke execute on function public.on_report_insert() from public, anon, authenticated;

create trigger reports_after_insert after insert on public.reports
  for each row execute function public.on_report_insert();

-- ===== Loka á notanda =====
create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
create policy "eigin lokanir" on public.blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- RLS felur lokanir annarra, svo reglur sem þurfa að vita af þeim nota þetta fall
create function public.has_blocked(p_blocker uuid, p_blocked uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_blocker is not null and p_blocked is not null and exists (
    select 1 from public.blocks where blocker_id = p_blocker and blocked_id = p_blocked
  )
$$;

-- Ekki hægt að senda skilaboð til þess sem hefur lokað á mann
drop policy "senda skilaboð" on public.messages;
create policy "senda skilaboð" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
      and not public.has_blocked(case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end, auth.uid())
  ));

-- Ekki hægt að hefja samtal við seljanda sem hefur lokað á mann
create or replace function public.start_conversation(p_listing uuid) returns uuid
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
  if public.has_blocked(v_seller, auth.uid()) then
    raise exception 'blocked';
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing, auth.uid(), v_seller)
  on conflict (listing_id, buyer_id) do nothing;

  select id into v_id from public.conversations where listing_id = p_listing and buyer_id = auth.uid();
  return v_id;
end $$;
revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Auglýsingar frá þeim sem maður hefur lokað á birtast ekki í leit
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
    and public.text_matches(l.search, l.title, q)
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
    l.published_at desc
  limit least(p_limit, 100) offset p_offset
$$;
