import { useState, useEffect } from 'react';

// Core Atlas Studio — URL publique (non secrète), surchargeable par env.
const ATLAS_SUPABASE_URL =
  (import.meta.env.VITE_ATLAS_SUPABASE_URL as string | undefined) ||
  'https://vgtmljfayiysuvrcmunt.supabase.co';
// Anon key du core : UNIQUEMENT via env (jamais commitée). Voir .env.example.
const ATLAS_ANON_KEY = (import.meta.env.VITE_ATLAS_SUPABASE_ANON_KEY as string | undefined) || '';

interface LandingSection { app_id: string; section: string; data: Record<string, any>; }
interface LandingContent { [key: string]: Record<string, any> | undefined; }

export function useLandingContent(appId: string) {
  const [content, setContent] = useState<LandingContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sans clé anon configurée, on no-op proprement (évite un fetch 401).
    if (!ATLAS_ANON_KEY) { setLoading(false); return; }
    fetch(`${ATLAS_SUPABASE_URL}/rest/v1/app_landing_content?app_id=eq.${appId}&is_active=eq.true&order=sort_order`,
      { headers: { apikey: ATLAS_ANON_KEY, 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then((rows: LandingSection[]) => {
        const map: LandingContent = {};
        rows.forEach(r => { map[r.section] = r.data; });
        setContent(map);
      })
      .catch(err => console.error('useLandingContent error:', err))
      .finally(() => setLoading(false));
  }, [appId]);

  return { content, loading };
}
