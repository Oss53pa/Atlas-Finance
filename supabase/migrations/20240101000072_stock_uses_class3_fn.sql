-- Module STOCK — L1 : détection honnête de l'usage de la classe 3.
-- Le gate d'activation « muet sans classe 3 » ne doit PAS se baser sur la simple
-- présence de comptes de classe 3 au plan (tout plan SYSCOHADA en contient), mais
-- sur un usage réel : existence d'au moins une ligne d'écriture sur un compte 3x.
create or replace function public.stock_uses_class3(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.journal_lines jl
    where jl.tenant_id = p_tenant and jl.account_code like '3%'
  );
$$;
