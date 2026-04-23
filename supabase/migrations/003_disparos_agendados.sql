-- Disparos pontuais agendados para uma data/hora específica
CREATE TABLE disparos_agendados (
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

CREATE INDEX idx_disparos_agendados_pendentes
  ON disparos_agendados (status, agendar_para)
  WHERE status = 'pendente';
