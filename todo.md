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
- [x] API tRPC: check-in QR para eventos (geração de QR Code + endpoint de check-in público)

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
- [x] Área do Membro (portal pessoal)
- [x] App do Líder (tela simplificada)
- [x] Portal do Visitante (sem login)
- [x] Biblioteca Digital
- [x] Configurações da Igreja (multi-tenant)

## FASE 4 – PWA e Finalização

- [x] Testes vitest para rotas principais (5 testes passando)
- [x] Manifest PWA com atalhos e meta tags
- [x] Service Worker para modo offline (sw.js + hook usePWA)
- [x] Notificações push integradas (requestNotifications via usePWA)
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
- [x] API: convite de usuários por email dentro da igreja (cria conta + senha temporária + notificação)

### Domínio Principal (/)
- [x] Landing Page com seções: Hero, Recursos, Funil, Planos, Depoimentos, CTA
- [x] Página /planos com comparativo de planos
- [x] Página /recursos com lista de funcionalidades
- [x] Página /demo com tour interativo (6 passos interativos com preview visual)
- [x] Página /contato com formulário
- [x] Página /cadastro-igreja com formulário multi-step (dados da igreja + subdomínio + conta do pastor)

### Painel Super Admin (/admin)
- [x] Login exclusivo do Super Admin (/admin/login)
- [x] Dashboard com métricas globais (total de igrejas, membros, receita)
- [x] Lista de igrejas com status (pendente, ativa, suspensa)
- [x] Aprovação/rejeição de novas igrejas
- [x] Gerenciamento de planos e assinaturas
- [x] Bloqueio/suspensão de igrejas
- [x] Painel de suporte

### Subdomínio da Igreja
- [x] Página de login da igreja (/login) com email+senha e seleção de perfil
- [x] Redirecionamento automático por perfil após login (pastor/secretario → dashboard, líder/supervisor → células, consolidador → consolidação)
- [x] Portal do Visitante (/visitante) público sem login
- [x] Middleware de resolução de tenant no frontend (hook useTenant) e backend (context.ts)

## FASE 6 – Próximos Passos

### Onboarding Guiado Pós-Cadastro
- [x] Backend: API para salvar progresso do onboarding por igreja
- [x] Backend: endpoint de importação de membros via CSV
- [x] Wizard de onboarding com 4 etapas: boas-vindas, importar membros, criar célula, convidar líderes
- [x] Indicador de progresso do onboarding no Dashboard (% concluído)
- [x] Rota /onboarding acessível após cadastro da igreja

### Relatórios Exportáveis em HTML/PDF
- [x] Backend: módulo `server/reports.ts` com geração de HTML estilizado em base64
- [x] Backend: router `reports` com 3 endpoints (dashboard, células, consolidação)
- [x] Componente `ReportButton` reutilizável
- [x] Botão "Exportar Relatório" no Dashboard Executivo
- [x] Botão "Exportar" na página de Células
- [x] Botão "Exportar Relatório" na página de Consolidação

### Notificações Automáticas (Heartbeat)
- [x] Ler references/periodic-updates.md para entender o sistema de heartbeat
- [x] Backend: handler `server/scheduledNotifications.ts`
- [x] Backend: endpoint POST `/api/scheduled/daily-notifications` registrado no index.ts
- [x] Alerta de aniversários do dia (notificação ao owner)
- [x] Alerta de membros ausentes há mais de 30 dias (notificação ao owner)
- [x] Cron heartbeat criado (diário 09:00 UTC) — task_uid: L2Wu2q34WUtDDPr4xJRv4C. Após publicar o site, o cron já está registrado e disparará automaticamente para /api/scheduled/daily-notifications.

## FASE 7 – Módulos Faltantes

### Módulo 8 – Escola de Fundamentos
- [x] Schema: tabela `foundation_courses` (cursos: Salvação, Oração, Bíblia, Igreja, Espírito Santo, Batismo)
- [x] Schema: tabela `foundation_enrollments` (matrícula por pessoa + curso + churchId)
- [x] API tRPC: CRUD de cursos e matrículas, controle de frequência e conclusão
- [x] Página /app/escola-fundamentos — listagem de cursos e turmas
- [x] Geração de certificado HTML/PDF ao concluir curso
- [x] Atualização automática do status espiritual da pessoa ao concluir

### Módulo 9 – Batismo
- [x] Schema: tabela `baptism_classes` (turmas de batismo: data, local, pastor)
- [x] Schema: tabela `baptism_enrollments` (inscrição por pessoa + turma)
- [x] API tRPC: CRUD de turmas, inscrição, controle de participação/conclusão
- [x] Página /app/batismo — gestão de turmas e inscritos
- [x] Geração de certificado de batismo HTML/PDF
- [x] Atualização automática do discipleshipStage para 'batismo' ao concluir

### Módulo 13 – Encontro com Deus
- [x] Schema: tabela `encounter_events` (eventos tipo retiro: data, local, vagas)
- [x] Schema: tabela `encounter_enrollments` (inscrição por pessoa + evento)
- [x] API tRPC: CRUD de eventos, inscrição, participação, conclusão
- [x] Página /app/encontro-com-deus — gestão de eventos e inscritos
- [x] Atualização automática do discipleshipStage para 'encontro_com_deus' ao concluir

### Módulo 14 – Escola de Líderes
- [x] Schema: tabela `leadership_school_classes` (turmas: nome, período, pastor)
- [x] Schema: tabela `leadership_school_enrollments` (matrícula + frequência + notas)
- [x] API tRPC: CRUD de turmas, matrícula, frequência, notas, certificação
- [x] Página /app/escola-lideres — gestão de turmas e alunos
- [x] Geração de certificado de conclusão
- [x] Status "Líder em Formação" ao matricular, atualização de discipleshipStage ao concluir

### Módulo 15 – Gestão de Liderança
- [x] Schema: tabela `leadership_history` (histórico ministerial: cargo, data início/fim, observação)
- [x] API tRPC: CRUD de histórico ministerial por pessoa
- [x] Página /app/gestao-lideranca — visão geral de líderes com histórico ministerial completo

### Módulo 21 – Aconselhamento Pastoral
- [x] Schema: tabela `counseling_sessions` (agendamentos: pessoa, pastor, data, tipo, status)
- [x] Schema: tabela `counseling_notes` (anotações reservadas: visível apenas ao pastor/aconselhador)
- [x] API tRPC: CRUD de sessões e anotações com controle de permissão por perfil
- [x] Página /app/aconselhamento — agenda e histórico (acesso restrito)

### Módulo 22 – Comunicação
- [x] Schema: tabela `communication_logs` (log de mensagens enviadas: tipo, destinatário, status)
- [x] API tRPC: envio de notificações push via Service Worker existente
- [x] Automação: mensagem de boas-vindas ao cadastrar nova alma
- [x] Automação: lembrete de aniversário (integrar com heartbeat existente)
- [x] Automação: lembrete de evento 24h antes (heartbeat)
- [x] Página /app/comunicacao — central de comunicações e histórico de envios
