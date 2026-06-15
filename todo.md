# Igreja SaaS - Plataforma de Crescimento e Discipulado

## FASE 1 – Schema e Backend

- [x] Schema: tabela `churches` (tenants) com logo, cores, subdomínio
- [x] Schema: tabela `church_members` com roles hierárquicos
- [x] Schema: tabela `people` com dados pessoais, contato, endereço, dados espirituais
- [x] Schema: tabela `families` com relações pai/mãe/filhos
- [x] Schema: tabela `souls` (novas almas) com origem, quem ganhou, data, status
- [x] Schema: tabela `consolidations` com checklist e controle de datas
- [x] Schema: tabela `cells` com líder, supervisor, anfitrião, endereço, horário
- [x] Schema: tabela `cell_attendance` com presença por reunião
- [x] Schema: tabela `events` com inscrição e QR code
- [x] Schema: tabela `ministries` com participantes e líder
- [x] Schema: tabela `prayer_requests` com pedidos e testemunhos
- [x] Schema: tabela `announcements` (mural) com publicações
- [x] Migração SQL aplicada via webdev_execute_sql
- [x] API tRPC: autenticação multi-tenant com isolamento por church_id
- [x] API tRPC: CRUD de igrejas (tenants)
- [x] API tRPC: CRUD de pessoas
- [x] API tRPC: módulo Ganhar Almas
- [x] API tRPC: módulo Consolidação
- [x] API tRPC: funil de discipulado
- [x] API tRPC: células
- [x] API tRPC: eventos
- [x] API tRPC: dashboard com indicadores
- [x] API tRPC: Radar Espiritual (pessoas sem célula, afastadas, sem consolidação)
- [x] API tRPC: Árvore de Discipulado
- [x] API tRPC: CRUD de famílias
- [x] API tRPC: ministérios e escalas completos
- [ ] API tRPC: check-in QR para eventos

## FASE 2 – Design e Layout

- [x] Tema visual: fundo creme quente, line art dourada, tipografia azul-marinho
- [x] Geometria sagrada: espiral Proporção Áurea e círculos intersectados no background
- [x] Fontes: Playfair Display bold azul-marinho + Inter + Cormorant Garamond
- [x] Sidebar de navegação com todos os módulos e grupos
- [x] Header com identidade da igreja e perfil do usuário
- [x] Componentes globais: badges de status, cards de métricas, animações
- [x] Layout multi-tenant: contexto de igreja com logo e cores
- [x] Aplicação dinâmica de cores da igreja no subdomínio (pré-visualização em Configurações)

## FASE 3 – Páginas Principais

- [x] Landing page pública da plataforma com geometria sagrada
- [x] Dashboard executivo com indicadores e gráficos
- [x] Radar Espiritual (componente visual no dashboard)
- [x] Árvore de Discipulado (componente visual no dashboard)
- [x] Funil de Discipulado em Kanban visual (9 etapas)
- [x] Módulo Ganhar Almas com formulário completo
- [x] Módulo Consolidação com checklist interativo
- [x] Cadastro e listagem de Pessoas (4 abas: pessoal, contato, endereço, espiritual)
- [x] Gestão de Células com mapa geográfico integrado
- [x] Módulo de Eventos
- [x] Pedidos de Oração e Testemunhos
- [x] Mural da Igreja com avisos e comunicados
- [x] Gestão de Famílias
- [x] Módulo de Ministérios completo
- [x] Escalas com calendário visual
- [ ] Área do Membro (portal pessoal)
- [ ] App do Líder (tela simplificada)
- [x] Portal do Visitante (sem login)
- [x] Biblioteca Digital
- [x] Configurações da Igreja (multi-tenant)

## FASE 4 – PWA e Finalização

- [x] Testes vitest para rotas principais (5 testes passando)
- [x] Manifest PWA com atalhos e meta tags
- [ ] Service Worker para modo offline
- [ ] Notificações push integradas
- [x] Checkpoint final

## FASE 5 – Multi-Tenant Completo (Autenticação Própria + Subdomínios)

### Backend
- [x] Schema: tabela `church_users` com email, senha hash, perfil e churchId
- [x] Schema: tabela `super_admins` para proprietários da plataforma
- [x] Schema: tabela `plans` (planos de assinatura: Básico, Pro, Enterprise)
- [x] Schema: tabela `subscriptions` (assinatura por igreja com status e vencimento)
- [x] Schema: tabela `visitor_leads` (registros do portal do visitante)
- [x] Migração SQL das novas tabelas
- [x] API: autenticação própria (email+senha) com JWT, sem Manus OAuth
- [x] API: resolução de tenant por subdomínio (middleware)
- [x] API: cadastro de nova igreja (fluxo completo)
- [x] API: Super Admin (login separado, aprovação, suspensão, métricas globais)
- [x] API: Portal do Visitante (pedido de oração, visita pastoral, interesse em participar)
- [ ] API: convite de usuários por email dentro da igreja

### Domínio Principal (/)
- [x] Landing Page com seções: Hero, Recursos, Funil, Planos, Depoimentos, CTA
- [x] Página /planos com comparativo de planos
- [x] Página /recursos com lista de funcionalidades
- [ ] Página /demo com tour interativo
- [x] Página /contato com formulário
- [x] Página /cadastro-igreja com formulário multi-step (dados da igreja + subdomínio + conta do pastor)

### Painel Super Admin (/admin)
- [x] Login exclusivo do Super Admin (/admin/login)
- [x] Dashboard com métricas globais (total de igrejas, membros, receita)
- [x] Lista de igrejas com status (pendente, ativa, suspensa)
- [x] Aprovação/rejeição de novas igrejas
- [ ] Gerenciamento de planos e assinaturas
- [x] Bloqueio/suspensão de igrejas
- [ ] Painel de suporte

### Subdomínio da Igreja
- [x] Página de login da igreja (/login) com email+senha e seleção de perfil
- [x] Redirecionamento automático por perfil após login (pastor/secretario → dashboard, líder/supervisor → células, consolidador → consolidação)
- [x] Portal do Visitante (/visitante) público sem login
- [x] Middleware de resolução de tenant no frontend (hook useTenant) e backend (context.ts)
