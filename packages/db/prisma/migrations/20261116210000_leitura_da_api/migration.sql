-- O usuário api_leitura é criado à mão antes desta migração (veja o README).
GRANT USAGE ON SCHEMA public TO api_leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_leitura;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO api_leitura;
