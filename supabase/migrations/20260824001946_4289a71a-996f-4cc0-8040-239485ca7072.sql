create or replace function public.offers_set_quality(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.offers o
  set commercial_quality = r.q,
      quality_reasons = r.reasons,
      quality_checked_at = now()
  from (
    select (x->>'id')::uuid as id,
           x->>'q' as q,
           coalesce(x->'reasons', '[]'::jsonb) as reasons
    from jsonb_array_elements(p_rows) x
  ) r
  where o.id = r.id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.offers_set_quality(jsonb) from public, anon, authenticated;
grant execute on function public.offers_set_quality(jsonb) to service_role;