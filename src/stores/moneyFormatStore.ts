/**
 * moneyFormatStore — Préférence globale d'affichage des montants.
 *
 * Deux modes :
 *   - 'full'    : nombre entier avec séparateur de milliers (ex: 1 234 567 890)
 *   - 'compact' : abréviation K / M / Md avec 2 décimales (ex: 1,23 Md)
 *
 * Le choix est persisté dans localStorage pour survivre aux reloads.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MoneyFormatMode = 'full' | 'compact';

interface MoneyFormatState {
  mode: MoneyFormatMode;
  setMode: (mode: MoneyFormatMode) => void;
  toggle: () => void;
}

export const useMoneyFormatStore = create<MoneyFormatState>()(
  persist(
    (set, get) => ({
      mode: 'full', // défaut : affichage entier
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'full' ? 'compact' : 'full' }),
    }),
    {
      name: 'atlas-money-format',
      version: 1,
    }
  )
);
