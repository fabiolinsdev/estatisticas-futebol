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

As migrações exigem o usuário `api_leitura`, criado pelo Docker num volume novo. Num volume antigo, rode `npm test` uma vez antes do `db:migrate`: o setup dos testes cria o usuário.

## Coleta manual

```bash
npm run db:migrate   # aplica as migrações pendentes
npm run collect      # baixa os CSVs reais do football-data.co.uk e grava no banco do DATABASE_URL
```

O comando imprime uma linha por Liga e termina com código 1 se alguma Liga falhar. Um arquivo que não mudou desde a última coleta não é regravado.

Para subir a API localmente na porta 3000 (ou na do `PORT`), com o banco do `DATABASE_URL`:

```bash
npm run api
```

## Produção

Passos manuais, feitos uma vez pelo mantenedor, na ordem abaixo. As decisões estão nas ADRs 0002, 0011 e 0012.

### 1. Banco no Neon

1. Crie uma conta em [console.neon.tech](https://console.neon.tech) (plano gratuito) e um projeto com Postgres 17, na região **AWS São Paulo (`aws-sa-east-1`)**, com o banco `estatisticas`. Não use a integração do Marketplace da Vercel.
2. No botão **Connect** do projeto, escolha o banco `estatisticas` e o usuário dono (o criado com o projeto), **desligue o connection pooling** e copie a string de conexão. Esta é a credencial de escrita: ela vai só para o GitHub (passo 3) e nunca para a Vercel nem para o Git.

### 2. Usuário somente leitura da API

Crie o `api_leitura` por SQL. Um usuário criado pelo painel do Neon seria administrador (`neon_superuser`). Use o `psql` do container do Postgres, com a string do dono:

```bash
docker run --rm -it postgres:17 psql "<string de conexão do dono>"
```

```sql
CREATE ROLE api_leitura LOGIN;
\password api_leitura
```

O `\password` pede a senha duas vezes e manda só o hash ao servidor. Gere uma senha forte (por exemplo, `openssl rand -hex 32`) e guarde-a para a Vercel. As permissões de leitura vêm da migração `leitura_da_api`, aplicada pelo workflow no passo 4. Por isso o usuário precisa existir antes da primeira coleta.

### 3. Secret do coletor no GitHub

A credencial de escrita fica no Environment `producao`, liberado só para a branch `main`:

```bash
gh api -X PUT repos/fabiolinsdev/estatisticas-futebol/environments/producao \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
gh api -X POST repos/fabiolinsdev/estatisticas-futebol/environments/producao/deployment-branch-policies \
  -f name=main -f type=branch
gh secret set DATABASE_URL --env producao   # cole a string do dono, sem pooling
```

### 4. Primeira coleta

O workflow [`Coleta`](.github/workflows/coleta.yml) roda no minuto 17 de cada 3 horas (UTC): aplica as migrações e coleta. Para rodar agora:

```bash
gh workflow run coleta.yml && gh run watch
```

Uma coleta com falha deixa o workflow falho, e o GitHub manda um e-mail para quem mexeu por último no agendamento. Confira se as notificações de Actions estão ligadas em [github.com/settings/notifications](https://github.com/settings/notifications).

### 5. API na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório `fabiolinsdev/estatisticas-futebol`. Em **Root Directory**, escolha `apps/api`. O framework detectado deve ser o Fastify.
2. Em **Environment Variables**, cadastre as duas variáveis para **Production** e **Preview**:
   - `DATABASE_URL`: a string do `api_leitura` **com pooling** (o host termina em `-pooler`), no formato `postgresql://api_leitura:<senha>@<host-pooler>/estatisticas?sslmode=require`. Nunca use a string do dono aqui.
   - `TEAM_MATCHES_ENABLED`: `true` (ADR-0005).
3. Faça o deploy. Em **Settings → Build and Deployment**, confira se o **Node.js Version** é 24.x. A região da função (`gru1`, São Paulo) vem do `apps/api/vercel.json`.

A produção é atualizada a cada push na `main`, e cada pull request ganha um preview que lê o mesmo banco, sem poder escrever nele.

### 6. Limite de requisições no firewall da Vercel

No projeto, abra **Firewall → Configure → + New Rule** e preencha:

- **Name**: `Limite por IP`
- **If**: `Request Path` `starts with` `/`
- **Then**: `Rate Limit`, estratégia **Fixed Window**, **Time Window** `60s`, **Request Limit** `60`, chave **IP**, ação **Too Many Requests (429)**

Salve com **Save Rule** e publique com **Review Changes → Publish**. Para conferir, a 61ª requisição dentro de um minuto deve responder 429:

```bash
for i in $(seq 1 61); do curl -s -o /dev/null -w "%{http_code}\n" https://<domínio da API>/leagues; done | sort | uniq -c
```

## Checagens

```bash
npm run lint
npm run typecheck
npm test             # precisa do Postgres no ar (npm run db:up)
```

O CI roda as mesmas checagens e o gitleaks em cada pull request e em cada push na `main`.
