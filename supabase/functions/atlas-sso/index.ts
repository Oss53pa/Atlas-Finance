/**
 * Edge Function: atlas-sso
 * Receives a JWT from Atlas Studio, validates it, and creates/finds a local
 * Supabase user + profile. Returns a magic link token_hash so the frontend
 * can establish a session via supabase.auth.verifyOtp().
 *
 * Deploy: supabase functions deploy atlas-sso
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAtlasJWT } from "../_shared/jwt.ts";
import { getCorsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const jwtSecret = Deno.env.get("JWT_SECRET")!;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, origin);
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return errorResponse("Token manquant", 400, origin);
    }

    // 1. Validate the Atlas Studio JWT
    const claims = await verifyAtlasJWT(token, jwtSecret);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Find or create user in Supabase Auth
    let userId: string;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === claims.email
    );

    if (existingUser) {
      userId = existingUser.id;
      // Update metadata with latest Atlas Studio info
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: claims.fullName,
          atlas_studio_id: claims.userId,
        },
      });
    } else {
      // Create new user with a random password (they'll always login via SSO)
      const randomPassword = crypto.randomUUID() + "!Aa1";
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: claims.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            full_name: claims.fullName,
            atlas_studio_id: claims.userId,
          },
        });

      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return errorResponse("Impossible de créer l'utilisateur", 500, origin);
      }
      userId = newUser.user.id;
    }

    // 3. Ensure profile exists with admin role
    const { data: adminRole } = await supabase
      .from("roles")
      .select("id")
      .eq("code", "admin")
      .single();

    if (!adminRole) {
      return errorResponse("Rôle admin introuvable dans la base", 500, origin);
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingProfile) {
      // Update existing profile
      await supabase
        .from("profiles")
        .update({
          email: claims.email,
          first_name: claims.fullName.split(" ")[0] || claims.fullName,
          last_name: claims.fullName.split(" ").slice(1).join(" ") || "",
          role_id: adminRole.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      // Create new profile
      await supabase.from("profiles").insert({
        id: userId,
        email: claims.email,
        username: claims.email.split("@")[0],
        first_name: claims.fullName.split(" ")[0] || claims.fullName,
        last_name: claims.fullName.split(" ").slice(1).join(" ") || "",
        role_id: adminRole.id,
        is_active: true,
      });
    }

    // 4. Generate magic link to create a session
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: claims.email,
      });

    if (linkError || !linkData) {
      console.error("Generate link error:", linkError);
      return errorResponse("Impossible de générer le lien de connexion", 500, origin);
    }

    // Extract token_hash from the generated link
    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get("token_hash") || url.hash;

    return jsonResponse({
      token_hash: tokenHash,
      email: claims.email,
      type: "magiclink",
    }, 200, origin);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erreur interne";
    console.error("atlas-sso error:", error);
    return errorResponse(message, 401, origin);
  }
});
