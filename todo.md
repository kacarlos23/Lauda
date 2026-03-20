================================================================================
DOCUMENTO DE REQUISITOS: SISTEMA DE GESTÃO PARA MINISTÉRIO DE LOUVOR
Versão 1.1
================================================================================

1. VISÃO GERAL DO PROJETO
O objetivo deste projeto é desenvolver uma aplicação web para automatizar e organizar o fluxo de trabalho de um ministério de louvor. O sistema centralizará o banco de músicas, a criação de ordens de culto (escalas/repertórios) e a gestão da equipe, garantindo que todos os músicos e vocalistas tenham acesso prévio aos materiais necessários com base em seus níveis de permissão.

--------------------------------------------------------------------------------
2. PERFIS DE USUÁRIOS E NÍVEIS DE ACESSO
O sistema deverá suportar os seguintes níveis hierárquicos:

* Nível 1: Administrador (Líder Geral / Coordenação)
  [x] Acesso total ao sistema.
  [x] Pode gerenciar (criar, editar, excluir/inativar) usuários, permissões, categorias de culto e dados globais.
  [x] Pode promover ou rebaixar o nível de acesso de qualquer usuário.

* Nível 2: Líder de Louvor (Dirigente)
  [x] Pode criar, editar e excluir ordens de culto (respeitando RN-03).
  [x] Pode escalar e remover membros dos cultos.
  [] Pode realizar o CRUD completo no banco de músicas e cifras.
  [] Não pode gerenciar usuários nem alterar níveis de acesso.

* Nível 3: Membro (Músico / Vocalista / Apoio)
  [x] Acesso predominantemente de leitura.
  [] Pode visualizar sua própria agenda de escalas.
  [] Pode visualizar ordens de culto nas quais está escalado e acessar os anexos correspondentes (cifras, links, áudios).
  [x] Pode confirmar ou recusar sua participação em um culto escalado.
  [] Pode atualizar seus próprios dados de perfil (foto, telefone, função/instrumento que toca).

--------------------------------------------------------------------------------
3. REQUISITOS FUNCIONAIS (RF)
O que o sistema DEVE fazer:

[RF-01] Gestão de Autenticação e Sessão
[] O sistema deve permitir o cadastro de novos usuários exclusivamente mediante convite gerado pelo Administrador ou por link com prazo de expiração configurável (ex.: 48 horas). O link deve ser invalidado após o primeiro uso.
[] O sistema deve possuir login seguro via e-mail e senha, com funcionalidade de recuperação de senha por e-mail.
[] O sistema deve encerrar a sessão do usuário após período de inatividade configurável (logout automático).
[] O sistema deve permitir que o usuário encerre sua sessão manualmente (logout).

[RF-02] Gestão de Usuários e Equipe
[] O sistema deve permitir o cadastro de membros com os seguintes dados: Nome completo, E-mail, Telefone, Foto de perfil, Função principal (Vocal, Teclado, Bateria, Violão, Baixo, Guitarra, etc.), Funções secundárias (um membro pode exercer mais de uma função) e Nível de Acesso.
[] O sistema deve permitir inativar temporariamente um membro (ex.: período de viagem ou licença), bloqueando seu acesso sem excluir seus dados.
[] O sistema deve permitir reativar um membro previamente inativado.

[RF-03] Banco de Músicas (Repertório Global)
[] O sistema deve possuir um CRUD completo para músicas.
[] Cada música deve conter os seguintes campos:
    * Título
    * Artista/Banda original
    * Tom Original (ex.: C, Dm, G#)
    * BPM (Batidas por Minuto)
    * Compasso (ex.: 4/4, 6/8, 3/4)
    * Link de referência externo (YouTube, Spotify, etc.)
    * Cifra: upload de arquivo (PDF) OU inserção de texto estruturado diretamente no sistema (opções mutuamente exclusivas entre si)
    * Observações gerais (campo de texto livre para notas sobre a música)
[] O sistema deve permitir classificar as músicas por tags customizáveis (ex.: Adoração, Celebração, Apelo, Ceia).
[] O sistema deve permitir buscar e filtrar músicas por título, artista, tag e tom.

[RF-04] Gestão de Eventos/Cultos e Escalas
[] O sistema deve permitir a criação de um "Evento/Culto" com os seguintes dados: Data, Horário de início, Horário de término, Nome/Tipo do Culto (ex.: Culto de Domingo, Reunião de Jovens), Local (campo de texto livre) e Status (Agendado, Realizado, Cancelado).
[] O sistema deve permitir a escalação de membros para um evento (selecionar quais membros participarão).
[] O sistema deve alertar o Líder caso um membro já possua outro evento com sobreposição de horário, exibindo os detalhes do conflito antes de confirmar a escala (ver RN-04).
[] Ao publicar a escala, o sistema deve notificar por e-mail cada membro escalado, informando data, horário, local e tipo do culto (ver RN-05).

[RF-05] Montagem de Setlist (Repertório do Dia)
[] O sistema deve permitir ao Líder adicionar músicas do Banco de Músicas à Ordem de Culto, definindo a sequência (ordem de execução).
[] O sistema deve permitir reordenar as músicas do setlist via arrastar e soltar (drag-and-drop) ou por campos de posição numérica.
[] O sistema deve permitir alterar o "Tom de Execução" de cada música especificamente para aquela Ordem de Culto, sem alterar o Tom Original cadastrado no banco global.
[] O sistema deve permitir adicionar observações individuais por música dentro da escala (ex.: "Começar apenas com teclado e voz", "Emendar com a próxima música").
[] O sistema deve permitir duplicar o setlist de um culto anterior como ponto de partida para um novo culto.

[RF-06] Confirmação de Presença na Escala
[] O sistema deve permitir que cada membro escalado confirme ou recuse sua participação diretamente pelo dashboard ou pelo link no e-mail de notificação.
[] O sistema deve exibir ao Líder o status de confirmação de cada membro escalado (Pendente, Confirmado, Recusado).

[RF-07] Painel do Usuário (Dashboard)
[] O sistema deve exibir um painel inicial personalizado por nível de acesso:
    * Nível 3: lista de próximos cultos escalados em ordem cronológica, com acesso rápido ao setlist e cifras de cada um; botões de confirmação/recusa de presença pendente em destaque.
    * Nível 2: todos os itens do Nível 3, acrescidos de indicadores do mês (total de cultos agendados, membros com confirmação pendente) e acesso rápido à criação de um novo culto.
    * Nível 1: todos os itens anteriores, acrescidos de indicadores gerais (total de membros ativos, total de músicas cadastradas, últimas atividades no sistema).

--------------------------------------------------------------------------------
4. REQUISITOS NÃO FUNCIONAIS (RNF)
Atributos de qualidade e tecnologia do sistema:

[RNF-01] Arquitetura e Stack Tecnológico
[] Frontend: Single Page Application (SPA) responsiva desenvolvida em React, com biblioteca de componentes (ex.: Shadcn/UI ou Chakra UI).
[] Backend: API RESTful construída com o framework Django (Python), utilizando o Django REST Framework (DRF) para serialização e roteamento.
[] Banco de Dados: PostgreSQL relacional, garantindo integridade referencial entre escalas, usuários e músicas.
[] Armazenamento de Arquivos: serviço de storage em nuvem (ex.: AWS S3 ou Cloudflare R2) para PDFs de cifras e arquivos de áudio, evitando o armazenamento de arquivos binários diretamente no banco de dados.

[RNF-02] Responsividade (Mobile-First)
[] O layout deve se adaptar a dispositivos móveis (smartphones e tablets), pois é o formato principal de acesso de músicos durante ensaios e cultos.
[] Os elementos interativos (botões, campos de formulário) devem respeitar tamanhos mínimos de área de toque (44×44px), conforme diretrizes de acessibilidade WCAG 2.1.

[RNF-03] Segurança e Privacidade
[] As senhas devem ser armazenadas com hash unidirecional usando algoritmo seguro (bcrypt ou Argon2).
[] A API deve proteger todas as rotas autenticadas via tokens JWT, com tempo de expiração configurável.
[] Controle de acesso baseado em papéis (RBAC) deve ser validado em cada requisição no lado do servidor.
[] Links de convite para cadastro devem ter prazo de expiração e ser invalidados após o primeiro uso.

[RNF-04] Performance
[] O carregamento de uma ordem de culto completa (equipe + setlist + cifras) não deve ultrapassar 2 segundos em conexão 4G padrão.
[] Arquivos de cifra em PDF devem ser servidos via CDN para reduzir latência.
[CORREÇÃO: a métrica de "2 segundos" agora inclui condição de rede (4G), tornando o critério mensurável e testável. Adicionada recomendação de CDN.]

[RNF-05] Disponibilidade
[] O sistema deve ter disponibilidade mínima de 99% (equivalente a menos de 7,3 horas de indisponibilidade por mês), especialmente nos fins de semana, que correspondem ao período de maior uso.

--------------------------------------------------------------------------------
5. REGRAS DE NEGÓCIO (RN)
Condições que regem o funcionamento lógico do sistema:

[RN-01] Exclusão Lógica (Soft Delete): Usuários e músicas vinculados a escalas passadas não devem ser apagados definitivamente do banco de dados (Hard Delete), mas sim desativados para preservar a integridade histórica das ordens de culto. Músicas desativadas não aparecem nas buscas do banco global, mas permanecem visíveis nos setlists em que já foram incluídas.

[RN-02] Visibilidade de Escala: Um membro de Nível 3 só terá acesso à lista de músicas e arquivos de uma ordem de culto caso esteja explicitamente escalado para aquele evento. Ordens de culto de outros eventos permanecem invisíveis para ele.

[RN-03] Edição de Eventos Passados: Ordens de culto cujo horário de término já passou devem ser automaticamente bloqueadas para edição de repertório e equipe, servindo apenas como registro histórico consultável.

[RN-04] Conflito de Escala: O sistema não deve impedir definitivamente a escalação de um membro com conflito de horário, mas deve exibir um alerta de confirmação explícito ao Líder antes de salvar, descrevendo o conflito (nome do outro evento, data e horário sobrepostos). A decisão final cabe ao Líder.

[RN-05] Notificação de Escala: Ao publicar ou atualizar uma escala, o sistema deve enviar notificação por e-mail apenas aos membros afetados pela alteração (novos escalados ou removidos), evitando envio desnecessário de e-mails para membros cuja participação não foi alterada.