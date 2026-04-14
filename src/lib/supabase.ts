import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

console.log('[Supabase] URL definida?', !!supabaseUrl, '| KEY definida?', !!supabaseAnonKey);

const FALLBACK_URL = 'https://jbslarybszneytcbzlfq.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impic2xhcnlic3puZXl0Y2J6bGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODI0MTUsImV4cCI6MjA5MTA1ODQxNX0.PzkBfUobJfGyFe0OVuxP3b-unyHAPYzbDqErZkwlT7M';

export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY,
);
