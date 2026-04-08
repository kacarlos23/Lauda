# Governanca de Dados e Observabilidade

## Ownership dos dados

### Plataforma
- catalogo de modulos
- configuracoes globais do produto
- observabilidade agregada

### Igreja
- identidade institucional
- configuracoes da igreja
- agenda institucional base
- membros vinculados a igreja

### Ministerio
- usuarios no contexto operacional do ministerio
- cultos e eventos departamentais
- equipes e convites do ministerio

### Modulo
- catalogo musical ativo
- escalas
- setlists
- metadados especificos do modulo de musica

## Auditoria por escopo

- `LogAuditoria` agora registra, quando aplicavel:
  - `igreja`
  - `ministerio`
  - `modulo`
  - `escopo`
  - `usuario`
  - `acao`
- a leitura administrativa continua centralizada em `/api/auditoria/`
- metricas e erros de API ficam acessiveis por:
  - `/api/auditoria/resumo/`
  - `/api/auditoria/metricas/`
  - `/api/auditoria/erros-api/`

## Queries criticas revisadas

- login e sessao por username/token
- carregamento de contexto institucional por vinculo e ministerio
- modulos ativos por igreja
- listagem principal do modulo de musica
- auditoria e observabilidade por escopo

## Indices adicionados

- contexto institucional:
  - usuario ativo por ministerio/nivel
  - vinculos ativos de igreja e ministerio
  - modulos ativos por igreja
- agenda e modulo:
  - evento por igreja/ministerio/status/data
  - culto por ministerio/status/data
  - escala por ministerio/status e por culto+membro
  - setlist por ministerio+culto+ordem
  - musica por ativo/classificacao e artista+titulo
- auditoria e erros:
  - auditoria por escopo, igreja, ministerio, modulo, usuario e acao
  - erros de API por status, rota, igreja, ministerio e modulo

## Metricas minimas

- quantidade de igrejas ativas
- quantidade de modulos ativos por igreja
- quantidade de usuarios por igreja
- uso do modulo de musica
- quantidade de cultos, eventos, escalas e setlists
- erros de API mais frequentes dos ultimos 7 dias

## Storage

- arquivos binarios atuais:
  - `Usuario.foto_perfil`
  - `Musica.cifra_pdf`
- estrategia recomendada:
  - manter metadados e caminhos no banco
  - mover arquivos para storage externo/objeto quando o deploy sair do ambiente local
  - nao tratar upload binario como problema do banco relacional
