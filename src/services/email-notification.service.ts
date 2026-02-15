/**
 * SERVICE NOTIFICATIONS EMAIL
 *
 * Service pour l'envoi d'emails avec génération automatique
 * de PDF avec en-tête d'entreprise
 */

import { apiClient } from '../lib/api-client';
import pdfGeneratorService, { CompanyInfo } from './pdf-generator.service';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  type: 'invoice' | 'payment-reminder' | 'notification' | 'statement' | 'other';
}

export interface EmailRecipient {
  email: string;
  name: string;
  address?: string;
  city?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Blob;
  contentType: string;
}

export interface SendEmailOptions {
  template: EmailTemplate;
  recipient: EmailRecipient;
  variables: Record<string, string>;
  companyInfo?: CompanyInfo;
  additionalAttachments?: EmailAttachment[];
  generatePDF?: boolean; // Par défaut: true
  ccEmails?: string[];
  bccEmails?: string[];
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  pdfGenerated?: boolean;
  pdfFilename?: string;
}

class EmailNotificationService {
  private readonly basePath = '/api/notifications/email';

  /**
   * Envoie un email avec génération automatique de PDF
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
    const {
      template,
      recipient,
      variables,
      companyInfo,
      additionalAttachments = [],
      generatePDF = true,
      ccEmails = [],
      bccEmails = []
    } = options;

    try {
      // Remplacer les variables dans le template
      const processedSubject = this.replaceVariables(template.subject, variables);
      const processedHtml = this.replaceVariables(template.htmlContent, variables);

      // Préparer les pièces jointes
      const attachments: EmailAttachment[] = [...additionalAttachments];

      // Générer le PDF si demandé
      let pdfFilename = '';
      if (generatePDF) {
        const pdfResult = await pdfGeneratorService.generateEmailAttachmentPDF(
          template.htmlContent,
          {
            ...variables,
            client_name: recipient.name,
            client_address: recipient.address || '',
            client_city: recipient.city || '',
            notification_title: template.name,
            recipient_name: recipient.name,
          },
          companyInfo
        );

        pdfFilename = pdfResult.filename;

        // Convertir le Blob en base64 pour l'envoi
        const pdfBase64 = await this.blobToBase64(pdfResult.blob);

        attachments.push({
          filename: pdfResult.filename,
          content: pdfBase64,
          contentType: 'application/pdf'
        });
      }

      // Préparer les données pour l'API
      const emailData = {
        to: recipient.email,
        toName: recipient.name,
        cc: ccEmails,
        bcc: bccEmails,
        subject: processedSubject,
        htmlBody: processedHtml,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content,
          contentType: att.contentType
        })),
        metadata: {
          templateId: template.id,
          templateName: template.name,
          templateType: template.type,
          recipientId: recipient.email,
          pdfGenerated: generatePDF,
          timestamp: new Date().toISOString()
        }
      };

      // Envoyer l'email via l'API
      const response = await apiClient.post<EmailResponse>(
        `${this.basePath}/send`,
        emailData
      );

      return {
        ...response,
        pdfGenerated: generatePDF,
        pdfFilename: pdfFilename
      };

    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'envoi de l\'email',
        pdfGenerated: false
      };
    }
  }

  /**
   * Envoie un email de facture
   */
  async sendInvoiceEmail(
    recipient: EmailRecipient,
    invoiceData: {
      invoiceNumber: string;
      amount: string;
      dueDate: string;
      paymentLink?: string;
    },
    companyInfo?: CompanyInfo
  ): Promise<EmailResponse> {
    const template: EmailTemplate = {
      id: 'invoice',
      name: 'Facture',
      subject: 'Nouvelle Facture #{{invoice_number}}',
      type: 'invoice',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6A8A82; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 12px 30px; background: #B87333; color: white; text-decoration: none; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #767676; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
    </div>
    <div class="content">
      <h2>Nouvelle Facture #{{invoice_number}}</h2>
      <p>Bonjour {{client_name}},</p>
      <p>Veuillez trouver ci-joint votre facture d'un montant de <strong>{{amount}}</strong>.</p>
      <p>Date d'échéance : <strong>{{due_date}}</strong></p>
      ${invoiceData.paymentLink ? '<p><a href="{{payment_link}}" class="button">Payer maintenant</a></p>' : ''}
      <p>Merci de votre confiance.</p>
    </div>
    <div class="footer">
      <p>Ce document est confidentiel et destiné uniquement à son destinataire.</p>
    </div>
  </div>
</body>
</html>`
    };

    return this.sendEmail({
      template,
      recipient,
      variables: {
        company_name: companyInfo?.name || 'Atlas Finance',
        client_name: recipient.name,
        invoice_number: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
        due_date: invoiceData.dueDate,
        payment_link: invoiceData.paymentLink || '',
        reference: invoiceData.invoiceNumber
      },
      companyInfo,
      generatePDF: true
    });
  }

  /**
   * Envoie un email de rappel de paiement
   */
  async sendPaymentReminderEmail(
    recipient: EmailRecipient,
    reminderData: {
      invoiceNumber: string;
      amount: string;
      daysOverdue: number;
      originalDueDate: string;
    },
    companyInfo?: CompanyInfo
  ): Promise<EmailResponse> {
    const template: EmailTemplate = {
      id: 'payment-reminder',
      name: 'Rappel de Paiement',
      subject: 'Rappel de Paiement - Facture #{{invoice_number}}',
      type: 'payment-reminder',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F97316; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #B87333; color: white; text-decoration: none; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; color: #767676; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
      <p>Rappel de Paiement</p>
    </div>
    <div class="content">
      <h2>Facture en attente de règlement</h2>
      <p>Bonjour {{client_name}},</p>
      <p>Nous vous rappelons que la facture suivante est en attente de paiement :</p>
      <div class="warning">
        <p><strong>Facture:</strong> #{{invoice_number}}</p>
        <p><strong>Montant:</strong> {{amount}}</p>
        <p><strong>Date d'échéance:</strong> {{original_due_date}}</p>
        <p><strong>Retard:</strong> {{days_overdue}} jours</p>
      </div>
      <p>Nous vous serions reconnaissants de bien vouloir régulariser cette situation dans les meilleurs délais.</p>
      <p>Si ce paiement a déjà été effectué, veuillez nous en informer et accepter nos excuses pour ce rappel.</p>
    </div>
    <div class="footer">
      <p>Pour toute question, n'hésitez pas à nous contacter.</p>
    </div>
  </div>
</body>
</html>`
    };

    return this.sendEmail({
      template,
      recipient,
      variables: {
        company_name: companyInfo?.name || 'Atlas Finance',
        client_name: recipient.name,
        invoice_number: reminderData.invoiceNumber,
        amount: reminderData.amount,
        days_overdue: reminderData.daysOverdue.toString(),
        original_due_date: reminderData.originalDueDate,
        reference: `RAPPEL-${reminderData.invoiceNumber}`
      },
      companyInfo,
      generatePDF: true
    });
  }

  /**
   * Envoie un email de notification générique
   */
  async sendNotificationEmail(
    recipient: EmailRecipient,
    notificationData: {
      title: string;
      message: string;
      reference?: string;
    },
    companyInfo?: CompanyInfo
  ): Promise<EmailResponse> {
    const template: EmailTemplate = {
      id: 'notification',
      name: notificationData.title,
      subject: notificationData.title,
      type: 'notification',
      htmlContent: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6A8A82; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; color: #767676; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{company_name}}</h1>
    </div>
    <div class="content">
      <h2>{{notification_title}}</h2>
      <p>Bonjour {{client_name}},</p>
      <div>{{message}}</div>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`
    };

    return this.sendEmail({
      template,
      recipient,
      variables: {
        company_name: companyInfo?.name || 'Atlas Finance',
        client_name: recipient.name,
        notification_title: notificationData.title,
        message: notificationData.message,
        reference: notificationData.reference || `NOT-${Date.now()}`
      },
      companyInfo,
      generatePDF: true
    });
  }

  /**
   * Remplace les variables dans une chaîne
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Convertit un Blob en base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Extraire seulement la partie base64 (après la virgule)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Erreur lors de la conversion du PDF'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Prévisualise un email avec son PDF
   */
  async previewEmail(options: SendEmailOptions): Promise<{
    html: string;
    pdfBlob?: Blob;
    pdfFilename?: string;
  }> {
    const { template, variables, companyInfo, generatePDF = true } = options;

    // Remplacer les variables
    const processedHtml = this.replaceVariables(template.htmlContent, variables);

    let pdfBlob: Blob | undefined;
    let pdfFilename: string | undefined;

    // Générer le PDF si demandé
    if (generatePDF) {
      const pdfResult = await pdfGeneratorService.generateEmailAttachmentPDF(
        template.htmlContent,
        variables,
        companyInfo
      );

      pdfBlob = pdfResult.blob;
      pdfFilename = pdfResult.filename;
    }

    return {
      html: processedHtml,
      pdfBlob,
      pdfFilename
    };
  }
}

export const emailNotificationService = new EmailNotificationService();
export default emailNotificationService;