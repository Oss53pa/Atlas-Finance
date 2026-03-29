export interface AtlasStudioClaims {
  userId: string;
  email: string;
  fullName: string;
  appId: string;
  plan: string;
  iat: number;
  exp: number;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifyAtlasJWT(
  token: string,
  secret: string
): Promise<AtlasStudioClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Format JWT invalide");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature (HMAC-SHA256)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify("HMAC", key, signature, data);
  if (!valid) {
    throw new Error("Signature JWT invalide");
  }

  // Decode payload
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const claims: AtlasStudioClaims = JSON.parse(payloadJson);

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) {
    throw new Error("Token expiré");
  }

  // Verify required fields
  if (!claims.email || !claims.appId) {
    throw new Error("Claims JWT manquants (email, appId)");
  }

  // Verify this token is for atlas-compta
  if (claims.appId !== "atlas-compta") {
    throw new Error(`Token destiné à ${claims.appId}, pas à atlas-compta`);
  }

  return claims;
}
