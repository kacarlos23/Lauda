# Fundacao Modular do Lauda

## Conceito oficial de modulo
- Modulo e uma unidade funcional do produto.
- Modulo pode ser habilitado por igreja.
- Modulo pode ganhar habilitacao por ministerio no futuro, mas isso nao entra neste bloco.
- Modulo possui rotas, telas, permissoes e dados proprios.
- Modulo reutiliza o core institucional compartilhado do Lauda.

## O que nao e modulo
- Botao isolado.
- Pagina solta sem dominio proprio.
- Aba visual sem regra funcional propria.
- Helper ou componente de interface.

## Decisao deste bloco
- O vinculo modular fica somente em `Igreja <-> Modulo`.
- Nao sera criado `Ministerio <-> Modulo` neste bloco.
- Motivo: o unico modulo real ainda e musica, e a complexidade adicional por ministerio nao e necessaria agora.

## Chaves oficiais de modulo
- `music`: modulo oficial de musica e louvor.

## Reservas futuras documentadas, sem implementacao funcional
- `youth`
- `children`
- `fellowship`
- `communication`
- `events`
