# AGENTS.md

Coletor e API REST de estatísticas (gols, chutes ao gol, cartões) das cinco principais ligas europeias. Vocabulário do domínio em `GLOSSARY.md`; decisões de arquitetura em `docs/adr/`.

## Decisões

Não tome decisões de design ou de produto sozinho. Toda decisão que o mantenedor ainda não tomou (regra de domínio, contrato da API, comportamento em caso de erro, infraestrutura) deve ser perguntada antes de entrar em código, spec, issue ou documentação. As decisões já tomadas estão nas ADRs de `docs/adr/`: confira-as antes de perguntar e registre cada nova resposta numa ADR, nova ou existente.

## Agent skills

### Issue tracker

Issues e specs ficam no GitHub Issues de `fabiolinsdev/estatisticas-futebol`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Os cinco labels canônicos, com os nomes padrão (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: um `GLOSSARY.md` e `docs/adr/` na raiz. See `docs/agents/domain.md`.
