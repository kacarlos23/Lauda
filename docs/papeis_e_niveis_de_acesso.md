# Papeis e Niveis de Acesso

Este projeto usa o modelo atual baseado em `nivel_acesso` + `is_global_admin`.
Nao ha migracao para Django Groups neste momento.

## Escopos

- `GLOBAL`: administracao da plataforma inteira.
- `MINISTERIO`: operacao isolada dentro de um ministerio.

## Regras atuais

- `is_global_admin = true`:
  - escopo `GLOBAL`
  - nao fica vinculado a `ministerio`
  - acessa login global
  - pode gerenciar ministerios, convites e recursos tenant-scoped informando o ministerio correto quando necessario

- `is_global_admin = false` com `nivel_acesso = 1`:
  - escopo `MINISTERIO`
  - papel exibido `Administrador`
  - pode gerenciar recursos operacionais do proprio ministerio

- `is_global_admin = false` com `nivel_acesso = 2`:
  - escopo `MINISTERIO`
  - papel exibido `Lider de Louvor`
  - possui acesso operacional de leitura; escrita administrativa continua restrita

- `is_global_admin = false` com `nivel_acesso = 3`:
  - escopo `MINISTERIO`
  - papel exibido `Membro`
  - acesso de leitura no contexto do proprio ministerio

## Campos expostos pela API

Payloads de autenticacao e serializer de usuario expõem:

- `nivel_acesso`
- `nivel_acesso_label`
- `escopo_acesso`
- `papel_display`
- `ministerio_id`
- `ministerio_nome`
- `ministerio_slug`
- `is_global_admin`

Lookups publicos de convite expõem:

- `nivel_acesso`
- `nivel_acesso_label`

## Observacoes

- `access_code` fixo passa a existir em `Ministerio`.
- `ConviteMinisterio.access_code` continua existindo para convites rotativos e pode carregar papeis acima de membro.
- O codigo fixo de `Ministerio` representa a entrada padrao para novos membros com `nivel_acesso = 3`.
- O modelo atual deve ser endurecido e documentado, nao refeito do zero.
- Mudanca para RBAC mais formal so deve acontecer se a complexidade real do produto exigir.

## Catalogo global de musicas

- `Musica` passa a ser tratada como catalogo global.
- Edicao do catalogo global:
  - admin global
  - administrador de ministerio
  - lider de louvor
- Membro comum:
  - apenas leitura
- Recursos operacionais continuam isolados por ministerio:
  - cultos
  - escalas
  - setlists
