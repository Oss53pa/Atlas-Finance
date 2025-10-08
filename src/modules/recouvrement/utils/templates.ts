export const EMAIL_TEMPLATES = {
  rappel_amical: `Objet: Rappel de paiement - {invoice_list}

Madame, Monsieur {client_name},

Nous vous rappelons que les factures suivantes restent impayées:
{invoice_details}

Montant total dû: {total_amount} FCFA

Il s'agit probablement d'un oubli de votre part. Nous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.

Si le règlement a été effectué entre-temps, nous vous prions de ne pas tenir compte de ce message.

Cordialement,
{company_name}`,

  relance_ferme: `Objet: 2ème Relance - {invoice_count} factures impayées

Madame, Monsieur {client_name},

Malgré notre précédent rappel, nous constatons que les factures suivantes restent impayées:
{invoice_details}

Montant total: {total_amount} FCFA
Retard moyen: {avg_days_overdue} jours

Nous vous demandons de procéder au règlement sous 48 heures.

Sans réponse de votre part, nous serons contraints d'engager des procédures de recouvrement.

Service Comptabilité
{company_name}`,

  dernier_avis: `Objet: DERNIER AVIS avant procédure - {invoice_count} factures

Madame, Monsieur {client_name},

DERNIER AVIS AVANT ENGAGEMENT DE POURSUITES

Malgré nos multiples relances, les factures suivantes demeurent impayées:
{invoice_details}

TOTAL DÛ: {total_amount} FCFA

Sans règlement sous 72 heures, votre dossier sera transmis à notre service contentieux.

Ceci est notre dernier avis amiable.

Direction Financière
{company_name}`,

  mise_demeure: `Objet: MISE EN DEMEURE - Créances impayées

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Madame, Monsieur {client_name},

MISE EN DEMEURE

Par la présente, nous vous mettons en demeure de régler sous HUIT (8) jours:

{invoice_details}

MONTANT PRINCIPAL: {total_amount} FCFA
INTÉRÊTS DE RETARD: {interest_amount} FCFA
FRAIS DE RELANCE: {fees_amount} FCFA
TOTAL À RÉGLER: {grand_total} FCFA

À défaut de règlement dans ce délai, nous engagerons toute procédure judiciaire utile.

{company_name}
Service Juridique`,

  pre_contentieux: `Objet: TRANSMISSION AU CONTENTIEUX - Dossier {client_code}

Madame, Monsieur {client_name},

Votre dossier a été transmis à notre service contentieux.

Créances en souffrance:
{invoice_details}

- Montant principal: {total_amount} FCFA
- Intérêts de retard: {interest_amount} FCFA
- Frais de relance: {fees_amount} FCFA
- TOTAL: {grand_total} FCFA

Une procédure judiciaire sera engagée sous 48 heures.

Pour éviter ces poursuites, contactez immédiatement:
Tel: +242 06 XXX XX XX
Email: contentieux@{company_domain}

Service Contentieux
{company_name}`
};

export const SMS_TEMPLATES = {
  rappel_amical: `Rappel: {invoice_count} factures de {total_amount} FCFA en retard. Merci de régulariser.`,

  relance_ferme: `2e RAPPEL: {invoice_count} factures impayées, total {total_amount} FCFA. Règlement sous 48h. {company_name}`,

  dernier_avis: `DERNIER AVIS: {total_amount} FCFA impayés. Transmission contentieux sous 72h sans règlement. {company_name}`,

  mise_demeure: `MISE EN DEMEURE: {total_amount} FCFA + frais. Procédure judiciaire sous 8 jours sans règlement. {company_name}`
};

export const COURRIER_TEMPLATES = {
  rappel_simple: {
    objet: 'Rappel de paiement',
    niveau: 1,
    delai: 'immédiat'
  },
  relance_ferme: {
    objet: 'Deuxième relance',
    niveau: 2,
    delai: '48 heures'
  },
  mise_demeure: {
    objet: 'Mise en demeure',
    niveau: 3,
    delai: '8 jours',
    envoi: 'recommandé AR'
  },
  pre_contentieux: {
    objet: 'Transmission au contentieux',
    niveau: 4,
    delai: '48 heures',
    envoi: 'recommandé AR'
  }
};