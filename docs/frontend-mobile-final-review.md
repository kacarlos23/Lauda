# Frontend Mobile Final Review

Use este pente fino antes de fechar qualquer alteração de UI no frontend.

## Layout Global
- validar header fixo sem sobreposição de conteúdo
- validar sidebar/mobile menu abrindo e fechando sem cortar conteúdo
- validar espaçamento lateral em `320px`, `375px`, `768px`

## Formulários
- checar altura e padding dos inputs
- checar labels quebrando corretamente em 1 linha ou 2 linhas
- checar botões de ação com largura adequada no mobile
- checar modais com header/footer visíveis e conteúdo rolável

## Tabelas
- confirmar fallback mobile de `table -> cards`
- garantir que ações não estourem horizontalmente
- garantir que tags e badges quebrem linha corretamente

## Calendários
- confirmar toolbar sem sobreposição
- confirmar botões `Hoje`, `Mês`, `Semana`, `Dia` clicáveis em touch
- confirmar eventos sem clipping em telas pequenas

## Páginas Críticas
- `frontend/src/pages/Musicas.jsx`
- `frontend/src/pages/Cultos.jsx`
- `frontend/src/pages/Perfil.jsx`
- `frontend/src/pages/Login.jsx`
- `frontend/src/App.jsx`

## Validação final
- rodar `npm run lint`
- rodar `npm run build`
- revisar visualmente em mobile
