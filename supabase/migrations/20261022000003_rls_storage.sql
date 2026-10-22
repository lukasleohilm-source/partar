-- Partar: aðgangsreglur (RLS), myndageymsla og rauntími

alter table public.makes enable row level security;
alter table public.models enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.user_vehicles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_fitments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.wanted_requests enable row level security;
alter table public.notifications enable row level security;

-- Uppflettitöflur: allir lesa
create policy "lesa tegundir" on public.makes for select using (true);
create policy "lesa gerðir" on public.models for select using (true);
create policy "lesa flokka" on public.categories for select using (true);

-- Prófílar: allir sjá nafn og landshluta, eigandi breytir
create policy "lesa prófíla" on public.profiles for select using (true);
create policy "breyta eigin prófíl" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Símanúmer: eigandi alltaf, aðrir aðeins ef show_phone
create policy "lesa síma" on public.profile_contacts for select
  using (id = auth.uid() or show_phone);
create policy "breyta eigin síma" on public.profile_contacts for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Mínir bílar
create policy "eigin bílar" on public.user_vehicles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auglýsingar
create policy "lesa auglýsingar" on public.listings for select
  using (status in ('active', 'sold') or seller_id = auth.uid());
create policy "stofna auglýsingu" on public.listings for insert
  with check (seller_id = auth.uid());
create policy "breyta eigin auglýsingu" on public.listings for update
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "eyða eigin auglýsingu" on public.listings for delete
  using (seller_id = auth.uid());

-- Myndir og fitments fylgja auglýsingunni
create policy "lesa myndir" on public.listing_images for select
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "eigandi myndir" on public.listing_images for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

create policy "lesa fitments" on public.listing_fitments for select
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "eigandi fitments" on public.listing_fitments for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- Samtöl: aðeins þátttakendur. Stofnuð með start_conversation().
create policy "lesa eigin samtöl" on public.conversations for select
  using (auth.uid() in (buyer_id, seller_id));

create policy "lesa skilaboð" on public.messages for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));
create policy "senda skilaboð" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));

-- Óskir
create policy "eigin óskir" on public.wanted_requests for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tilkynningar: lesa og merkja lesið
create policy "lesa eigin tilkynningar" on public.notifications for select
  using (user_id = auth.uid());
create policy "merkja tilkynningu" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== Myndageymsla =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/webp', 'image/jpeg', 'image/png']);

create policy "hlaða upp í eigin möppu" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "breyta eigin myndum" on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eyða eigin myndum" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Rauntími =====
alter publication supabase_realtime add table public.messages, public.notifications, public.conversations;
