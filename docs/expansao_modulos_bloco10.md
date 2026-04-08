# Expansao Gradual de Modulos

## Proximo modulo prioritario
- Modulo escolhido: `events`
- Nome operacional: `Eventos`
- Motivo da escolha:
  - valor direto para a igreja via agenda institucional, conferencias, retiros e acoes internas;
  - alta proximidade com o uso atual porque `Evento` ja existe no core desde o bloco 7;
  - reaproveitamento forte de `igreja`, `ministerio`, memberships, sessao, auditoria e shell;
  - risco baixo porque a base de agenda ja foi separada do modulo de musica.

## Objetivo e escopo do modulo
- Objetivo: transformar a agenda base em um modulo institucional de eventos sem duplicar o core nem reescrever musica.
- Quem usa:
  - administracao da igreja
  - liderancas ministeriais
  - equipes operacionais de apoio
- Acoes principais:
  - planejar eventos
  - publicar agenda institucional
  - acompanhar execucao operacional
  - organizar checklists e equipes de apoio
- Dados proprios do modulo:
  - tipos de evento
  - publico alvo
  - status operacional
  - checklists
  - inscricoes
- Dados vindos do core:
  - igreja
  - ministerio
  - evento base
  - memberships
  - sessao
  - capabilities
  - modulos ativos
  - auditoria

## Reuso obrigatorio do core
- `Igreja`
- `Ministerio`
- `VinculoIgrejaUsuario`
- `VinculoMinisterioUsuario`
- payload de sessao
- capabilities
- `IgrejaModulo`
- shell e navegacao principal
- auditoria por escopo
- servicos base de API

## O que fica especifico do modulo `events`
- entidades operacionais de evento
- regras de inscricao e acompanhamento
- telas dedicadas do modulo
- fluxos de comunicacao e checklist
- capabilities especificas somente quando o dominio real exigir

## Checklist oficial de criacao de modulo
- registrar modulo no catalogo
- habilitar modulo por igreja
- definir capabilities do modulo
- criar rotas backend e frontend
- criar telas do modulo
- conectar ao core institucional
- validar navegacao
- validar permissoes
- validar auditoria
- executar testes e build

## Guardrails deste bloco
- somente um proximo modulo fica aberto: `events`
- musica continua sendo o unico modulo operacional completo
- nenhum fluxo de musica foi movido ou duplicado
- o catalogo oficial e o registry frontend agora suportam novos modulos sem reabrir arquitetura
