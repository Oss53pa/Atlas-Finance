# send-executive-report — Vue Dirigeant

Génère la synthèse exécutive HTML d'une société (CA, résultat net, trésorerie,
marge, tendance 12 mois, top clients, santé financière) et l'envoie par email
via Resend.

## Modes

### `test` (défaut) — authentifié par JWT utilisateur
Envoi immédiat pour la société du caller. Utilisé par le bouton
« Envoyer maintenant » de la page **Vue Dirigeant** (`/executive/digest`).

```jsonc
POST /functions/v1/send-executive-report
Authorization: Bearer <user_jwt>
{ "mode": "test", "recipients": ["dg@societe.com"], "frequency": "monthly" }
```

`recipients` / `frequency` sont optionnels : à défaut, la planification
enregistrée pour le tenant est utilisée.

### `cron` — protégé par en-tête `x-cron-secret`
Balaye toutes les planifications actives dont `next_run_at <= now`, envoie chaque
rapport puis met à jour `last_sent_at` et recalcule `next_run_at`.

```jsonc
POST /functions/v1/send-executive-report
x-cron-secret: <CRON_SECRET>
{ "mode": "cron" }
```

## Déploiement

```bash
supabase functions deploy send-executive-report
```

### Secrets requis
| Secret | Rôle |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | accès DB (fournis par la plateforme) |
| `RESEND_API_KEY` | envoi email (sans clé → mode dry-run, log uniquement) |
| `SITE_URL` | lien « Ouvrir le tableau de bord » |
| `CRON_SECRET` | protège le mode `cron` |
| `MAIL_FROM` | expéditeur (défaut `Atlas FnA <noreply@atlasstudio.org>`) |

## Planification (cron)

L'endpoint `cron` est idempotent et sans état : il envoie uniquement les
planifications **dues** (`next_run_at <= now`). Il suffit de l'appeler
régulièrement (toutes les heures suffit). Options :

- **Supabase Scheduled Functions** (recommandé) : planifier un appel horaire.
- **Cron externe / GitHub Action** : `curl -X POST … -H "x-cron-secret: …"`.
- **pg_cron + pg_net** (si activés) :

  ```sql
  select cron.schedule(
    'executive-report-hourly', '0 * * * *',
    $$ select net.http_post(
         url := 'https://<project>.supabase.co/functions/v1/send-executive-report',
         headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', '<CRON_SECRET>'),
         body := '{"mode":"cron"}'::jsonb
       ); $$
  );
  ```

La granularité horaire est volontaire : `send_hour` (heure UTC) fixe l'heure
d'envoi, le balayage horaire garantit un déclenchement au plus tard dans l'heure.
