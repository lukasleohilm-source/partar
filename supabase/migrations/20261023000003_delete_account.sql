-- Notandi eyðir eigin aðgangi. Allt sem tengist prófílnum fer með (cascade):
-- auglýsingar, myndalínur, samtöl, skilaboð, óskir og tilkynningar.
-- Myndaskrár í geymslunni eru fjarlægðar af appinu áður en þetta er kallað.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
