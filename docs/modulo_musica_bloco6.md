# Consolidacao do Modulo de Musica

## Inventario do modulo

### Fluxo de musicas
- Estavel:
  listagem, busca, visualizacao, enriquecimento de metadados, desativacao.
- Consolidado neste bloco:
  escrita alinhada com capabilities do modulo e feedback de carregamento/erro mais explicito.

### Fluxo de cultos
- Estavel:
  criacao, edicao, exclusao, visualizacao em grid e calendario.
- Consolidado neste bloco:
  escrita ligada a capability propria de cultos e mensagens de erro centralizadas na pagina.

### Fluxo de escalas
- Estavel:
  visualizacao de escalados e remocao.
- Consolidado neste bloco:
  permissao separada para operacoes de escala e contrato de UI explicito em `EscalaModal`.

### Fluxo de setlists
- Estavel:
  abertura da setlist, adicao/remocao de musicas, edicao de tom e observacoes.
- Consolidado neste bloco:
  permissao separada para setlists, modo leitura preservado e feedback de erro explicito.

## Contrato entre core e musica
- musica consome:
  sessao, usuario autenticado, ministerio atual, igreja atual, capabilities, modulos ativos e shell.
- core fornece:
  auth, escopo, payload, permissions hook, route guards, app shell e API base.
- musica nao redefine:
  contexto institucional, resolucao de escopo ou modulos ativos.

## Decisoes deste bloco
- catalogo de musicas continua global.
- recursos operacionais continuam ministeriais:
  cultos, escalas e setlists.
- fallback legado continua existindo apenas onde a camada nova ainda depende de compatibilidade.
