/**
 * Edge Function : llm-proxy
 * Proxy vers LLM local (Ollama/vLLM) ou API cloud
 * Gère l'authentification, le RAG search, l'assemblage du prompt, et le streaming.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticateUser, AuthError, errorResponse } from '../_shared/auth.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { checkRateLimit, getUserIdFromRequest } from '../_shared/rateLimit.ts'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const LLM_BASE_URL = Deno.env.get('LLM_BASE_URL') || 'http://localhost:11434'
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'mistral'
const EMBED_MODEL = Deno.env.get('EMBED_MODEL') || 'nomic-embed-text'

// ---------------------------------------------------------------------------
// System Prompt — Expert-Comptable OHADA
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Tu es Proph3t, un expert-comptable et auditeur certifié spécialisé dans la zone OHADA (17 pays).

COMPÉTENCES PRINCIPALES :
1. SYSCOHADA Révisé 2017 : plan comptable, écritures, états financiers (bilan, compte de résultat, TAFIRE, annexes)
2. Fiscalité multi-pays : IS, TVA, IRPP, retenues à la source, taxes sur salaires pour les 17 pays OHADA
3. Audit : normes ISA, IIA, COSO 2013, contrôle interne, analyse de Benford
4. Droit OHADA : AUDCIF, AUSCGIE, procédures collectives, baux commerciaux
5. Paie et social : bulletins de paie, cotisations CNPS/CSS/IPRES selon le pays
6. Analyse financière : SIG, ratios, CAF, BFR, seuil de rentabilité

RÈGLES :
- Réponds TOUJOURS en français
- Cite tes sources (articles de loi, normes, etc.)
- Pour les calculs, utilise les outils (tool_use) plutôt que le calcul mental
- Si tu ne connais pas la réponse, dis-le clairement
- Adapte tes réponses au pays de l'utilisateur quand c'est pertinent
- Formate les montants en FCFA sans décimales (monnaie CFA)
- Pour les écritures comptables, utilise toujours le format SYSCOHADA`

// ---------------------------------------------------------------------------
// Tool definitions pour function calling
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'calculer_is',
      description: 'Calculer l\'Impôt sur les Sociétés pour un pays OHADA donné',
      parameters: {
        type: 'object',
        properties: {
          countryCode: { type: 'string', description: 'Code pays ISO 2 lettres (CI, SN, CM...)' },
          resultatComptable: { type: 'number', description: 'Résultat comptable avant impôt' },
          reintegrations: { type: 'number', description: 'Réintégrations fiscales', default: 0 },
          deductions: { type: 'number', description: 'Déductions fiscales', default: 0 },
          deficitsAnterieurs: { type: 'number', description: 'Déficits antérieurs reportables', default: 0 },
          chiffreAffaires: { type: 'number', description: 'Chiffre d\'affaires pour le minimum IS' },
          acomptesVerses: { type: 'number', description: 'Acomptes IS déjà versés', default: 0 },
        },
        required: ['countryCode', 'resultatComptable', 'chiffreAffaires'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculer_tva',
      description: 'Calculer la TVA pour un pays OHADA',
      parameters: {
        type: 'object',
        properties: {
          montantHT: { type: 'number', description: 'Montant hors taxes' },
          countryCode: { type: 'string', description: 'Code pays ISO 2 lettres' },
          tauxReduit: { type: 'boolean', description: 'Utiliser le taux réduit', default: false },
        },
        required: ['montantHT', 'countryCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculer_irpp',
      description: 'Calculer l\'IRPP (impôt sur le revenu des personnes physiques)',
      parameters: {
        type: 'object',
        properties: {
          countryCode: { type: 'string' },
          revenuBrutAnnuel: { type: 'number' },
          situationFamiliale: { type: 'string', enum: ['celibataire', 'marie'] },
          nombreEnfants: { type: 'number' },
        },
        required: ['countryCode', 'revenuBrutAnnuel', 'situationFamiliale', 'nombreEnfants'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculer_bulletin_paie',
      description: 'Calculer un bulletin de paie avec cotisations sociales',
      parameters: {
        type: 'object',
        properties: {
          countryCode: { type: 'string' },
          salaireBrut: { type: 'number' },
          primes: { type: 'number', default: 0 },
          estCadre: { type: 'boolean', default: false },
        },
        required: ['countryCode', 'salaireBrut'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generer_ecriture',
      description: 'Générer une écriture comptable SYSCOHADA',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['achat_marchandises', 'achat_services', 'vente_marchandises', 'vente_services', 'salaires', 'reglement_client', 'reglement_fournisseur', 'immobilisation_acquisition', 'dotation_amortissement', 'is_charge', 'tva_declaration'] },
          montantHT: { type: 'number' },
          montantTVA: { type: 'number' },
          tiers: { type: 'string' },
        },
        required: ['type', 'montantHT'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyser_benford',
      description: 'Analyser une série de montants selon la loi de Benford pour détecter des anomalies',
      parameters: {
        type: 'object',
        properties: {
          montants: { type: 'array', items: { type: 'number' }, description: 'Liste des montants à analyser' },
        },
        required: ['montants'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculer_ratios',
      description: 'Calculer les ratios financiers et SIG',
      parameters: {
        type: 'object',
        properties: {
          ventesMarchandises: { type: 'number' },
          achatsMarchandises: { type: 'number' },
          chargesPersonnel: { type: 'number' },
          dotationsAmortissements: { type: 'number' },
          chiffreAffaires: { type: 'number' },
        },
        required: ['chiffreAffaires'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculer_retenue_source',
      description: 'Calculer une retenue à la source (BIC, BNC, dividendes, loyers...)',
      parameters: {
        type: 'object',
        properties: {
          countryCode: { type: 'string' },
          typeRevenu: { type: 'string', enum: ['BIC', 'BNC', 'loyers', 'dividendes', 'interets', 'non_resident'] },
          montantBrut: { type: 'number' },
        },
        required: ['countryCode', 'typeRevenu', 'montantBrut'],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// RAG Search
// ---------------------------------------------------------------------------

async function ragSearch(query: string, countryCode?: string): Promise<string> {
  try {
    // Get embedding for the query
    const embedResponse = await fetch(`${LLM_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: query }),
    })

    if (!embedResponse.ok) {
      console.error('Embedding failed:', await embedResponse.text())
      return ''
    }

    const { embedding } = await embedResponse.json()

    // Search in Supabase
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('search_knowledge', {
      query_embedding: embedding,
      match_count: 5,
      filter_country: countryCode || null,
      similarity_threshold: 0.65,
    })

    if (error || !data || data.length === 0) {
      // Fallback to full-text search
      const { data: ftsData } = await supabase.rpc('search_knowledge_fts', {
        search_query: query,
        match_count: 5,
      })
      if (ftsData && ftsData.length > 0) {
        return ftsData.map((d: any) =>
          `[${d.domain}/${d.subdomain}] ${d.title}\n${d.content}`
        ).join('\n\n---\n\n')
      }
      return ''
    }

    return data.map((d: any) =>
      `[${d.domain}/${d.subdomain}] ${d.title} (similarité: ${(d.similarity * 100).toFixed(0)}%)\n${d.content}\nSource: ${d.source || 'N/A'}`
    ).join('\n\n---\n\n')
  } catch (e) {
    console.error('RAG search error:', e)
    return ''
  }
}

// ---------------------------------------------------------------------------
// LLM Call
// ---------------------------------------------------------------------------

async function callLLM(
  messages: Array<{ role: string; content: string }>,
  tools?: any[],
  stream: boolean = false
): Promise<any> {
  // Ollama /api/chat endpoint
  const response = await fetch(`${LLM_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      tools,
      stream,
      options: {
        temperature: 0.3,
        num_predict: 4096,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`LLM error ${response.status}: ${await response.text()}`)
  }

  if (stream) {
    return response.body
  }

  return await response.json()
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Rate limiting
  const rateLimitResponse = checkRateLimit(getUserIdFromRequest(req));
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authenticate
    const user = await authenticateUser(req)

    // Parse body
    const body = await req.json()
    const { messages, countryCode, stream = false } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages array required', 400, corsHeaders)
    }

    // Get the latest user message for RAG
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''

    // RAG search
    const ragContext = await ragSearch(lastUserMessage, countryCode)

    // Assemble system prompt with RAG context
    let systemPrompt = SYSTEM_PROMPT
    if (ragContext) {
      systemPrompt += `\n\n--- CONTEXTE RAG (base de connaissances) ---\n${ragContext}\n--- FIN CONTEXTE RAG ---`
    }
    if (countryCode) {
      systemPrompt += `\n\nPays de l'utilisateur: ${countryCode}`
    }

    // Build messages array with system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]

    // Call LLM
    const result = await callLLM(fullMessages, TOOLS, stream)

    if (stream && result) {
      // Streaming response
      return new Response(result, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Log conversation
    const supabase = createAdminClient()
    const sessionId = body.sessionId || crypto.randomUUID()

    // Log user message
    await supabase.from('chat_logs').insert({
      user_id: user.id,
      session_id: sessionId,
      role: 'user',
      content: lastUserMessage,
      model: LLM_MODEL,
    })

    // Log assistant response
    const assistantContent = result?.message?.content || ''
    const toolCalls = result?.message?.tool_calls || null

    await supabase.from('chat_logs').insert({
      user_id: user.id,
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls ? JSON.stringify(toolCalls) : null,
      model: LLM_MODEL,
    })

    return new Response(
      JSON.stringify({
        message: result.message,
        sessionId,
        model: LLM_MODEL,
        ragChunksUsed: ragContext ? ragContext.split('---').length : 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(error.message, error.status, corsHeaders)
    }
    console.error('llm-proxy error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      corsHeaders
    )
  }
})
