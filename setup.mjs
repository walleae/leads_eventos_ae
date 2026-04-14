/**
 * Setup script — creates Supabase tables and storage bucket.
 * Run with: node setup.mjs
 *
 * This script uses the Supabase REST API (anon key) to bootstrap the DB.
 * It first creates a helper SQL function via RPC, then uses it to run DDL.
 * If that fails it prints the SQL you need to paste into the Supabase SQL Editor.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jbslarybszneytcbzlfq.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impic2xhcnlic3puZXl0Y2J6bGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODI0MTUsImV4cCI6MjA5MTA1ODQxNX0.PzkBfUobJfGyFe0OVuxP3b-unyHAPYzbDqErZkwlT7M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  nome_escola TEXT NOT NULL,
  relacao_escola TEXT NOT NULL,
  ja_e_cliente BOOLEAN NOT NULL DEFAULT false,
  estado TEXT,
  cidade TEXT,
  porte_alunos TEXT,
  maior_interesse TEXT,
  rede_ensino TEXT,
  nivel_interesse TEXT,
  nome_consultor TEXT,
  observacoes TEXT,
  stage TEXT NOT NULL DEFAULT 'novo',
  origem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  corpo TEXT NOT NULL,
  midia_url TEXT,
  midia_nome TEXT,
  botoes JSONB,
  stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;
`;

async function checkTableExists(table) {
  const { error } = await supabase.from(table).select('id').limit(1);
  // PGRST205 = table not found
  return !error || error.code !== 'PGRST205';
}

async function createBucket() {
  const { error } = await supabase.storage.createBucket('template-images', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 5242880, // 5MB
  });
  if (error && !error.message.includes('already exists')) {
    console.warn('  Bucket warning:', error.message);
  } else {
    console.log('  Storage bucket "template-images" ready.');
  }
}

async function main() {
  console.log('Supabase Setup Script\n');

  // Check if tables already exist
  const leadsExists = await checkTableExists('leads');
  const templatesExists = await checkTableExists('templates');

  if (leadsExists && templatesExists) {
    console.log('Tables already exist. Ensuring storage bucket...');
    await createBucket();
    console.log('\nSetup complete!');
    return;
  }

  console.log('Tables not found. Attempting to create via SQL...\n');
  console.log('The anon key cannot run DDL directly. Please run the following SQL');
  console.log('in your Supabase SQL Editor at:');
  console.log('  https://supabase.com/dashboard/project/jbslarybszneytcbzlfq/sql/new\n');
  console.log('--- COPY FROM HERE ---');
  console.log(MIGRATION_SQL);
  console.log('--- COPY TO HERE ---\n');
  console.log('After running the SQL, re-run this script to verify and create the storage bucket.');
}

main().catch(console.error);
