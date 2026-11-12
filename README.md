# Estatísticas de Futebol

Coletor e API REST de estatísticas (gols, chutes ao gol, cartões) das cinco principais ligas europeias. Vocabulário em [`GLOSSARY.md`](GLOSSARY.md) e decisões em [`docs/adr/`](docs/adr/).

## Ambiente local

Pré-requisitos: Node 24 ou mais novo, Docker e [gitleaks](https://github.com/gitleaks/gitleaks#installing).

O gitleaks roda no hook de pre-commit e barra o commit se não estiver instalado. No Linux, baixe o binário da [página de releases](https://github.com/gitleaks/gitleaks/releases) e coloque-o no `PATH`, por exemplo em `~/.local/bin`. Confira com `gitleaks version`.

```bash
npm install          # instala as dependências, gera o client do Prisma e instala o hook de pre-commit
cp .env.example .env # depois troque USUARIO e SENHA: no Postgres local, os dois são "estatisticas"
npm run db:up        # sobe o Postgres 17 na porta 5433, com os bancos de desenvolvimento e de teste
npm run db:migrate   # aplica as migrações no banco de desenvolvimento (precisa de DATABASE_URL no .env)
```

## Checagens

```bash
npm run lint
npm run typecheck
npm test             # precisa do Postgres no ar (npm run db:up)
```

O CI roda as mesmas checagens e o gitleaks em cada pull request e em cada push na `main`.
