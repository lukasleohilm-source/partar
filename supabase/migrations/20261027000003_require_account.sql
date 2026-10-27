-- Aðeins skráðir notendur (Google eða netfang) mega setja inn auglýsingar og óskir.
-- Gestir (nafnlausir notendur) geta áfram skoðað, leitað, átt uppáhalds og spjallað.

create function public.is_registered() returns boolean
language sql stable set search_path = public as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

drop policy "stofna auglýsingu" on public.listings;
create policy "stofna auglýsingu" on public.listings for insert
  with check (seller_id = auth.uid() and public.is_registered() and not public.is_banned(auth.uid()));

-- Óskir: skráning krefst aðgangs; gestir geta enn séð, breytt og eytt eldri óskum sínum
drop policy "eigin óskir" on public.wanted_requests;
create policy "lesa eigin óskir" on public.wanted_requests for select using (user_id = auth.uid());
create policy "breyta eigin óskum" on public.wanted_requests for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eyða eigin óskum" on public.wanted_requests for delete using (user_id = auth.uid());
create policy "skrá ósk" on public.wanted_requests for insert
  with check (user_id = auth.uid() and public.is_registered());
