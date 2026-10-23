-- Supabase Storage krefst select-reglu til að eyða (og skrifa yfir) skrám.
-- Án hennar skilar remove() tómu svari og skráin verður eftir.
create policy "lesa eigin myndir" on storage.objects for select to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
