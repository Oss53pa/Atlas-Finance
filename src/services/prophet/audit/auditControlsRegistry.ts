// @ts-nocheck
/**
 * auditControlsRegistry — Registry typé des 108 contrôles audit SYSCOHADA.
 */
import type { DataAdapter } from '@atlas/data';

export type Severite = 'BLOQUANT' | 'MAJEUR' | 'MINEUR' | 'INFO';

export interface ControlResult {
  ref: string;
  libelle: string;
  severite: Severite;
  statut: 'OK' | 'ALERTE' | 'ERREUR' | 'SKIP';
  message: string;
  details?: unknown;
  reference: string;
}

export interface AuditControl {
  ref: string;           // C01 à C108
  niveau: number;        // 0-8
  categorie: string;
  libelle: string;
  severite: Severite;
  reference: string;     // Article SYSCOHADA/ISA
  execute: (adapter: DataAdapter) => Promise<ControlResult>;
}

export interface AuditResult {
  dateExecution: string;
  dureeMs: number;
  totalControles: number;
  controlesExecutes: number;
  resultats: ControlResult[];
  resume: {
    ok: number;
    alertes: number;
    erreurs: number;
    skips: number;
    bloquants: number;
    majeurs: number;
    mineurs: number;
    infos: number;
  };
  score: number; // 0-100
}

export class AuditControlsRegistry {
  private controls: AuditControl[] = [];

  register(control: AuditControl): void {
    this.controls.push(control);
  }

  registerAll(controls: AuditControl[]): void {
    this.controls.push(...controls);
  }

  getControls(categorie?: string, niveauMax?: number): AuditControl[] {
    let filtered = this.controls;
    if (categorie) {
      filtered = filtered.filter(c => c.categorie === categorie);
    }
    if (niveauMax !== undefined) {
      filtered = filtered.filter(c => c.niveau <= niveauMax);
    }
    return filtered.sort((a, b) => {
      const refA = parseInt(a.ref.replace('C', ''));
      const refB = parseInt(b.ref.replace('C', ''));
      return refA - refB;
    });
  }

  async runAll(adapter: DataAdapter, niveauMax: number = 8): Promise<AuditResult> {
    const start = Date.now();
    const controls = this.getControls(undefined, niveauMax);
    const resultats: ControlResult[] = [];

    for (const control of controls) {
      try {
        const result = await control.execute(adapter);
        resultats.push(result);
      } catch (error) {
        resultats.push({
          ref: control.ref,
          libelle: control.libelle,
          severite: control.severite,
          statut: 'SKIP',
          message: `Erreur: ${error instanceof Error ? error.message : String(error)}`,
          reference: control.reference,
        });
      }
    }

    return this.buildResult(resultats, controls.length, Date.now() - start);
  }

  async runCategory(adapter: DataAdapter, categorie: string, niveauMax: number = 8): Promise<AuditResult> {
    const start = Date.now();
    const controls = this.getControls(categorie, niveauMax);
    const resultats: ControlResult[] = [];

    for (const control of controls) {
      try {
        const result = await control.execute(adapter);
        resultats.push(result);
      } catch (error) {
        resultats.push({
          ref: control.ref,
          libelle: control.libelle,
          severite: control.severite,
          statut: 'SKIP',
          message: `Erreur: ${error instanceof Error ? error.message : String(error)}`,
          reference: control.reference,
        });
      }
    }

    return this.buildResult(resultats, controls.length, Date.now() - start);
  }

  private buildResult(resultats: ControlResult[], total: number, dureeMs: number): AuditResult {
    const resume = {
      ok: resultats.filter(r => r.statut === 'OK').length,
      alertes: resultats.filter(r => r.statut === 'ALERTE').length,
      erreurs: resultats.filter(r => r.statut === 'ERREUR').length,
      skips: resultats.filter(r => r.statut === 'SKIP').length,
      bloquants: resultats.filter(r => r.statut !== 'OK' && r.severite === 'BLOQUANT').length,
      majeurs: resultats.filter(r => r.statut !== 'OK' && r.severite === 'MAJEUR').length,
      mineurs: resultats.filter(r => r.statut !== 'OK' && r.severite === 'MINEUR').length,
      infos: resultats.filter(r => r.statut !== 'OK' && r.severite === 'INFO').length,
    };

    // Score: 100 - penalties
    const executed = resultats.filter(r => r.statut !== 'SKIP').length;
    const penalties = resume.bloquants * 10 + resume.majeurs * 5 + resume.mineurs * 2 + resume.infos * 0.5;
    const score = Math.max(0, Math.round(100 - (executed > 0 ? (penalties / executed) * 100 : 0)));

    return {
      dateExecution: new Date().toISOString(),
      dureeMs,
      totalControles: total,
      controlesExecutes: executed,
      resultats,
      resume,
      score,
    };
  }

  get size(): number {
    return this.controls.length;
  }

  get categories(): string[] {
    return [...new Set(this.controls.map(c => c.categorie))];
  }
}

export const auditRegistry = new AuditControlsRegistry();
