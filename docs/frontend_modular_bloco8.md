# Frontend Modular Bloco 8

## Inventario de pontos adaptados

### Hard-codes de musica encontrados
- shell principal usando o modulo de musica como identidade visual principal
- troca de escopo do admin global redirecionando sempre para `/app/cultos`
- guards administrativos presos a suposicoes antigas em vez de capabilities
- dashboard e navegacao principal sem separacao clara entre institucional, operacional e modular

## Decisoes deste bloco

- o shell passa a renderizar secoes de navegacao:
  - `Institucional`
  - `Operacional`
  - `Modulos Ativos`
  - `Plataforma`, quando aplicavel
- o destino inicial autenticado passa a ser calculado por modulos ativos e capabilities
- rotas institucionais passam a usar guards por capability
- rotas do modulo de musica continuam protegidas por `hasModule("music")`

## Regras preservadas

- nenhuma rota principal foi renomeada
- o modulo de musica continua operacional
- o dashboard principal continua sendo a entrada segura do app quando o modulo de musica estiver ativo
