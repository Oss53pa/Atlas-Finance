// @ts-nocheck

/**
 * Knowledge Base — Agrégateur et moteur de recherche
 * Expose searchKnowledge(query, topK) pour le RAG dans le system prompt.
 *
 * Strategy: pgvector semantic search first, keyword TF fallback.
 */
import type { SyscohadaKnowledgeChunk } from '../../proph3t/types/knowledge';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
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

// ── Embedding helpers ─────────────────────────────────────────

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = import.meta.env.VITE_EMBEDDING_MODEL || 'nomic-embed-text';

/**
 * Generate an embedding vector via Ollama /api/embeddings.
 * Returns null if Ollama is unavailable.
 */
async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding ?? null;
  } catch (err) { /* silent */
    return null;
  }
}

// ── Semantic search (pgvector) ────────────────────────────────

/**
 * Semantic search via Supabase RPC `search_knowledge`.
 * Requires pgvector extension + knowledge_chunks table + Ollama embeddings.
 * Returns [] if any part of the pipeline is unavailable.
 */
async function searchKnowledgeSemantic(
  query: string,
  topK: number,
  category?: string,
): Promise<SyscohadaKnowledgeChunk[]> {
  if (!isSupabaseConfigured) return [];

  const embedding = await getEmbedding(query);
  if (!embedding) return [];

  try {
    const { data, error } = await supabase.rpc('search_knowledge' as any, {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: topK,
      filter_category: category ?? null,
    }) as any;

    if (error || !data || data.length === 0) return [];

    return data.map((row: any) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      legal_references: row.legal_references,
      keywords: [], // pgvector chunks don't use keyword field
    }));
  } catch (err) { /* silent */
    return [];
  }
}

// ── Main search (semantic → keyword fallback) ─────────────────

/**
 * Search the knowledge base.
 * 1. Try pgvector semantic search (Supabase + Ollama embeddings)
 * 2. Fall back to keyword TF scoring on static chunks
 */
export async function searchKnowledge(
  query: string,
  topK: number = 5,
): Promise<SyscohadaKnowledgeChunk[]> {
  if (!query || query.trim().length < 2) return [];

  // 1. Try semantic search
  const semanticResults = await searchKnowledgeSemantic(query, topK);
  if (semanticResults.length > 0) return semanticResults;

  // 2. Fallback to keyword TF search
  return searchKnowledgeKeyword(query, topK);
}

/**
 * Synchronous keyword-only search (original implementation).
 * Useful when caller cannot await or needs guaranteed-fast results.
 */
export function searchKnowledgeKeyword(
  query: string,
  topK: number = 5,
): SyscohadaKnowledgeChunk[] {
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
