-- Stjórnborð: stjórnendur, bönn, villuskráning og öryggisföll fyrir /stjorn

create table public.admins (
  user_id uuid primary key references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- engar reglur: aðeins aðgengilegt gegnum föll

-- Fyrsti stjórnandi: aðgangur eigandans (lukasleohilm) í vafranum þar sem Partar var smíðað
insert into public.admins (user_id)
select id from public.profiles where id = '58ad241a-7c14-4642-8f87-220314b5e02d';

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- ===== Bönn =====
alter table public.profiles add column banned_at timestamptz;

create function public.is_banned(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned_at is not null from public.profiles where id = p_user), false)
$$;

drop policy "stofna auglýsingu" on public.listings;
create policy "stofna auglýsingu" on public.listings for insert
  with check (seller_id = auth.uid() and not public.is_banned(auth.uid()));

drop policy "senda skilaboð" on public.messages;
create policy "senda skilaboð" on public.messages for insert
  with check (sender_id = auth.uid() and not public.is_banned(auth.uid()) and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.buyer_id, c.seller_id)
      and not public.has_blocked(case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end, auth.uid())
  ));

-- ===== Villuskráning úr vöfrum =====
create table public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  url text check (char_length(url) <= 500),
  message text not null check (char_length(message) <= 1000),
  stack text check (char_length(stack) <= 4000),
  user_agent text check (char_length(user_agent) <= 300)
);
create index on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
create policy "skrá villu" on public.client_errors for insert
  with check (user_id is not distinct from auth.uid());

-- ===== Föll fyrir stjórnborð (öll athuga is_admin) =====
create function public.admin_stats(
  out listings_active int, out listings_today int, out users_total int, out users_today int,
  out messages_today int, out reports_open int, out errors_today int, out push_subscribers int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select count(*) filter (where status = 'active'), count(*) filter (where published_at > now() - interval '1 day')
    into listings_active, listings_today from public.listings;
  select count(*), count(*) filter (where created_at > now() - interval '1 day')
    into users_total, users_today from public.profiles;
  select count(*) into messages_today from public.messages where created_at > now() - interval '1 day';
  select count(distinct r.listing_id) into reports_open
    from public.reports r join public.listings l on l.id = r.listing_id where l.status <> 'removed';
  select count(*) into errors_today from public.client_errors where created_at > now() - interval '1 day';
  select count(distinct user_id) into push_subscribers from public.push_subscriptions;
end $$;

create function public.admin_reports()
returns table (
  listing_id uuid, title text, status public.listing_status, seller_id uuid, seller_name text,
  seller_banned boolean, report_count int, reasons public.report_reason[], details text[], last_report timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select l.id, l.title, l.status, l.seller_id, p.display_name, p.banned_at is not null,
           count(*)::int, array_agg(distinct r.reason), array_remove(array_agg(r.details), null), max(r.created_at)
    from public.reports r
    join public.listings l on l.id = r.listing_id
    join public.profiles p on p.id = l.seller_id
    group by l.id, p.id
    order by (l.status = 'removed'), max(r.created_at) desc
    limit 100;
end $$;

create function public.admin_set_listing_status(p_listing uuid, p_status public.listing_status, p_clear_reports boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.listings set status = p_status where id = p_listing;
  if p_clear_reports then
    delete from public.reports where listing_id = p_listing;
  end if;
end $$;

create function public.admin_ban_user(p_user uuid, p_ban boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot_ban_self'; end if;
  update public.profiles set banned_at = case when p_ban then now() end where id = p_user;
  if p_ban then
    update public.listings set status = 'removed' where seller_id = p_user and status in ('active', 'draft');
  end if;
end $$;

create function public.admin_errors(p_limit int default 50)
returns setof public.client_errors
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select * from public.client_errors order by created_at desc limit least(p_limit, 200);
end $$;

revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_reports() from public, anon;
revoke execute on function public.admin_set_listing_status(uuid, public.listing_status, boolean) from public, anon;
revoke execute on function public.admin_ban_user(uuid, boolean) from public, anon;
revoke execute on function public.admin_errors(int) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.admin_set_listing_status(uuid, public.listing_status, boolean) to authenticated;
grant execute on function public.admin_ban_user(uuid, boolean) to authenticated;
grant execute on function public.admin_errors(int) to authenticated;
