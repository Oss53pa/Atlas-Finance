-- Vue Dirigeant — planificateur horaire des envois programmés.
--
-- Appelle l'Edge Function `send-executive-report` en mode 'cron' toutes les
-- heures (minute 0) via pg_net. La fonction balaye alors les planifications
-- actives dont next_run_at <= now et envoie chaque synthèse.
--
-- Le secret partagé (en-tête x-cron-secret) est lu depuis Supabase Vault
-- (secret 'executive_report_cron_secret'), jamais codé en dur ici.
--
-- PRÉREQUIS (hors migration, à faire une fois côté projet) :
--   • CRON_SECRET défini dans les secrets de l'Edge Function avec la MÊME
--     valeur que le secret Vault 'executive_report_cron_secret' — sinon la
--     fonction répond 403 (FORBIDDEN) et aucun envoi n'a lieu.
--   • RESEND_API_KEY défini pour l'envoi réel des emails ; sans elle, la
--     fonction fonctionne en dry-run (journalisation, aucun email émis).
--
-- Extensions requises (déjà activées sur le projet) : pg_cron, pg_net, supabase_vault.
-- cron.schedule est idempotent sur le nom du job (ré-exécution = remplacement).
select cron.schedule(
  'executive-report-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := 'https://vgtmljfayiysuvrcmunt.supabase.co/functions/v1/send-executive-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'executive_report_cron_secret')
    ),
    body := jsonb_build_object('mode', 'cron')
  );
  $cron$
);
