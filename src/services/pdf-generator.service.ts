/**
 * SERVICE GÉNÉRATION DE PDF
 *
 * Service pour générer des PDF avec en-tête d'entreprise
 * pour accompagner les notifications par email
 */

import jsPDF from 'jspdf';

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  taxId?: string;
  logo?: string;
}

export interface NotificationContent {
  title: string;
  recipient: {
    name: string;
    address?: string;
    city?: string;
  };
  date: string;
  reference: string;
  body: string;
  signature?: {
    name: string;
    title: string;
  };
  attachments?: string[];
}

class PDFGeneratorService {
  private defaultCompany: CompanyInfo = {
    name: 'WiseBook ERP',
    address: '123 Avenue de la Comptabilité',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    phone: '+33 1 23 45 67 89',
    email: 'contact@wisebook.com',
    taxId: 'FR 12 345 678 901'
  };

  /**
   * Génère un PDF avec en-tête d'entreprise
   */
  async generateNotificationPDF(
    content: NotificationContent,
    companyInfo?: CompanyInfo
  ): Promise<Blob> {
    const company = companyInfo || this.defaultCompany;
    const doc = new jsPDF();

    // Configuration des couleurs du thème
    const primaryColor = [106, 138, 130]; // #6A8A82
    const secondaryColor = [184, 115, 51]; // #B87333
    const textColor = [25, 25, 25]; // #191919
    const grayColor = [118, 118, 118]; // #767676

    let yPosition = 20;

    // ==========================================
    // EN-TÊTE ENTREPRISE
    // ==========================================

    // Logo ou initiales (si pas de logo)
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPosition, 30, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const initials = company.name.split(' ').map(w => w[0]).join('').substring(0, 2);
    doc.text(initials, 35, yPosition + 20, { align: 'center' });

    // Nom de l'entreprise
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, 55, yPosition + 10);

    // Coordonnées de l'entreprise
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(company.address, 55, yPosition + 17);
    doc.text(`${company.postalCode} ${company.city}, ${company.country}`, 55, yPosition + 22);
    doc.text(`Tél: ${company.phone}`, 55, yPosition + 27);
    doc.text(`Email: ${company.email}`, 55, yPosition + 32);

    if (company.taxId) {
      doc.text(`N° TVA: ${company.taxId}`, 55, yPosition + 37);
      yPosition += 52;
    } else {
      yPosition += 47;
    }

    // Ligne de séparation
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 15;

    // ==========================================
    // INFORMATIONS DESTINATAIRE
    // ==========================================

    // Date et référence
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Date: ${content.date}`, 20, yPosition);
    doc.text(`Référence: ${content.reference}`, 140, yPosition, { align: 'left' });
    yPosition += 10;

    // Destinataire
    if (content.recipient.name) {
      doc.setFont('helvetica', 'bold');
      doc.text('À l\'attention de:', 20, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'normal');
      doc.text(content.recipient.name, 20, yPosition);
      yPosition += 5;

      if (content.recipient.address) {
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.text(content.recipient.address, 20, yPosition);
        yPosition += 4;
      }

      if (content.recipient.city) {
        doc.text(content.recipient.city, 20, yPosition);
        yPosition += 10;
      }
    }

    yPosition += 5;

    // ==========================================
    // TITRE DE LA NOTIFICATION
    // ==========================================

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(content.title, 20, yPosition);
    yPosition += 10;

    // Ligne sous le titre
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(20, yPosition, 100, yPosition);
    yPosition += 10;

    // ==========================================
    // CORPS DU MESSAGE
    // ==========================================

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);

    // Diviser le texte en lignes
    const pageWidth = 170; // Largeur utilisable (210 - 40 marges)
    const lines = doc.splitTextToSize(content.body, pageWidth);

    // Vérifier si on a besoin d'une nouvelle page
    lines.forEach((line: string) => {
      if (yPosition > 270) { // Limite avant bas de page
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });

    yPosition += 10;

    // ==========================================
    // PIÈCES JOINTES (si présentes)
    // ==========================================

    if (content.attachments && content.attachments.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Pièces jointes:', 20, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);

      content.attachments.forEach((attachment) => {
        doc.text(`• ${attachment}`, 25, yPosition);
        yPosition += 5;
      });

      yPosition += 5;
    }

    // ==========================================
    // SIGNATURE
    // ==========================================

    if (content.signature) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text('Cordialement,', 20, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'bold');
      doc.text(content.signature.name, 20, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text(content.signature.title, 20, yPosition);
    }

    // ==========================================
    // PIED DE PAGE
    // ==========================================

    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Ligne de séparation
      doc.setDrawColor(...grayColor);
      doc.setLineWidth(0.2);
      doc.line(20, 282, 190, 282);

      // Texte du pied de page
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'italic');

      const footerText = `${company.name} - Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`;
      doc.text(footerText, 105, 287, { align: 'center' });

      // Numéro de page
      doc.text(`Page ${i} / ${totalPages}`, 190, 287, { align: 'right' });

      // Mention de confidentialité
      doc.setFontSize(7);
      doc.text('Ce document est confidentiel et destiné uniquement à son destinataire.', 105, 292, { align: 'center' });
    }

    // Retourner le PDF en tant que Blob
    return doc.output('blob');
  }

  /**
   * Convertit le contenu HTML d'un template en texte pour le PDF
   */
  htmlToPlainText(html: string): string {
    // Créer un élément temporaire
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Extraire le texte en préservant les sauts de ligne
    let text = '';

    // Parcourir les éléments
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent?.trim();
        if (content) {
          text += content + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        // Ajouter des sauts de ligne pour certains éléments
        if (['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
          text += '\n';
        }

        // Traiter les enfants
        node.childNodes.forEach(child => walk(child));

        // Sauts de ligne après paragraphes
        if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
          text += '\n';
        }
      }
    };

    walk(temp);

    // Nettoyer le texte
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 sauts de ligne consécutifs
      .replace(/[ \t]+/g, ' ') // Espaces multiples en un seul
      .trim();
  }

  /**
   * Remplace les variables dans le contenu
   */
  replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Génère un PDF pour un template d'email
   */
  async generateEmailAttachmentPDF(
    templateHtml: string,
    variables: Record<string, string>,
    companyInfo?: CompanyInfo
  ): Promise<{ filename: string; blob: Blob }> {
    // Remplacer les variables
    const processedHtml = this.replaceVariables(templateHtml, variables);

    // Convertir HTML en texte
    const plainText = this.htmlToPlainText(processedHtml);

    // Créer le contenu de notification
    const content: NotificationContent = {
      title: variables.notification_title || 'Notification',
      recipient: {
        name: variables.client_name || variables.recipient_name || 'Destinataire',
        address: variables.client_address,
        city: variables.client_city,
      },
      date: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      reference: variables.reference || variables.invoice_number || `REF-${Date.now()}`,
      body: plainText,
      signature: {
        name: variables.sender_name || companyInfo?.name || this.defaultCompany.name,
        title: variables.sender_title || 'Service Comptabilité'
      }
    };

    // Générer le PDF
    const blob = await this.generateNotificationPDF(content, companyInfo);

    // Nom du fichier
    const filename = `notification_${content.reference}_${Date.now()}.pdf`;

    return { filename, blob };
  }

  /**
   * Télécharge le PDF
   */
  downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const pdfGeneratorService = new PDFGeneratorService();
export default pdfGeneratorService;