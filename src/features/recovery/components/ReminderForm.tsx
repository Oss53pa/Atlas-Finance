import React, { useState } from 'react';
import { Input, Select, Textarea } from '@/shared/components/ui/Form';
import { Alert } from '@/shared/components/ui/Alert';
import { DossierRecouvrement } from '../types/recovery.types';
import { formatCurrency } from '@/shared/utils/formatters';

interface ReminderFormProps {
  dossier: DossierRecouvrement;
  onSubmit: (data: ReminderFormData) => void;
  onCancel: () => void;
}

export interface ReminderFormData {
  type: 'email' | 'sms' | 'both';
  template: string;
  customMessage?: string;
  scheduleDate?: string;
}

const emailTemplates = [
  { value: 'first_reminder', label: 'Première Relance - Courtoise' },
  { value: 'second_reminder', label: 'Deuxième Relance - Ferme' },
  { value: 'final_reminder', label: 'Dernière Relance - Urgente' },
  { value: 'payment_plan', label: 'Proposition de Plan de Paiement' },
  { value: 'custom', label: 'Message Personnalisé' },
];

const smsTemplates = [
  { value: 'simple_reminder', label: 'Rappel Simple' },
  { value: 'urgent_reminder', label: 'Rappel Urgent' },
  { value: 'payment_confirmation', label: 'Confirmation de Paiement' },
  { value: 'custom', label: 'Message Personnalisé' },
];

export const ReminderForm: React.FC<ReminderFormProps> = ({
  dossier,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ReminderFormData>({
    type: 'email',
    template: 'first_reminder',
    customMessage: '',
    scheduleDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const montantRestant = dossier.montantTotal - dossier.montantPaye;

  const handleChange = (field: keyof ReminderFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Le type de relance est requis';
    }

    if (!formData.template) {
      newErrors.template = 'Veuillez sélectionner un modèle';
    }

    if (formData.template === 'custom' && (!formData.customMessage || formData.customMessage.trim() === '')) {
      newErrors.customMessage = 'Le message personnalisé est requis';
    }

    if (formData.scheduleDate) {
      const scheduleDate = new Date(formData.scheduleDate);
      const now = new Date();
      if (scheduleDate < now) {
        newErrors.scheduleDate = 'La date programmée doit être dans le futur';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(formData);
  };

  const getTemplatePreview = () => {
    if (formData.template === 'custom') {
      return formData.customMessage;
    }

    const templatePreviews: Record<string, string> = {
      first_reminder: `Bonjour ${dossier.client},\n\nNous vous rappelons que votre facture ${dossier.numeroRef} d'un montant de ${formatCurrency(montantRestant)} est en attente de paiement.\n\nMerci de régulariser votre situation dans les meilleurs délais.\n\nCordialement,`,
      second_reminder: `Madame, Monsieur,\n\nMalgré notre précédent rappel, nous constatons que votre facture ${dossier.numeroRef} d'un montant de ${formatCurrency(montantRestant)} reste impayée.\n\nNous vous demandons de procéder au règlement sous 7 jours.\n\nCordialement,`,
      final_reminder: `RELANCE URGENTE\n\nDernière mise en demeure avant action juridique.\n\nFacture: ${dossier.numeroRef}\nMontant: ${formatCurrency(montantRestant)}\n\nRèglement exigé sous 48 heures.`,
      payment_plan: `Bonjour,\n\nNous comprenons vos difficultés. Nous vous proposons un plan de paiement pour votre dette de ${formatCurrency(montantRestant)}.\n\nContactez-nous pour discuter des modalités.`,
      simple_reminder: `Rappel: Facture ${dossier.numeroRef} - ${formatCurrency(montantRestant)} à régler. Merci.`,
      urgent_reminder: `URGENT: Votre facture ${dossier.numeroRef} de ${formatCurrency(montantRestant)} est en retard. Réglez rapidement SVP.`,
      payment_confirmation: `Nous avons bien reçu votre paiement pour la facture ${dossier.numeroRef}. Merci.`,
    };

    return templatePreviews[formData.template] || '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert variant="info" title="Information">
        Dossier: {dossier.numeroRef} - {dossier.client}
        <br />
        Montant restant: {formatCurrency(montantRestant)}
      </Alert>

      <Select
        label="Type de Relance"
        value={formData.type}
        onChange={(e) => handleChange('type', e.target.value as 'email' | 'sms' | 'both')}
        options={[
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
          { value: 'both', label: 'Email + SMS' },
        ]}
        error={errors.type}
        required
        fullWidth
      />

      <Select
        label="Modèle"
        value={formData.template}
        onChange={(e) => handleChange('template', e.target.value)}
        options={formData.type === 'sms' || formData.type === 'both' ? smsTemplates : emailTemplates}
        error={errors.template}
        helperText={formData.type === 'email' ? 'Choisissez un modèle d\'email' : 'Choisissez un modèle de SMS'}
        required
        fullWidth
      />

      {formData.template === 'custom' && (
        <Textarea
          label="Message Personnalisé"
          value={formData.customMessage}
          onChange={(e) => handleChange('customMessage', e.target.value)}
          placeholder="Saisissez votre message personnalisé..."
          error={errors.customMessage}
          rows={6}
          required
          fullWidth
        />
      )}

      {formData.template !== 'custom' && (
        <div>
          <label className="block text-sm font-medium text-[#191919] mb-2">
            Aperçu du Message
          </label>
          <div className="bg-[#F5F5F5] border border-[#D9D9D9] rounded-lg p-4">
            <p className="text-sm text-[#191919] whitespace-pre-wrap">
              {getTemplatePreview()}
            </p>
          </div>
        </div>
      )}

      <Input
        label="Programmer l'envoi (optionnel)"
        type="datetime-local"
        value={formData.scheduleDate}
        onChange={(e) => handleChange('scheduleDate', e.target.value)}
        error={errors.scheduleDate}
        helperText="Laisser vide pour envoyer immédiatement"
        fullWidth
      />

      {formData.type === 'sms' && (
        <Alert variant="warning">
          Les SMS sont limités à 160 caractères. Le message sera tronqué si nécessaire.
        </Alert>
      )}
    </form>
  );
};