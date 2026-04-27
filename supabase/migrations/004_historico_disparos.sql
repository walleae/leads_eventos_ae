-- Histórico unificado de todos os disparos (imediatos e agendados)
CREATE TABLE historico_disparos (
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

CREATE INDEX idx_historico_disparos_enviado_em
  ON historico_disparos (enviado_em DESC);
