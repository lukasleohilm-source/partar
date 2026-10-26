-- Einkvæm nöfn: enginn tveir notendur mega heita það sama (óháð há-/lágstöfum og aukabilum).
-- Reglan er athuguð í lok færslu (deferrable) svo sameining aðganga, sem færir nafn gestsins
-- yfir á aðalaðganginn áður en gestinum er eytt, gangi áfram upp.

create function public.name_key(p text) returns text
language sql immutable set search_path = public as $$
  select lower(regexp_replace(btrim(p), '\s+', ' ', 'g'));
$$;

-- Tvítekin nöfn sem eru þegar til: elsti heldur nafninu, hinir fá „ 2“, „ 3“ …
with d as (
  select id, row_number() over (partition by public.name_key(display_name) order by created_at, id) as rn
  from public.profiles
)
update public.profiles p
   set display_name = left(btrim(p.display_name), 56) || ' ' || d.rn
  from d
 where d.id = p.id and d.rn > 1;

alter table public.profiles add column name_key text generated always as (public.name_key(display_name)) stored;
alter table public.profiles add constraint profiles_name_key_unique unique (name_key) deferrable initially deferred;

-- Laust nafn byggt á tillögu: „jon“, svo „jon 2“, „jon 3“ …
create function public.unique_display_name(p_base text, p_except uuid default null) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  base text := left(btrim(p_base), 56);
  candidate text := base;
  n int := 2;
begin
  while exists (
    select 1 from public.profiles
     where name_key = public.name_key(candidate) and id is distinct from p_except
  ) loop
    candidate := base || ' ' || n;
    n := n + 1;
  end loop;
  return candidate;
end $$;
revoke execute on function public.unique_display_name(text, uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, public.unique_display_name(coalesce(
    nullif(left(split_part(new.email, '@', 1), 56), ''),
    'Notandi ' || left(new.id::text, 4))));
  insert into public.profile_contacts (id) values (new.id);
  return new;
end $$;

-- Fyrir prófílformið: er nafnið laust? (eigið núverandi nafn telst laust)
create function public.display_name_available(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select char_length(btrim(p_name)) between 1 and 60
     and not exists (
       select 1 from public.profiles
        where name_key = public.name_key(p_name) and id is distinct from auth.uid()
     );
$$;
revoke execute on function public.display_name_available(text) from public;
grant execute on function public.display_name_available(text) to anon, authenticated;
