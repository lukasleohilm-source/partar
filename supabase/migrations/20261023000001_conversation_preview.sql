-- Síðustu skilaboð geymd á samtalinu svo samtalalistinn þurfi ekki að sækja skilaboð
alter table public.conversations add column last_message_body text;

create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c
  set last_message_at = new.created_at,
      last_sender_id = new.sender_id,
      last_message_body = left(new.body, 140),
      buyer_last_read_at = case when c.buyer_id = new.sender_id then new.created_at else c.buyer_last_read_at end,
      seller_last_read_at = case when c.seller_id = new.sender_id then new.created_at else c.seller_last_read_at end
  where c.id = new.conversation_id;
  return new;
end $$;

revoke execute on function public.on_message_insert() from public, anon, authenticated;
