-- „Verð lækkað“: muna fyrra verð þegar seljandi lækkar verðið, svo hægt sé að sýna
-- „45.000 → 35.000 kr.“ á auglýsingunni í 30 daga.

alter table public.listings
  add column previous_price_isk int check (previous_price_isk >= 0),
  add column price_dropped_at timestamptz;

create function public.track_price_drop() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.price_isk is null or old.price_isk is null then
    -- „Tilboð“ á undan eða eftir: ekkert til að bera saman
    new.previous_price_isk := null;
    new.price_dropped_at := null;
  elsif new.price_isk < old.price_isk then
    -- Ef verðið lækkar aftur innan 30 daga er upprunalega verðið áfram það sem sýnt er
    if new.previous_price_isk is null or old.price_dropped_at is null or old.price_dropped_at < now() - interval '30 days' then
      new.previous_price_isk := old.price_isk;
    end if;
    new.price_dropped_at := now();
  elsif new.previous_price_isk is not null and new.price_isk >= new.previous_price_isk then
    -- Hækkað aftur upp í (eða yfir) fyrra verð: engin lækkun lengur
    new.previous_price_isk := null;
    new.price_dropped_at := null;
  end if;
  return new;
end $$;

create trigger listings_track_price_drop before update of price_isk on public.listings
  for each row when (new.price_isk is distinct from old.price_isk)
  execute function public.track_price_drop();
