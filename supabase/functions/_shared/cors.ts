// ALLOWED_ORIGIN must be set in production (e.g. https://app.atlas-finance.com).
// If unset the fallback is an empty string, which means no Access-Control-Allow-Origin
// header is emitted — browsers will block cross-origin requests, which is the safe default.
const envAllowedOrigin: string =
  (typeof process !== 'undefined' && process.env?.ALLOWED_ORIGIN) ||
  Deno.env.get('ALLOWED_ORIGIN') ||
  '';

const allowedOrigins: string[] = [
  'https://atlas-finance.vercel.app',
  'https://app.atlas-finance.com',
  ...(envAllowedOrigin ? [envAllowedOrigin] : []),
];

export function getCorsHeaders(origin: string): Record<string, string> {
  const matched = allowedOrigins.includes(origin) ? origin : envAllowedOrigin;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
  // Only add the header when we have a valid origin to reflect — never expose '*' with credentials.
  if (matched) {
    headers['Access-Control-Allow-Origin'] = matched;
  }
  return headers;
}

// Backwards compat — safe fallback: no wildcard, no localhost leak.
const _corsOrigin = envAllowedOrigin || allowedOrigins[0] || '';
export const corsHeaders: Record<string, string> = {
  ...(_corsOrigin ? { 'Access-Control-Allow-Origin': _corsOrigin } : {}),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(data: unknown, status = 200, origin?: string) {
  const headers = origin ? getCorsHeaders(origin) : corsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400, origin?: string) {
  return jsonResponse({ error: message }, status, origin);
}
