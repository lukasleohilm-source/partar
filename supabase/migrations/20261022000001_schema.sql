-- Partar: grunnskema
create extension if not exists pg_trgm with schema extensions;

-- ===== Uppflettitöflur =====
create table public.makes (
  id serial primary key,
  name text not null unique,
  slug text not null unique
);

create table public.models (
  id serial primary key,
  make_id int not null references public.makes on delete cascade,
  name text not null,
  year_from smallint,
  year_to smallint,
  unique (make_id, name)
);
create index on public.models (make_id);

create table public.categories (
  id serial primary key,
  parent_id int references public.categories,
  name text not null,
  slug text not null unique,
  sort smallint not null default 0
);

create type public.region as enum (
  'hofudborgarsvaedid', 'sudurnes', 'vesturland', 'vestfirdir',
  'nordurland_vestra', 'nordurland_eystra', 'austurland', 'sudurland'
);
-- part = varahlutur, parts_car = partabíll, car = ódýr bíll
create type public.listing_kind as enum ('part', 'parts_car', 'car');
create type public.item_condition as enum ('nytt', 'eins_og_nytt', 'gott', 'notad', 'gallad');
create type public.listing_status as enum ('draft', 'active', 'sold', 'removed');

-- ===== Notendur =====
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  region public.region,
  created_at timestamptz not null default now()
);

-- Símanúmer í sér töflu svo RLS geti falið það
create table public.profile_contacts (
  id uuid primary key references public.profiles on delete cascade,
  phone text,
  show_phone boolean not null default false
);

-- „Mínir bílar“
create table public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  make_id int not null references public.makes,
  model_id int references public.models,
  year smallint,
  license_plate text, -- bílnúmer, notað þegar bílnúmeraleit kemur
  nickname text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.user_vehicles (user_id);

-- ===== Auglýsingar =====
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade,
  kind public.listing_kind not null default 'part',
  status public.listing_status not null default 'draft',
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 5000),
  category_id int references public.categories,
  price_isk int check (price_isk >= 0), -- null = „Tilboð“, 0 = „Gefins“
  condition public.item_condition not null,
  region public.region not null,
  postal_code text,
  part_number text,
  license_plate text, -- fyrir partabíla/bíla, seinna
  mileage_km int check (mileage_km >= 0),
  universal_fit boolean not null default false,
  search tsvector generated always as (
    to_tsvector('simple',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(part_number, ''))
  ) stored,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.listings using gin (search);
create index on public.listings using gin (title extensions.gin_trgm_ops);
create index on public.listings (status, published_at desc);
create index on public.listings (seller_id);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  path text not null, -- {seller_id}/{listing_id}/{uuid}.webp
  sort smallint not null default 0,
  width int,
  height int
);
create index on public.listing_images (listing_id, sort);

create table public.listing_fitments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  make_id int not null references public.makes,
  model_id int references public.models, -- null = allar gerðir
  year_from smallint,
  year_to smallint,
  check (year_from is null or year_to is null or year_from <= year_to)
);
create index on public.listing_fitments (listing_id);
create index on public.listing_fitments (make_id, model_id);

-- ===== Spjall =====
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  seller_id uuid not null references public.profiles on delete cascade,
  last_message_at timestamptz,
  last_sender_id uuid references public.profiles on delete set null,
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index on public.conversations (buyer_id, last_message_at desc);
create index on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

-- ===== Óska eftir =====
create table public.wanted_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  query text,
  kind public.listing_kind,
  category_id int references public.categories,
  make_id int references public.makes,
  model_id int references public.models,
  year smallint,
  max_price_isk int check (max_price_isk >= 0),
  region public.region,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (coalesce(query, '') <> '' or category_id is not null or make_id is not null)
);
create index on public.wanted_requests (user_id);
create index on public.wanted_requests (active) where active;

-- ===== Tilkynningar =====
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  type text not null check (type in ('wanted_match')),
  listing_id uuid references public.listings on delete cascade,
  wanted_id uuid references public.wanted_requests on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (wanted_id, listing_id)
);
create index on public.notifications (user_id, created_at desc);
