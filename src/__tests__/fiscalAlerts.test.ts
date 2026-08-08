import { describe, it, expect } from 'vitest';
import { deriveFiscalAlerts, type TaxDeclarationRecord, type TaxRegistryRecord } from '../hooks/useFiscalAlerts';

/**
 * Alertes fiscales — une alerte muette est pire que pas d'alerte : on croit
 * qu'il n'y a rien à faire. Ces tests verrouillent les deux sources (déclarations
 * saisies + calendrier théorique du registre) et le classement en retard/urgent.
 */

const NOW = new Date('2026-06-15T12:00:00Z');
const YEAR = 2026;

const registryTVA: TaxRegistryRecord = {
  id: 'reg-tva', taxCode: 'TVA', taxName: 'Taxe sur la valeur ajoutée',
  taxCategory: 'INDIRECTE', periodicity: 'MONTHLY', declarationDeadlineDays: 15, isActive: true,
};

describe('deriveFiscalAlerts', () => {
  it('produit le calendrier de l’exercice quand aucune déclaration n’existe', () => {
    const alerts = deriveFiscalAlerts([], [registryTVA], YEAR, NOW);
    expect(alerts).toHaveLength(12);
    expect(alerts.every((a) => a.taxCode === 'TVA')).toBe(true);
    // Trié par échéance croissante.
    expect(alerts.map((a) => a.deadline)).toEqual([...alerts.map((a) => a.deadline)].sort());
  });

  it('CONTINUE d’alerter sur les périodes non déclarées dès qu’une déclaration existe', () => {
    // Le défaut corrigé : la génération depuis le registre était conditionnée à
    // l'absence TOTALE de déclaration. Une seule déclaration saisie rendait donc
    // le calendrier entier silencieux — précisément quand le dossier vit.
    const janvier: TaxDeclarationRecord = {
      id: 'd1', taxCode: 'TVA', periodLabel: 'Janvier 2026',
      declarationDeadline: '2026-02-15', status: 'paid', netTax: 120000,
    };
    const alerts = deriveFiscalAlerts([janvier], [registryTVA], YEAR, NOW);

    // 1 déclaration + 11 périodes théoriques restantes.
    expect(alerts).toHaveLength(12);
    expect(alerts.filter((a) => a.periodLabel === 'Janvier 2026')).toHaveLength(1);
    // Les échéances passées non déclarées remontent bien en retard.
    const enRetard = alerts.filter((a) => a.isOverdue).map((a) => a.periodLabel);
    expect(enRetard).toContain('Février 2026');
    expect(enRetard).toContain('Avril 2026');
    expect(enRetard).not.toContain('Janvier 2026');   // payée
  });

  it('ne double pas une période déjà déclarée', () => {
    const mars: TaxDeclarationRecord = {
      id: 'd2', taxCode: 'TVA', periodLabel: 'Mars 2026',
      declarationDeadline: '2026-04-15', status: 'declared',
    };
    const alerts = deriveFiscalAlerts([mars], [registryTVA], YEAR, NOW);
    expect(alerts.filter((a) => a.taxCode === 'TVA' && a.periodLabel === 'Mars 2026')).toHaveLength(1);
  });

  it('classe en retard une échéance dépassée et non traitée', () => {
    const enRetard: TaxDeclarationRecord = {
      id: 'd3', taxCode: 'TVA', periodLabel: 'Mai 2026',
      declarationDeadline: '2026-06-01', status: 'draft',
    };
    const [a] = deriveFiscalAlerts([enRetard], [], YEAR, NOW);
    expect(a.status).toBe('en_retard');
    expect(a.isOverdue).toBe(true);
    expect(a.isUrgent).toBe(false);      // en retard ≠ urgent : ce n'est plus une échéance à venir
    expect(a.daysUntil).toBeLessThan(0);
  });

  it('classe urgente une échéance à moins de 7 jours, pas au-delà', () => {
    const proche: TaxDeclarationRecord = { id: 'd4', taxCode: 'TVA', declarationDeadline: '2026-06-20', status: 'draft' };
    const loin: TaxDeclarationRecord = { id: 'd5', taxCode: 'TVA', declarationDeadline: '2026-07-30', status: 'draft' };
    const alerts = deriveFiscalAlerts([proche, loin], [], YEAR, NOW);
    expect(alerts.find((a) => a.id === 'd4')?.isUrgent).toBe(true);
    expect(alerts.find((a) => a.id === 'd5')?.isUrgent).toBe(false);
  });

  it('ne signale ni en retard ni urgente une déclaration déjà payée', () => {
    const payee: TaxDeclarationRecord = { id: 'd6', taxCode: 'TVA', declarationDeadline: '2026-01-15', status: 'paid' };
    const [a] = deriveFiscalAlerts([payee], [], YEAR, NOW);
    expect(a.status).toBe('payee');
    expect(a.isOverdue).toBe(false);
    expect(a.isUrgent).toBe(false);
  });

  it('ignore une déclaration sans échéance exploitable plutôt que de la dire en retard', () => {
    const sansDate: TaxDeclarationRecord = { id: 'd7', taxCode: 'TVA', status: 'draft' };
    const illisible: TaxDeclarationRecord = { id: 'd8', taxCode: 'TVA', declarationDeadline: 'à définir', status: 'draft' };
    expect(deriveFiscalAlerts([sansDate, illisible], [], YEAR, NOW)).toHaveLength(0);
  });

  it('ignore les taxes désactivées du registre', () => {
    const inactive: TaxRegistryRecord = { ...registryTVA, id: 'reg-off', taxCode: 'AIRSI', isActive: false };
    const alerts = deriveFiscalAlerts([], [registryTVA, inactive], YEAR, NOW);
    expect(alerts.some((a) => a.taxCode === 'AIRSI')).toBe(false);
  });

  it('respecte le délai de déclaration du registre pour poser l’échéance', () => {
    // Février se termine le 28/02 ; avec 15 jours de délai, échéance au 15/03.
    const alerts = deriveFiscalAlerts([], [registryTVA], YEAR, NOW);
    const fev = alerts.find((a) => a.periodLabel === 'Février 2026');
    expect(fev?.deadline).toBe('2026-03-15');
  });

  it('gère la périodicité trimestrielle et annuelle', () => {
    const trim: TaxRegistryRecord = { ...registryTVA, id: 'r-t', taxCode: 'PAT', periodicity: 'QUARTERLY' };
    const annuel: TaxRegistryRecord = { ...registryTVA, id: 'r-a', taxCode: 'IS', periodicity: 'ANNUAL' };
    const alerts = deriveFiscalAlerts([], [trim, annuel], YEAR, NOW);
    expect(alerts.filter((a) => a.taxCode === 'PAT')).toHaveLength(4);
    expect(alerts.filter((a) => a.taxCode === 'IS')).toHaveLength(1);
    expect(alerts.find((a) => a.taxCode === 'PAT')?.periodLabel).toBe('T1 2026');
  });
});
