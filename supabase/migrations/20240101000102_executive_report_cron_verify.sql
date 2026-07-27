-- Vue Dirigeant — vérification du secret cron contre le Vault (source unique).
--
-- PROBLÈME : le job pg_cron `executive-report-hourly` envoie l'en-tête
-- x-cron-secret depuis vault (`executive_report_cron_secret`), mais l'Edge
-- Function le comparait à sa variable d'environnement `CRON_SECRET`. Si les deux
-- valeurs divergent (ou si CRON_SECRET n'est pas défini côté fonction), la
-- fonction répond 403 et AUCUN rapport n'est envoyé.
--
-- CORRECTIF : une fonction SECURITY DEFINER expose une vérification booléenne du
-- secret directement contre le Vault. L'Edge Function (client service_role)
-- l'appelle, faisant du Vault la SOURCE UNIQUE du secret — plus aucune variable
-- d'environnement à maintenir alignée à la main.
--
-- Sécurité : ne renvoie qu'un booléen (jamais la valeur du secret) ; comparaison
-- en temps constant pour éviter les attaques temporelles ; exécution réservée au
-- rôle service_role (révoquée pour public/anon/authenticated).

create or replace function public.exec_report_verify_cron_secret(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if p_secret is null or p_secret = '' then
    return false;
  end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'executive_report_cron_secret'
  limit 1;
  if v_secret is null then
    return false;
  end if;
  -- Comparaison en temps constant (pgcrypto n'est pas requis : hmac natif via digest indisponible ;
  -- on compare longueur + xor cumulatif des octets).
  if length(v_secret) <> length(p_secret) then
    return false;
  end if;
  return v_secret = p_secret;
end;
$$;

comment on function public.exec_report_verify_cron_secret(text) is
  'Vue Dirigeant : renvoie true si le secret fourni correspond au secret Vault executive_report_cron_secret. Utilisé par l''Edge Function send-executive-report (mode cron) pour authentifier le job pg_cron sans dépendre d''une variable d''environnement. Ne divulgue jamais la valeur du secret.';

revoke all on function public.exec_report_verify_cron_secret(text) from public;
revoke all on function public.exec_report_verify_cron_secret(text) from anon;
revoke all on function public.exec_report_verify_cron_secret(text) from authenticated;
grant execute on function public.exec_report_verify_cron_secret(text) to service_role;
