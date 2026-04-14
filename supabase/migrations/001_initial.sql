-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leads table
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

-- Templates table
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

-- Disable RLS (internal tool, no auth needed)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;

-- Storage bucket for template images
-- Run this in Supabase SQL Editor or via the dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true)
-- ON CONFLICT (id) DO NOTHING;
