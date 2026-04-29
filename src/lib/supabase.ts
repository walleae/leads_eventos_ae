import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const isValidUrl = (url: string) => { try { new URL(url); return true; } catch { return false; } };

export const supabaseError: string | null =
  !SUPABASE_URL ? 'VITE_SUPABASE_URL não definida.' :
  !isValidUrl(SUPABASE_URL) ? `VITE_SUPABASE_URL inválida: "${SUPABASE_URL}"` :
  !SUPABASE_KEY ? 'VITE_SUPABASE_ANON_KEY não definida.' :
  null;

export const supabase = supabaseError
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(SUPABASE_URL, SUPABASE_KEY);
