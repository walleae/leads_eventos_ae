import { createClient } from '@supabase/supabase-js';

const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
console.log('[Supabase] URL raw (primeiros 30 chars):', JSON.stringify(raw?.slice(0, 30)));

// Credenciais hardcoded como fallback garantido caso env vars falhem no build
const SUPABASE_URL = 'https://jbslarybszneytcbzlfq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impic2xhcnlic3puZXl0Y2J6bGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODI0MTUsImV4cCI6MjA5MTA1ODQxNX0.PzkBfUobJfGyFe0OVuxP3b-unyHAPYzbDqErZkwlT7M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
