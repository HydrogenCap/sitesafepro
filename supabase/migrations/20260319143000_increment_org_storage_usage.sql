create or replace function public.increment_org_storage_usage(
  p_org_id uuid,
  p_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_bytes < 0 then
    raise exception 'p_bytes must be non-negative';
  end if;

  if not public.can_manage_documents(p_org_id) then
    raise exception 'insufficient_privilege';
  end if;

  update public.organisations
  set storage_used_bytes = coalesce(storage_used_bytes, 0) + p_bytes
  where id = p_org_id;

  if not found then
    raise exception 'organisation_not_found';
  end if;
end;
$$;

grant execute on function public.increment_org_storage_usage(uuid, bigint) to authenticated;
