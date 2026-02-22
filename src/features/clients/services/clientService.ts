/**
 * Client Service — Connected to Dexie IndexedDB.
 * Queries real third-party and journal entry data for client management.
 */
import { db } from '../../../lib/db';
import type { DBThirdParty, DBJournalEntry } from '../../../lib/db';
import { ClientDetail, Facture, Paiement } from '../types/client.types';
import { Money } from '@/utils/money';

class ClientService {
  /**
   * Get client detail from thirdParties table + computed financial data.
   */
  async getClient(id: string): Promise<ClientDetail> {
    const tp = await db.thirdParties.get(id);

    if (!tp) {
      // Fallback: search by code
      const byCode = await db.thirdParties.where('code').equals(id).first();
      if (byCode) return this.buildClientDetail(byCode);

      // Return minimal placeholder if no data
      return this.buildEmptyClient(id);
    }

    return this.buildClientDetail(tp);
  }

  /**
   * Get invoices for a client by scanning journal entries with account 411xxx.
   */
  async getFactures(clientId: string): Promise<Facture[]> {
    const entries = await db.journalEntries.toArray();
    const factures: Facture[] = [];

    const tp = await db.thirdParties.get(clientId);
    const clientCode = tp?.code || clientId;

    for (const entry of entries) {
      // Look for sales entries (journal VT or entries with 411 accounts linked to this client)
      const clientLine = entry.lines.find(
        l => l.accountCode.startsWith('411') && (l.thirdPartyCode === clientCode || l.thirdPartyName === tp?.name)
      );

      if (clientLine) {
        const montantTTC = clientLine.debit || clientLine.credit;
        const montantTVA = new Money(montantTTC).multiply(0.1925).round().toNumber(); // ~19.25% reverse TVA
        const montantHT = montantTTC - montantTVA;

        factures.push({
          id: entry.id,
          numero: entry.reference || entry.entryNumber,
          date: entry.date,
          echeance: this.addDays(entry.date, 30),
          montantHT,
          montantTVA,
          montantTTC,
          solde: clientLine.debit > 0 ? clientLine.debit : 0, // debit = outstanding
          statut: entry.status === 'posted' ? 'PAYEE' : 'EN_ATTENTE',
        });
      }
    }

    return factures.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get payments for a client by scanning treasury entries.
   */
  async getPaiements(clientId: string): Promise<Paiement[]> {
    const entries = await db.journalEntries.toArray();
    const paiements: Paiement[] = [];

    const tp = await db.thirdParties.get(clientId);
    const clientCode = tp?.code || clientId;

    for (const entry of entries) {
      // Payments: credit on 411 account for this client in BQ/CA journals
      if (entry.journal === 'BQ' || entry.journal === 'CA') {
        const payLine = entry.lines.find(
          l => l.accountCode.startsWith('411') && l.credit > 0 &&
            (l.thirdPartyCode === clientCode || l.thirdPartyName === tp?.name)
        );

        if (payLine) {
          paiements.push({
            id: entry.id,
            date: entry.date,
            montant: payLine.credit,
            mode: entry.journal === 'BQ' ? 'Virement' : 'Especes',
            reference: entry.reference || entry.entryNumber,
            factures: [],
          });
        }
      }
    }

    return paiements.sort((a, b) => b.date.localeCompare(a.date));
  }

  async updateClient(id: string, data: Partial<ClientDetail>): Promise<ClientDetail> {
    const tp = await db.thirdParties.get(id);
    if (tp && data.nom) {
      await db.thirdParties.update(id, { name: data.nom });
    }
    return this.getClient(id);
  }

  // ---- Private helpers ----

  private async buildClientDetail(tp: DBThirdParty): Promise<ClientDetail> {
    // Compute financial data from entries
    const entries = await db.journalEntries.toArray();
    let totalDebit = 0;
    let totalCredit = 0;
    let invoiceCount = 0;

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.accountCode.startsWith('411') &&
            (line.thirdPartyCode === tp.code || line.thirdPartyName === tp.name)) {
          totalDebit += line.debit;
          totalCredit += line.credit;
          if (line.debit > 0) invoiceCount++;
        }
      }
    }

    const solde = totalDebit - totalCredit;

    return {
      id: tp.id,
      code: tp.code,
      nom: tp.name,
      formeJuridique: '',
      dateCreation: '',
      secteurActivite: '',
      adresseFacturation: {
        rue: tp.address || '',
        ville: '',
        codePostal: '',
        pays: '',
      },
      contacts: {
        comptabilite: { nom: '', email: tp.email || '', telephone: tp.phone || '' },
        principal: { nom: tp.name, email: tp.email || '', telephone: tp.phone || '' },
      },
      comptabilite: {
        compteCollectif: '411000',
        comptesAuxiliaires: [],
        regimeTVA: 'NORMAL',
        tauxTVADefaut: 19.25,
        exonerationTVA: false,
        modeReglement: 'VIREMENT',
        conditionsPaiement: 'Net 30 jours',
        delaiPaiement: 30,
        plafondEncours: 0,
        deviseFacturation: 'XAF',
      },
      banque: { iban: '', bic: '', domiciliation: '' },
      classification: {
        categorie: 'PME',
        zoneGeographique: '',
        responsableCommercial: '',
        notationInterne: 'B',
        clientStrategique: false,
      },
      financier: {
        chiffreAffairesAnnuel: totalDebit,
        encours: solde > 0 ? solde : 0,
        soldeComptable: solde,
        impayesEnCours: 0,
        delaistMoyenPaiement: 30,
        tauxRetard: 0,
        scoreSolvabilite: 75,
        limiteCredit: 0,
        caAnneePrecedente: 0,
        evolution: 0,
      },
      statut: tp.isActive ? 'ACTIF' : 'INACTIF',
    };
  }

  private buildEmptyClient(id: string): ClientDetail {
    return {
      id,
      code: id,
      nom: 'Client inconnu',
      formeJuridique: '',
      dateCreation: '',
      secteurActivite: '',
      adresseFacturation: { rue: '', ville: '', codePostal: '', pays: '' },
      contacts: {
        comptabilite: { nom: '', email: '', telephone: '' },
        principal: { nom: '', email: '', telephone: '' },
      },
      comptabilite: {
        compteCollectif: '411000',
        comptesAuxiliaires: [],
        regimeTVA: 'NORMAL',
        tauxTVADefaut: 19.25,
        exonerationTVA: false,
        modeReglement: 'VIREMENT',
        conditionsPaiement: 'Net 30 jours',
        delaiPaiement: 30,
        plafondEncours: 0,
        deviseFacturation: 'XAF',
      },
      banque: { iban: '', bic: '', domiciliation: '' },
      classification: {
        categorie: 'PME',
        zoneGeographique: '',
        responsableCommercial: '',
        notationInterne: 'C',
        clientStrategique: false,
      },
      financier: {
        chiffreAffairesAnnuel: 0,
        encours: 0,
        soldeComptable: 0,
        impayesEnCours: 0,
        delaistMoyenPaiement: 0,
        tauxRetard: 0,
        scoreSolvabilite: 0,
        limiteCredit: 0,
        caAnneePrecedente: 0,
        evolution: 0,
      },
      statut: 'PROSPECT',
    };
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}

export const clientService = new ClientService();
