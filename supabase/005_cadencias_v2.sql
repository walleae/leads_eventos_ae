-- ============================================================
-- Migração v2: cadências baseadas em delay desde criação do lead
-- Cole no Supabase SQL Editor e execute.
-- ============================================================

-- 1. Tabela de segmentos
CREATE TABLE IF NOT EXISTS segmentos (
  id            TEXT    PRIMARY KEY,
  label         TEXT    NOT NULL,
  cadencia_ativa BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO segmentos (id, label) VALUES
  ('novos',        'Novos leads'),
  ('quentes',      'Leads quentes'),
  ('mornos',       'Leads mornos'),
  ('frios',        'Leads frios'),
  ('aquecimento',  'Em aquecimento'),
  ('proposta',     'Proposta enviada'),
  ('negociacao',   'Em negociação'),
  ('convertidos',  'Convertidos'),
  ('clientes',     'Já é cliente')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE segmentos DISABLE ROW LEVEL SECURITY;

-- 2. Alterar tabela cadencias: trocar dias_semana/horario/ultima_execucao por delay
ALTER TABLE cadencias
  DROP COLUMN IF EXISTS dias_semana,
  DROP COLUMN IF EXISTS horario,
  DROP COLUMN IF EXISTS ultima_execucao,
  ADD COLUMN IF NOT EXISTS delay_valor   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS delay_unidade TEXT    NOT NULL DEFAULT 'dias'
    CHECK (delay_unidade IN ('horas', 'dias'));

-- 3. Tabela de controle: quais leads já receberam cada cadência
CREATE TABLE IF NOT EXISTS cadencias_leads (
  cadencia_id UUID        NOT NULL REFERENCES cadencias(id) ON DELETE CASCADE,
  lead_id     UUID        NOT NULL REFERENCES leads(id)     ON DELETE CASCADE,
  enviado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cadencia_id, lead_id)
);

ALTER TABLE cadencias_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_cadencias_leads" ON cadencias_leads
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cadencias_leads_cadencia
  ON cadencias_leads(cadencia_id);
