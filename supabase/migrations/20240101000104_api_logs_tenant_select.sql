-- Les logs API deviennent visibles par tout membre de la société (tenant),
-- cohérent avec la tenancy company-scoped des clés (et non plus seulement par
-- le créateur de la clé). La policy "view own" existante est conservée (OR).
create policy api_logs_tenant_select on public.api_logs for select
  using (
    exists (
      select 1 from public.api_keys k
      where k.id = api_logs.api_key_id
        and k.tenant_id = public.get_user_company_id()
    )
  );
