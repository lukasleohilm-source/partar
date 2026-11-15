-- Staðfestir seljendur: seljandi staðfestir sig einu sinni með rafrænum skilríkjum (Kenni)
-- og fær merkið „Staðfestur seljandi“. Kennitalan er aldrei vistuð, aðeins saltað SHA-256
-- fingrafar af henni, svo sama manneskja geti ekki staðfest marga aðganga.

alter table public.profiles add column verified_at timestamptz;

-- Notandi getur breytt eigin prófíl, en aldrei sett eða fjarlægt staðfestingu sjálfur
create function public.protect_verified_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.verified_at is distinct from old.verified_at
     and coalesce(current_setting('partar.verifying', true), '') <> 'on' then
    new.verified_at := old.verified_at;
  end if;
  return new;
end $$;

create trigger profiles_protect_verified_at before update on public.profiles
  for each row execute function public.protect_verified_at();

create table private.identity_verifications (
  user_id uuid primary key references public.profiles on delete cascade,
  national_id_hash text not null unique,
  name text,
  verified_at timestamptz not null default now()
);

-- Leyndarmál sem aðeins Worker (KENNI_VERIFY_SECRET) og gagnagrunnurinn þekkja.
-- Það er líka saltið í fingrafarinu, svo ekki sé hægt að giska á kennitölur út frá því.
create table private.kenni_config (
  id boolean primary key default true check (id),
  secret text not null
);
insert into private.kenni_config (secret)
values (replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));

-- Kallað af Worker eftir að Kenni hefur staðfest notandann
create function public.complete_identity_verification(p_secret text, p_user uuid, p_national_id text, p_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_secret text := (select secret from private.kenni_config);
  v_hash text;
begin
  if p_secret is distinct from v_secret then
    raise exception 'forbidden';
  end if;
  if p_national_id !~ '^\d{10}$' then
    raise exception 'invalid_national_id';
  end if;
  v_hash := encode(sha256(convert_to(v_secret || ':' || p_national_id, 'UTF8')), 'hex');
  if exists (select 1 from private.identity_verifications where national_id_hash = v_hash and user_id <> p_user) then
    raise exception 'already_verified_elsewhere';
  end if;

  insert into private.identity_verifications (user_id, national_id_hash, name)
  values (p_user, v_hash, left(p_name, 200))
  on conflict (user_id) do update
    set national_id_hash = excluded.national_id_hash, name = excluded.name, verified_at = now();

  perform set_config('partar.verifying', 'on', true);
  update public.profiles set verified_at = now() where id = p_user;
end $$;
revoke execute on function public.complete_identity_verification(text, uuid, text, text) from public;
grant execute on function public.complete_identity_verification(text, uuid, text, text) to anon, authenticated;
