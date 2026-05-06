-- Remove duplicatas de leads mantendo o registro mais recente por telefone
DELETE FROM leads
WHERE id NOT IN (
  SELECT DISTINCT ON (telefone) id
  FROM leads
  ORDER BY telefone, created_at DESC
);

-- Adiciona constraint UNIQUE no telefone para impedir duplicatas futuras
-- (necessário para o upsert com onConflict: 'telefone' funcionar corretamente)
ALTER TABLE leads ADD CONSTRAINT leads_telefone_unique UNIQUE (telefone);
