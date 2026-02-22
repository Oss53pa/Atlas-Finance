/**
 * Edge Function : embed
 * Génère des embeddings via Ollama (nomic-embed-text / mxbai-embed-large)
 * Utilisé pour indexer la knowledge_base et pour les requêtes RAG.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticateUser, AuthError, errorResponse } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { checkRateLimit, getUserIdFromRequest } from '../_shared/rateLimit.ts'

const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') || 'http://localhost:11434'
const EMBED_MODEL = Deno.env.get('EMBED_MODEL') || 'nomic-embed-text'

// ---------------------------------------------------------------------------
// Embedding generation
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${LLM_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  })

  if (!response.ok) {
    throw new Error(`Embedding error: ${response.status} ${await response.text()}`)
  }

  const { embedding } = await response.json()
  return embedding
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // Ollama doesn't support batch embedding, so we parallelize
  const results = await Promise.all(
    texts.map(text => generateEmbedding(text))
  )
  return results
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Rate limiting
  const rateLimitResponse = checkRateLimit(getUserIdFromRequest(req));
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await authenticateUser(req)
    const body = await req.json()
    const { action, texts, knowledgeIds } = body

    switch (action) {
      // Generate embeddings for given texts
      case 'embed': {
        if (!texts || !Array.isArray(texts)) {
          return errorResponse('texts array required', 400, corsHeaders)
        }

        const embeddings = await generateEmbeddingsBatch(texts)
        return new Response(
          JSON.stringify({ embeddings, model: EMBED_MODEL }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Index knowledge_base entries (generate + store embeddings)
      case 'index': {
        const supabase = createAdminClient()

        // Get entries without embeddings
        let query = supabase
          .from('knowledge_base')
          .select('id, title, content, subdomain')
          .is('embedding', null)
          .limit(50)

        if (knowledgeIds && Array.isArray(knowledgeIds)) {
          query = query.in('id', knowledgeIds)
        }

        const { data: entries, error } = await query

        if (error) {
          return errorResponse(`DB error: ${error.message}`, 500, corsHeaders)
        }

        if (!entries || entries.length === 0) {
          return new Response(
            JSON.stringify({ indexed: 0, message: 'No entries to index' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate embeddings
        const textsToEmbed = entries.map(e =>
          `${e.subdomain}: ${e.title}\n${e.content}`
        )
        const embeddings = await generateEmbeddingsBatch(textsToEmbed)

        // Update each entry with its embedding
        let indexed = 0
        for (let i = 0; i < entries.length; i++) {
          const { error: updateError } = await supabase
            .from('knowledge_base')
            .update({ embedding: embeddings[i] })
            .eq('id', entries[i].id)

          if (!updateError) indexed++
        }

        return new Response(
          JSON.stringify({ indexed, total: entries.length, model: EMBED_MODEL }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Re-index all entries (force regeneration)
      case 'reindex': {
        const supabase = createAdminClient()

        // Clear all embeddings first
        await supabase
          .from('knowledge_base')
          .update({ embedding: null })
          .not('id', 'is', null) // match all rows

        // Count total entries
        const { count } = await supabase
          .from('knowledge_base')
          .select('id', { count: 'exact', head: true })

        return new Response(
          JSON.stringify({
            message: `Embeddings cleared for ${count} entries. Call action=index to regenerate.`,
            totalEntries: count,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Search knowledge base
      case 'search': {
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
          return errorResponse('texts array with search query required', 400, corsHeaders)
        }

        const queryEmbedding = await generateEmbedding(texts[0])
        const supabase = createAdminClient()

        const { data, error } = await supabase.rpc('search_knowledge', {
          query_embedding: queryEmbedding,
          match_count: body.matchCount || 5,
          filter_domain: body.domain || null,
          filter_country: body.countryCode || null,
          similarity_threshold: body.threshold || 0.7,
        })

        if (error) {
          return errorResponse(`Search error: ${error.message}`, 500, corsHeaders)
        }

        return new Response(
          JSON.stringify({ results: data, model: EMBED_MODEL }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: embed, index, reindex, search`,
          400,
          corsHeaders
        )
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(error.message, error.status, corsHeaders)
    }
    console.error('embed error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      corsHeaders
    )
  }
})
