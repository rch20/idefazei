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
- [ ] API tRPC: CRUD de famílias
- [ ] API tRPC: ministérios e escalas completos
- [ ] API tRPC: check-in QR para eventos

## FASE 2 – Design e Layout

- [x] Tema visual: fundo creme quente, line art dourada, tipografia azul-marinho
- [x] Geometria sagrada: espiral Proporção Áurea e círculos intersectados no background
- [x] Fontes: Playfair Display bold azul-marinho + Inter + Cormorant Garamond
- [x] Sidebar de navegação com todos os módulos e grupos
- [x] Header com identidade da igreja e perfil do usuário
- [x] Componentes globais: badges de status, cards de métricas, animações
- [x] Layout multi-tenant: contexto de igreja com logo e cores
- [ ] Aplicação dinâmica de cores da igreja no subdomínio

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
- [ ] Gestão de Famílias
- [ ] Módulo de Ministérios completo
- [ ] Escalas com notificações
- [ ] Área do Membro (portal pessoal)
- [ ] App do Líder (tela simplificada)
- [ ] Portal do Visitante (sem login)
- [ ] Biblioteca Digital
- [ ] Configurações da Igreja (multi-tenant)

## FASE 4 – PWA e Finalização

- [x] Testes vitest para rotas principais (5 testes passando)
- [ ] Manifest PWA com ícones e splash screen
- [ ] Service Worker para modo offline
- [ ] Notificações push integradas
- [x] Checkpoint final
