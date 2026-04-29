import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseMisconfigured = !SUPABASE_URL || !SUPABASE_KEY;

export const supabase = supabaseMisconfigured
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(SUPABASE_URL, SUPABASE_KEY);
