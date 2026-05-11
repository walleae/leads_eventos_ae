-- Torna campos opcionais nullable (não obrigatórios na importação e cadastro)
ALTER TABLE leads ALTER COLUMN email        DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN nome_escola  DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN relacao_escola DROP NOT NULL;
