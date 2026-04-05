// @ts-nocheck
/**
 * Knowledge Base — Agrégateur et moteur de recherche
 * Expose searchKnowledge(query, topK) pour le RAG dans le system prompt.
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';
import { syscohadaKnowledge } from './syscohada';
import { fiscaliteKnowledge } from './fiscalite';
import { auditKnowledge } from './audit';
import { clotureKnowledge } from './cloture';
import { paieKnowledge } from './paie';
import { consolidationKnowledge } from './consolidation';

/** All knowledge chunks combined */
export const allKnowledge: SyscohadaKnowledgeChunk[] = [
  ...syscohadaKnowledge,
  ...fiscaliteKnowledge,
  ...auditKnowledge,
  ...clotureKnowledge,
  ...paieKnowledge,
  ...consolidationKnowledge,
];

/**
 * Simple TF-based keyword search.
 * Scores each chunk by how many query tokens appear in its keywords + title + content.
 */
export function searchKnowledge(query: string, topK: number = 5): SyscohadaKnowledgeChunk[] {
  if (!query || query.trim().length < 2) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = allKnowledge.map(chunk => {
    const chunkText = [
      chunk.title,
      chunk.category,
      ...(chunk.keywords || []),
      chunk.content.slice(0, 500), // limit content scan for performance
    ].join(' ').toLowerCase();

    let score = 0;
    for (const token of queryTokens) {
      if (chunkText.includes(token)) {
        score += 1;
        // Bonus for keyword match
        if (chunk.keywords?.some(k => k.toLowerCase().includes(token))) score += 2;
        // Bonus for title match
        if (chunk.title.toLowerCase().includes(token)) score += 3;
        // Bonus for category match
        if (chunk.category.toLowerCase().includes(token)) score += 1;
      }
    }

    // Boost country-specific queries
    const countryTokens = ['ci', 'sn', 'cm', 'ga', 'bf', 'ml', 'ne', 'tg', 'bj'];
    for (const ct of countryTokens) {
      if (queryTokens.includes(ct) && chunk.category.includes(`_${ct}`)) {
        score += 5;
      }
    }

    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.chunk);
}

/**
 * Get chunks by category
 */
export function getKnowledgeByCategory(category: string): SyscohadaKnowledgeChunk[] {
  return allKnowledge.filter(c => c.category === category || c.category.startsWith(category));
}

/**
 * Get total chunk count
 */
export function getKnowledgeCount(): number {
  return allKnowledge.length;
}

// ── Helpers ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
  'et', 'ou', 'en', 'à', 'pour', 'par', 'sur', 'dans', 'avec',
  'est', 'sont', 'a', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'son', 'sa', 'ses', 'ce', 'cette', 'ces', 'qui', 'que', 'quoi',
  'comment', 'quel', 'quelle', 'quels', 'quelles', 'je', 'tu', 'il',
  'nous', 'vous', 'ils', 'me', 'te', 'se', 'ne', 'pas', 'plus',
  'the', 'is', 'of', 'and', 'in', 'to', 'for', 'a', 'an',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents for matching
    .split(/[\s,;:.!?'"()\[\]{}]+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}
