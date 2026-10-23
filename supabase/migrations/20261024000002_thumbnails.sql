-- Smámyndir og ríkjandi litur fyrir hraðari og fallegri auglýsingaspjöld
alter table public.listing_images
  add column thumb_path text,
  add column color text check (color ~ '^#[0-9a-f]{6}$');
