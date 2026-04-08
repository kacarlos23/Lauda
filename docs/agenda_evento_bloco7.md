# Agenda Base e Evolucao de Culto para Evento

## Mapeamento de `Culto`

### Pode virar agenda base
- `nome`
- `data`
- `horario_inicio`
- `horario_termino`
- `local`
- `status`
- `ministerio`
- `igreja` derivada do ministerio

### Continua no modulo de musica
- relacao com `Escala`
- relacao com `ItemSetlist`
- permissoes operacionais de culto musical
- fluxo de repertorio e montagem de setlist

## Definicao oficial de `Evento`

`Evento` representa um compromisso institucional compartilhavel da igreja ou de um ministerio, com dados genericos de agenda e sem acoplar regras especificas de modulo.

## Estrategia de convivencia escolhida

- `Culto` continua sendo a entidade operacional do modulo de musica.
- `Culto` passa a referenciar um `Evento` base sincronizado.
- o core conhece e lista `Evento`.
- o modulo de musica continua usando `Culto`, `Escala` e `ItemSetlist`.

## Regras deste bloco

- nenhuma rota legada de `Culto` foi renomeada ou removida;
- a agenda base nasce no core via `api.services.agenda`;
- o dashboard pode consumir `Evento` sem trocar a tela operacional de cultos;
- a sincronizacao `Culto -> Evento` prepara a migracao futura sem executar a migracao total agora.
