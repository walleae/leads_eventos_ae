-- ============================================================
-- Migração 006: segmentos passam a ser as origens dos leads
-- Cole no Supabase SQL Editor e execute.
-- ============================================================

-- Remove segmentos hardcoded da migração anterior
DELETE FROM segmentos
WHERE id IN ('quentes','mornos','frios','proposta','negociacao','aquecimento','clientes','convertidos','novos');

-- Popula com as origens únicas já existentes nos leads
INSERT INTO segmentos (id, label, cadencia_ativa)
SELECT DISTINCT origem, origem, false
FROM leads
WHERE origem IS NOT NULL AND origem != ''
ON CONFLICT (id) DO NOTHING;
