# Coletor em produção: Neon, usuários de banco e workflow agendado

O banco de produção é um projeto Neon no plano gratuito, criado direto no neon.com, com Postgres 17 na região AWS São Paulo (`aws-sa-east-1`), a mesma da função da API na Vercel (`gru1`). A conexão com a Vercel é manual: a integração do Marketplace injetaria no projeto da Vercel a credencial dona do banco e criaria branches do banco para os previews, contra a ADR-0002.

Há dois usuários de banco. O dono do projeto Neon escreve: aplica as migrações e coleta. O `api_leitura` só lê, e é o usuário da API. Ele é criado por SQL, porque os usuários criados pelo painel do Neon entram no `neon_superuser` e seriam administradores. A senha é definida com o `\password` do `psql`, que manda ao servidor só o hash, sem passar pelo histórico do SQL Editor do Neon nem pelo Git. As permissões ficam numa migração (`leitura_da_api`): uso do schema `public`, `SELECT` em todas as tabelas e o mesmo `SELECT` por padrão nas tabelas que as próximas migrações criarem. A migração exige que o usuário já exista. Nos testes e no CI, o setup dos testes cria um `api_leitura` sem login. Num volume Docker novo, o script de inicialização do Postgres local também cria. Toda conexão com o Neon usa TLS com `sslmode=verify-full`, que confere o certificado e o nome do servidor. A string do painel traz `sslmode=require`, que o `pg` hoje trata como `verify-full`, mas que numa versão futura vai seguir o libpq e criptografar sem conferir o certificado. Por isso as URLs de produção (o secret do coletor e a variável da Vercel) trocam o `require` por `verify-full`, que o `pg` e o Prisma aceitam. O `psql` da imagem `postgres:17`, usado só para criar o `api_leitura`, não traz os certificados raiz e segue com a string do painel.

O workflow `Coleta` roda no minuto 17 de cada 3 horas, em UTC (`17 */3 * * *`), porque o GitHub costuma atrasar as execuções na hora cheia, e também por disparo manual. Ele instala as dependências, aplica as migrações (`npm run db:migrate`) e coleta (`npm run collect`), com o Node 24 rodando o TypeScript direto. Duas coletas nunca rodam ao mesmo tempo (`concurrency`, sem cancelar a que já está rodando), e cada execução tem limite de 20 minutos. O `DATABASE_URL` do dono, sem pooling, fica só como secret do Environment `producao` do GitHub, liberado apenas para a branch `main`: um workflow disparado de outra branch não enxerga o secret. Uma Liga com falha faz o `npm run collect` terminar com código 1, o workflow fica falho, e o GitHub manda o e-mail de falha.

## Considered Options

- **Neon pelo Marketplace da Vercel**, apagando as variáveis injetadas: descartado, porque a integração continuaria com acesso de dono e criaria branches de banco para os previews.
- **Regiões EUA Leste ou Europa**: descartadas em favor de São Paulo, mais perto de quem está no Brasil.
- **Usuário somente leitura criado e configurado por um script SQL no README**: descartado em favor da migração, que versiona as permissões junto com o schema.
- **Secret comum do repositório**: descartado em favor do Environment liberado só para a `main`.
- **Execução na hora cheia**: descartada pelos atrasos do GitHub nesse horário.

## Consequences

- Antes da primeira execução do workflow, o `api_leitura` precisa existir no Neon, senão a migração `leitura_da_api` falha. O README descreve a ordem dos passos.
- Um volume Docker local antigo não tem o `api_leitura` com login. O `npm test` cria um sem login, o que basta para as migrações.
- O GitHub manda o e-mail de falha de um workflow agendado para quem mexeu por último no `cron`, e só se as notificações de Actions estiverem ligadas na conta.
- Cada execução cria um registro de deploy no Environment `producao`.
- O GitHub desativa workflows agendados depois de 60 dias sem atividade no repositório (ADR-0002).
