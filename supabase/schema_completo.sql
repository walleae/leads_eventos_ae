-- ============================================================
-- Schema completo - leads_eventos_ae
-- Cole este script inteiro no Supabase SQL Editor e execute.
-- ============================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. Tabela: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  telefone        TEXT        NOT NULL,
  nome_escola     TEXT        NOT NULL,
  relacao_escola  TEXT        NOT NULL,
  ja_e_cliente    BOOLEAN     NOT NULL DEFAULT false,
  estado          TEXT,
  cidade          TEXT,
  porte_alunos    TEXT,
  maior_interesse TEXT,
  rede_ensino     TEXT,
  nivel_interesse TEXT,
  nome_consultor  TEXT,
  observacoes     TEXT,
  stage           TEXT        NOT NULL DEFAULT 'novo',
  origem          TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Tabela: templates
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT        NOT NULL,
  corpo       TEXT        NOT NULL,
  midia_url   TEXT,
  midia_nome  TEXT,
  botoes      JSONB,
  stage       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE templates DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Tabela: cadencias
-- ============================================================
CREATE TABLE IF NOT EXISTS cadencias (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL,
  template_nome   TEXT        NOT NULL,
  template_corpo  TEXT        NOT NULL,
  has_image       BOOLEAN     NOT NULL DEFAULT false,
  image_url       TEXT,
  segmento_ids    TEXT[]      NOT NULL DEFAULT '{}',
  origem_ids      TEXT[]      NOT NULL DEFAULT '{}',
  -- dias_semana: 0=dom 1=seg 2=ter 3=qua 4=qui 5=sex 6=sab
  dias_semana     INTEGER[]   NOT NULL,
  -- horario: hora em fuso Brasília (BRT, UTC-3), 0-23
  horario         INTEGER     NOT NULL CHECK (horario >= 0 AND horario <= 23),
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  ultima_execucao TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cadencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_cadencias" ON cadencias
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Tabela: disparos_agendados
-- ============================================================
CREATE TABLE IF NOT EXISTS disparos_agendados (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_nome   TEXT        NOT NULL,
  template_corpo  TEXT        NOT NULL,
  has_image       BOOLEAN     NOT NULL DEFAULT false,
  image_url       TEXT,
  segmento        TEXT        NOT NULL DEFAULT 'todos',
  leads_json      JSONB       NOT NULL DEFAULT '[]',
  agendar_para    TIMESTAMPTZ NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  enviado_em      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE disparos_agendados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_disparos_agendados" ON disparos_agendados
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_disparos_agendados_pendentes
  ON disparos_agendados (status, agendar_para)
  WHERE status = 'pendente';

-- ============================================================
-- 6. Tabela: historico_disparos
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_disparos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  template_nome TEXT        NOT NULL,
  segmento      TEXT        NOT NULL DEFAULT 'todos',
  total_leads   INTEGER     NOT NULL DEFAULT 0,
  leads_json    JSONB       NOT NULL DEFAULT '[]',
  tipo          TEXT        NOT NULL DEFAULT 'imediato' CHECK (tipo IN ('imediato', 'agendado')),
  status        TEXT        NOT NULL DEFAULT 'enviado'  CHECK (status IN ('enviado', 'erro')),
  agendado_para TIMESTAMPTZ,
  enviado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE historico_disparos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_historico_disparos" ON historico_disparos
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_historico_disparos_enviado_em
  ON historico_disparos (enviado_em DESC);

-- ============================================================
-- 7. Storage bucket para imagens de templates
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;
