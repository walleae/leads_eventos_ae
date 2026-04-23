-- Módulo de cadências: disparos automáticos agendados por dia/hora
CREATE TABLE cadencias (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL,
  template_nome   TEXT        NOT NULL,
  template_corpo  TEXT        NOT NULL,
  has_image       BOOLEAN     NOT NULL DEFAULT false,
  image_url       TEXT,
  segmento_ids    TEXT[]      NOT NULL DEFAULT '{}',
  origem_ids      TEXT[]      NOT NULL DEFAULT '{}',
  -- dias_semana: array de inteiros, 0=dom 1=seg 2=ter 3=qua 4=qui 5=sex 6=sab
  dias_semana     INTEGER[]   NOT NULL,
  -- horario: hora do dia em fuso Brasília (BRT, UTC-3), formato "HH"
  horario         INTEGER     NOT NULL CHECK (horario >= 0 AND horario <= 23),
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  ultima_execucao TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cadencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_cadencias" ON cadencias
  FOR ALL USING (true) WITH CHECK (true);
