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

## FASE 8 – Certificados em PDF

- [x] Instalar pdf-lib e @pdf-lib/fontkit no servidor
- [x] Criar módulo server/certificates.ts com geração de PDF (layout: fundo pergaminho, bordas douradas, nome em destaque)
- [x] Criar endpoint tRPC certificates.generate (tipo, memberId, churchId)
- [x] Certificado salvo no S3 e retorna URL para download
- [x] Integrar botão "Gerar Certificado" real na página Escola de Fundamentos
- [x] Integrar botão "Gerar Certificado" real na página Batismo nas Águas
- [x] Integrar botão "Gerar Certificado" real na página Escola de Líderes

## FASE 9 – Personalização de Certificados por Igreja

- [x] Schema: adicionar campos `certPastorName`, `certLogoUrl`, `certVerse*`, `certSignatureLabel` na tabela `churches`
- [x] Migração SQL aplicada via webdev_execute_sql
- [x] API tRPC: procedure `certificates.getConfig` (lê configuração da igreja)
- [x] API tRPC: procedure `certificates.saveConfig` (salva configuração da igreja)
- [x] Upload de logo da igreja para S3 via endpoint existente
- [x] Integrar configuração no gerador PDF (server/certificates.ts usa dados da igreja)
- [x] Página de configuração `/app/configuracoes/certificados` com formulário
- [x] Entrada no sidebar em Configurações

## FASE 10 – Testes de Integração End-to-End

- [x] Criar server/discipleship.flow.test.ts com 15 casos de teste
- [x] Etapa 1: Cadastro de nova alma (souls.create) — sucesso e validação de nome curto
- [x] Etapa 2: Consolidação (consolidation.create + updateChecklist) — abertura e checklist
- [x] Etapa 3: Batismo (batismo.createClass + enroll + updateEnrollment) — turma, inscrição e conclusão
- [x] Etapa 4: Célula (cells.create) — criação e validação de nome mínimo
- [x] Etapa 5: Certificado (certificates.generate) — batismo, fundamentos, líderes e acesso negado
- [x] Segurança: isolamento por tenant — acesso negado a igreja diferente e permitido à própria
- [x] Total: 20 testes passando (3 arquivos)

## FASE 11 – Integração Stripe

- [x] Criar server/stripe-products.ts com definição dos planos (Básico, Pro, Enterprise)
- [x] Schema: adicionar campos stripe_customer_id, stripe_subscription_id na tabela churches
- [x] Migração SQL aplicada
- [x] Backend: endpoint POST /api/stripe/webhook com verificação de assinatura
- [x] Backend: tRPC procedure stripe.createCheckoutSession
- [x] Backend: tRPC procedure stripe.createPortalSession (portal de faturamento)
- [x] Backend: tRPC procedure stripe.getSubscription (status da assinatura)
- [x] Frontend: página /planos com botão "Assinar" que abre checkout Stripe
- [x] Frontend: banner de plano no Dashboard (plano atual + botão upgrade)
- [x] Frontend: página /faturamento com histórico de pagamentos e portal
- [x] Integrar restrições de plano (ex: Básico = 1 célula, Pro = ilimitado) — validação no backend via stripe.getSubscription
- [x] Testes e checkpoint final — 20 testes passando, 0 erros TypeScript

## FASE 12 – Correção de Acesso ao Dashboard do Tenant

- [x] Diagnosticar e corrigir o fluxo de cadastro, login e redirecionamento ao Dashboard do tenant
- [x] Validar acesso ao Dashboard com sessão JWT, redirecionamento ao login e preservação do isolamento multi-tenant
- [x] Validar no navegador o fluxo completo: login de igreja → Dashboard carregado sem erros → queries protegidas autenticadas por JWT
- [x] Adicionar teste de integração de churchAuth.login seguido de chamada protegida com o JWT do tenant

## FASE 13 – Auditoria Integral de Qualidade e Experiência

- [x] Mapear todos os fluxos críticos, rotas, botões, formulários e modais da plataforma
- [x] Auditar autenticação, sessões JWT, permissões e isolamento multi-tenant
- [x] Auditar validações, estados de carregamento, erros e feedback de ações
- [x] Validar acessibilidade final: foco visível global, teclado, labels e contraste dos fluxos principais
- [x] Eliminar a última ação provisória dos placeholders de Radar e Árvore de Discipulado
- [x] Ampliar testes automatizados para os fluxos corrigidos e validar sem regressões
- [x] Salvar checkpoint e documentar as melhorias aplicadas

### Achados críticos priorizados

- [x] Proteger endpoints Super Admin com sessão JWT administrativa e remover exposição pública de métricas, igrejas e aprovações
- [x] Restringir a criação de usuários de igreja para impedir cadastro arbitrário em qualquer tenant
- [x] Proteger a consulta de leads do Portal do Visitante por vínculo de igreja
- [x] Corrigir Onboarding: contexto autenticado, rota final `/app/dashboard` e remoção de líder fixo
- [x] Alinhar checkout público de planos com a sessão JWT da igreja
- [x] Remover layouts aninhados e substituir todas as ações sem efeito por fluxos úteis ou estados explícitos
- [x] Implementar modais funcionais para criar escala e cadastrar material na Biblioteca
- [x] Fazer aprovação, rejeição e suspensão alterarem efetivamente o estado de acesso da igreja
- [x] Proteger o endpoint de upload de logo contra envios não autenticados e tipos de arquivo indevidos
- [x] Implementar estado explícito para recuperação de senha na tela de login
- [x] Substituir o upload provisório de logo em Configurações por fluxo funcional

## FASE 14 – Revisão de Ganhar Almas

- [x] Auditar todos os botões, filtros, ações e estados da página Ganhar Almas
- [x] Revisar e aprimorar o modal de cadastro de nova alma, incluindo validações e feedbacks
- [x] Ajustar responsividade, acessibilidade e fluxo mobile da página Ganhar Almas
- [x] Validar com testes, screenshots e checkpoint
- [x] Corrigir a rota direta `/app/ganhar-almas` para evitar página 404

## FASE 15 – Jornada Única da Pessoa

- [x] Criar ou vincular a Pessoa automaticamente ao registrar uma Nova Alma, com detecção segura de duplicidade
- [x] Registrar responsável atual pelo cuidado e preservar o histórico de mudanças
- [x] Mostrar próximos passos e pendências de cuidado na ficha da Pessoa
- [x] Permitir somente uma Célula ativa por Pessoa, com transferência e histórico preservados
- [x] Restringir escalas a Pessoas participantes ativas do Ministério correspondente
- [x] Criar visão de liderança para pessoas sem responsável, sem célula e sem acompanhamento recente
- [x] Cobrir a jornada com testes de integração e validar em desktop e mobile

## FASE 16 – Membros por Célula

- [x] Exibir ao líder as Pessoas ativas vinculadas a cada Célula
- [x] Permitir abrir os detalhes da Célula sem perder a lista principal
- [x] Validar com uma sessão autenticada a experiência em desktop e mobile, salvar checkpoint

## FASE 17 – Funil de Discipulado Mobile

- [x] Converter o Kanban do Funil de Discipulado em sequência vertical em telas mobile
- [x] Preservar a organização horizontal e as interações do Kanban em desktop
- [x] Validar os layouts autenticados em desktop e mobile, salvar checkpoint

## FASE 18 – Funil de Discipulado Desktop

- [x] Substituir o Kanban horizontal no desktop por navegação de etapas sem rolagem lateral
- [x] Manter cartões, avanço de etapa e leitura de progresso em uma única tela
- [x] Preservar a sequência vertical existente no mobile
- [x] Validar os layouts autenticados em desktop e mobile, salvar checkpoint

## FASE 19 – Retorno de Etapa no Funil

- [x] Permitir retornar uma Pessoa para a etapa anterior de forma explícita e controlada
- [x] Manter o avanço e retorno acessíveis em desktop e mobile
- [x] Validar os layouts autenticados, com testes e checkpoint

## FASE 20 – Permissões da Jornada de Discipulado

- [x] Associar com segurança cada conta de igreja à Pessoa correspondente
- [x] Restringir mudanças de etapa aos Pastores, Supervisores, Líderes e Consolidadores responsáveis
- [x] Limitar o escopo por célula, supervisão ou carteira de consolidação
- [x] Ocultar ou desabilitar ações não autorizadas na interface do Funil
- [x] Cobrir regras de permissão por perfil e tenant com testes de integração

## FASE 21 – Atribuição de Pessoas e Funções

- [x] Permitir alterar o perfil operacional da conta vinculada à Pessoa
- [x] Unificar a seleção de Pessoa e função em uma gestão clara e responsiva
- [x] Preservar as permissões da Jornada ao alterar a função
- [x] Cobrir a alteração com testes e salvar checkpoint

## FASE 22 – Funções Complementares

- [x] Criar estrutura para funções complementares de conta sem alterar a função principal
- [x] Permitir Diácono, Tesoureiro, Levita e Consolidador como atribuições acumuláveis
- [x] Aplicar funções complementares apenas aos módulos correspondentes, sem ampliar o Funil indevidamente
- [x] Atualizar Configurações com seleção clara de múltiplas funções complementares
- [x] Cobrir regras de persistência e autorização com testes e salvar checkpoint

## FASE 23 – Revisão Primordial da Plataforma

- [x] Mapear jornadas críticas: cadastro, login, onboarding, nova alma, consolidação, célula e serviço
- [x] Verificar regras de negócio, estados, permissões e isolamento de tenant nos fluxos críticos
- [x] Revisar navegação, formulários, feedbacks, vazios, erros e responsividade mobile
- [x] Corrigir as falhas primordiais de operação e simplificar os fluxos confusos
- [x] Ampliar testes de integração e validar as jornadas revisadas antes do checkpoint

### Achados primordiais priorizados

- [x] Transformar “Inserido em célula” da Consolidação em vínculo real de Pessoa com Célula
- [x] Tornar o App do Líder baseado na conta e célula do líder, não na primeira célula da igreja
- [x] Adequar a navegação lateral ao perfil para reduzir módulos irrelevantes e ações bloqueadas
- [x] Impedir que uma função complementar replique a função principal da conta
- [x] Criar orientação clara para contas sem Pessoa vinculada e completar os testes de escopo
- [x] Fazer o App do Líder usar apenas a célula, consolidações, novas almas e membros do líder autenticado
- [x] Substituir botões sem ação no App do Líder por rotas e ações operacionais reais

## FASE 24 – Nova Alma por Visita Espontânea

- [x] Permitir cadastrar Nova Alma sem “quem ganhou” quando a origem for visita espontânea
- [x] Mostrar uma opção clara de chegada espontânea e orientar a atribuição posterior de consolidador
- [x] Preservar o responsável inicial para casos em que uma Pessoa realmente ganhou a Nova Alma
- [x] Cobrir os dois fluxos com testes e salvar checkpoint

## FASE 25 – Busca de Quem Ganhou

- [x] Substituir a lista extensa de “Quem ganhou?” por busca por nome ou telefone
- [x] Exibir resultado selecionado e permitir limpar ou trocar a Pessoa escolhida
- [x] Garantir navegação por teclado e uso confortável no mobile
- [x] Validar, testar e salvar checkpoint

## FASE 26 – Cards de Ganhar Almas no Mobile

- [x] Compactar os três cards de resumo em telas mobile
- [x] Preservar legibilidade, hierarquia e layout desktop
- [x] Validar visualmente, testar e salvar checkpoint

## FASE 27 – Central de Cuidado

- [x] Definir prioridade de cuidado por responsável e motivo de atenção
- [x] Criar fila pessoal acionável para Pastores, Supervisores, Líderes e Consolidadores
- [x] Adicionar ações rápidas de contato, consolidação, célula e atribuição de responsável
- [x] Registrar histórico cronológico de cuidado na ficha da Pessoa
- [x] Restringir a fila e as ações ao escopo pastoral da conta autenticada
- [x] Validar desktop/mobile, testes e checkpoint

## FASE 28 – Priorização de Abas

- [x] Mapear as lacunas de operação e experiência nas abas remanescentes
- [x] Classificar melhorias por impacto, esforço, dependência e risco de regressão
- [x] Documentar a recomendação de próxima aba a ser melhorada

## FASE 29 – Células: Encontros e Presença

- [x] Revisar o schema e as rotas atuais de Células e presença para preservar isolamento por tenant e permissões por escopo
- [x] Exibir o total real de Pessoas com vínculo ativo em Células
- [x] Permitir o registro de encontro e presença somente por responsável autorizado pela Célula
- [x] Exibir último encontro e resumo de presença na experiência responsiva da Célula
- [x] Cobrir o fluxo com testes, validar desktop/mobile e salvar checkpoint

## FASE 30 – Validação Real Autenticada do Tenant

- [x] Preparar uma sessão real de validação sem alterar os dados operacionais existentes
- [x] Confirmar login, redirecionamento ao Dashboard e chamadas protegidas por JWT
- [x] Validar Células, Funil de Discipulado e layouts autenticados em desktop e mobile
- [x] Registrar os resultados, concluir os itens de validação correlatos e salvar checkpoint

## FASE 31 – Sincronização de Tenant na Sessão Autenticada

- [x] Diagnosticar a aparente divergência de tenant: o `churchId` da sessão JWT já era aplicado corretamente; a inconsistência era visual durante o carregamento
- [x] Preservar a resolução segura existente, que não permite que um subdomínio diferente substitua o tenant do JWT
- [x] Ampliar a cobertura da precedência entre sessão JWT e subdomínio com testes de integração
- [x] Retestar o Dashboard e os módulos autenticados em uma sessão real, com os dados do tenant correto

## FASE 33 – Primeiro Carregamento Após Login

- [x] Reproduzir e corrigir o Dashboard com métricas inconsistentes logo após o redirecionamento de login
- [x] Manter o Dashboard em estado de carregamento até a sessão e os dados protegidos estarem prontos
- [x] Comprovar o fluxo por teste e sessão autenticada real

## FASE 32 – Unicidade de Encontro da Célula

- [x] Corrigir a comparação de data que permitiu dois encontros da mesma Célula no mesmo dia
- [x] Cobrir o bloqueio de duplicidade com teste de integração
- [x] Retestar no navegador a tentativa de registro repetido

## FASE 34 – Auditoria de Isolamento e Hierarquia

- [x] Mapear a aplicação de churchId, sessão JWT, perfis e escopo pastoral nos routers e helpers
- [x] Auditar operações de leitura e escrita contra acesso entre tenants e elevação de privilégio
- [x] Verificar ações sensíveis da Jornada, Células, cuidado, administração e faturamento
- [x] Corrigir falhas comprovadas, ampliar testes de isolamento e documentar o resultado
- [x] Validar a suíte completa e salvar checkpoint

### Achados de segurança corrigidos

- [x] Restringir a leitura de configuração de igreja por ID ao tenant autenticado
- [x] Vincular QR Code de Evento, inscrições e atualizações de matrícula ao churchId da entidade relacionada
- [x] Restringir leitura e alteração de cuidado e aconselhamento ao escopo pastoral autorizado
- [x] Restringir alterações estruturais de Células a perfis de liderança autorizados
- [x] Validar os vínculos de curso, turma, evento e Pessoa antes de criar qualquer matrícula
- [x] Restringir relatórios, comunicação, diretórios e demais dados sensíveis conforme o perfil autorizado
- [x] Revisar as procedures públicas para assegurar que exponham somente dados intencionalmente públicos
- [x] Cobrir tentativas de IDOR, mudança de tenant e elevação de privilégio em testes de regressão

## FASE 36 – Planejamento da Tesouraria

- [x] Definir perfis de acesso e separação entre Tesouraria da igreja e Faturamento da Lampas
- [x] Modelar entradas, saídas, categorias, contas e lançamentos manuais por tenant
- [x] Definir cálculos automáticos, fechamento mensal, relatórios e impressão
- [x] Definir trilha de auditoria, estornos e regras de alteração de lançamentos
- [x] Apresentar o plano de implementação da aba Tesouraria antes de iniciar o desenvolvimento

## FASE 37 – Tesouraria da Igreja

- [x] Criar schema multi-tenant de contas, categorias, lançamentos, períodos fechados e auditoria financeira
- [x] Aplicar migração SQL e implementar guards de Pastor e Tesoureiro no backend
- [x] Implementar contas iniciais, categorias padrão e categorias financeiras personalizadas
- [x] Implementar entradas, saídas, rascunhos, confirmação, estorno e cálculo automático de saldo
- [x] Criar relatório mensal, livro-caixa filtrável e impressão otimizada
- [x] Construir a página Tesouraria responsiva e incluí-la na navegação por perfil
- [x] Cobrir cálculos, auditoria, isolamento de tenant e permissões com testes
- [x] Validar em desktop e mobile, revisar o backlog e salvar checkpoint
- [x] Desabilitar visualmente novos lançamentos quando o período financeiro selecionado estiver fechado

## FASE 38 – Revisão da Consolidação

- [x] Mapear o fluxo atual de acompanhamento, integração em Célula e transferência de cuidado
- [x] Verificar permissões, responsividade e estados de experiência da aba
- [x] Identificar lacunas de operação e recomendar a evolução mais útil

### Ajuste prioritário identificado

- [x] Restringir a listagem de Consolidações ao escopo pastoral do usuário e ocultar o módulo para perfis sem responsabilidade de cuidado

## FASE 39 – Fila Pessoal de Consolidação

- [x] Garantir que a atribuição de Consolidador produza uma fila pessoal da Nova Alma atribuída
- [x] Filtrar leitura e atualização de Consolidações por responsável atual, Pastores e escopo pastoral permitido
- [x] Identificar visualmente o responsável e as pendências na aba Consolidação
- [x] Cobrir atribuição, visibilidade e bloqueio de acesso indevido com testes e validação autenticada
- [x] Restringir a consulta auxiliar de Novas Almas ao mesmo escopo da fila de Consolidação

## FASE 40 – Encaminhamentos para Consolidação

- [x] Criar fila de encaminhamentos de resgate separada da Consolidação inicial de Nova Alma
- [x] Permitir que Líder, Supervisor e Pastor enviem uma Pessoa para Consolidação com motivo e observação
- [x] Permitir indicar um Consolidador ou disponibilizar o encaminhamento para aceite pela equipe autorizada
- [x] Mostrar ao Consolidador a Pessoa, quem encaminhou, o motivo, a data e a situação do aceite
- [x] Registrar aceite, primeiro contato e encerramento sem apagar o histórico do encaminhamento
- [x] Restringir cada ação por tenant, função e escopo pastoral; cobrir o fluxo com testes e validação real

## FASE 41 – Encaminhamento Direto no Painel da Célula

- [x] Permitir selecionar um discípulo da própria Célula no App do Líder
- [x] Abrir formulário direto de encaminhamento com motivo obrigatório
- [x] Reutilizar a fila protegida de Consolidação sem duplicar dados ou permissões
- [x] Validar experiência mobile, escopo da Célula e regressões antes do checkpoint

## FASE 42 – Consolidação pela Ficha do Discípulo na Célula

- [x] Tornar cada discípulo da lista de membros clicável no detalhe da Célula
- [x] Exibir ficha de cuidado limitada a contato, estágio, presença e histórico relevante
- [x] Permitir encaminhar para Consolidação com motivo diretamente nessa ficha
- [x] Manter dados administrativos protegidos e restringir o fluxo à própria Célula e escopo pastoral
- [x] Validar a experiência responsiva e o fluxo completo antes do checkpoint

## FASE 43 – Contato do Consolidador

- [x] Exibir telefone ou WhatsApp do discípulo somente após o aceite do encaminhamento
- [x] Adicionar atalho seguro de WhatsApp com mensagem inicial contextualizada
- [x] Preservar a privacidade do contato antes do aceite e validar responsividade e regressões

## FASE 44 – Acompanhamento Completo da Consolidação

- [x] Registrar cada contato com data, canal, resultado e observação do Consolidador
- [x] Permitir definir a próxima ação e a data de retorno do caso
- [x] Permitir marcar necessidade de visita, com motivo e situação de atendimento
- [x] Exibir linha do tempo completa do caso ao Consolidador e à liderança autorizada
- [x] Proteger registros por tenant, responsável assumido e escopo pastoral
- [x] Validar o painel completo com testes e experiência responsiva antes do checkpoint

## FASE 45 – Múltiplas Funções por Login

- [x] Mapear acesso de Pastor, Líder, Diácono, Discípulo, Consolidador e Tesoureiro por função principal e complementar
- [x] Garantir que uma mesma conta reúna as áreas correspondentes a todas as funções que exerce
- [x] Preservar escopo de Célula, cuidado e finanças mesmo quando a conta acumular papéis
- [x] Deixar explícitas as áreas de atuação disponíveis para o usuário no login
- [x] Cobrir cenários de múltiplas funções com testes e validação autenticada
- [x] Mostrar no menu as funções ativas da conta para deixar os painéis acumulados compreensíveis

## FASE 46 – Identidade Ide Fazei

- [x] Mapear referências públicas de Lampas em títulos, navegação e páginas institucionais
- [x] Atualizar a marca visível para Ide Fazei sem alterar as referências técnicas internas
- [x] Atualizar título do aplicativo e metadados de navegação
- [x] Validar a nova identidade visual, os testes e o checkpoint

## FASE 47 – Ativos e Domínio Ide Fazei

- [x] Definir e criar o logo oficial e o favicon da Ide Fazei
- [x] Aplicar os ativos oficiais à experiência pública e ao manifesto PWA
- [x] Documentar a estrutura de domínio principal e subdomínios de igrejas
- [x] Preparar os apontamentos DNS necessários para `idefazei.com.br` e `*.idefazei.com.br`
- [x] Validar os ativos e apresentar os passos de publicação que dependem do titular do domínio

## FASE 48 – Reflexo de Visitas da Consolidação

- [x] Mapear o registro atual de solicitação de visita no acompanhamento de Consolidação
- [x] Exibir visitas solicitadas na Central de Cuidado para Pastores, Supervisores e responsáveis autorizados
- [x] Permitir atualizar a situação da visita sem perder o histórico do caso
- [x] Cobrir a visibilidade por tenant e escopo pastoral com testes e validação

## FASE 49 – Pessoa, Ministério, Função e Permissões

- [x] Mapear os perfis atuais, funções complementares e participantes de Ministérios para preservar compatibilidade
- [x] Criar um catálogo extensível de funções ministeriais e permissões derivadas por tenant
- [x] Permitir atribuir funções ministeriais a uma Pessoa dentro de cada Ministério na sua ficha
- [x] Somar automaticamente as permissões das funções ministeriais e dos perfis pastorais existentes
- [x] Criar aba Visitas em Consolidação com atribuição de Visitador, agenda e atualização de situação
- [x] Limitar Visitas e dados pessoais ao escopo ministerial, pastoral e tenant adequados
- [x] Cobrir permissões cumulativas, atribuição de visita e bloqueios de acesso com testes e validação

## FASE 50 – Validação do Escopo Estrutural

- [x] Comparar cadastro de igreja, subdomínio, pastor administrador e cadastro de membros com o modelo proposto
- [x] Validar a cobertura de Ministérios, Funções, permissões automáticas e múltiplas responsabilidades
- [x] Identificar lacunas em cadastro público de discípulos, funções personalizadas e áreas gerais do membro
- [x] Documentar a matriz de cobertura e recomendar a próxima implementação estrutural

## FASE 51 – Próximas Lacunas Estruturais Priorizadas

- [x] Criar cadastro público de discípulos por link da igreja com aprovação controlada
- [x] Permitir que Pastores criem e administrem funções ministeriais personalizadas por pacote de permissões
- [x] Criar visão organizacional de Ministérios, funções e responsáveis da igreja

## FASE 52 – Estrutura Organizacional Configurável

- [x] Auditar schema, rotas e telas atuais para definir uma migração incremental sem regressões
- [x] Implementar `subdominio/cadastro` com criação pendente de Pessoa e conta de discípulo
- [x] Implementar fila de aprovação, rejeição e ativação de novos discípulos por Pastor ou Secretário
- [x] Implementar funções ministeriais personalizadas vinculadas a pacotes seguros de permissões
- [x] Permitir definir líderes e responsáveis de Ministérios com escopo ministerial real
- [x] Criar visão organizacional de Ministérios, funções, responsáveis e participantes
- [x] Validar no servidor todos os pacotes de permissões, escopos e transições de aprovação
- [x] Produzir relatório de cada etapa, testes, validação e checkpoint final

## FASE 53 – Próximos Aperfeiçoamentos Operacionais

- [x] Mapear os fluxos existentes de cadastro pendente, visitas e funções personalizadas para reutilizar dados e guards seguros
- [x] Criar alerta operacional de novo cadastro pendente para Pastor e Secretário do mesmo tenant
- [x] Criar calendário mensal de visitas na aba Visitas da Consolidação, com filtros e detalhes respeitando o escopo
- [x] Permitir criar e consultar funções ministeriais personalizadas também em Configurações
- [x] Cobrir novas permissões e fluxos com testes, validar desktop/mobile e salvar checkpoint

## FASE 54 – Alertas e Tesouraria Operacional

- [x] Mapear a estrutura atual e modelar notificações por evento, destinatário, mensagem e canal
- [x] Implementar notificações internas persistentes por igreja, preparando o canal WhatsApp sem integração externa
- [x] Conectar os eventos prioritários de cadastro pendente e encaminhamentos de Consolidação sem aceite
- [x] Gerar recibos individuais de contribuições com acesso protegido e impressão
- [x] Implementar conciliação bancária mensal com cálculos e fechamento preservados
- [x] Validar isolamento por tenant, permissões, cálculos, impressão, responsividade e regressões antes do checkpoint

## FASE 55 – Comprovantes da Conciliação Bancária

- [x] Mapear o fluxo de conciliação e modelar os metadados do comprovante bancário
- [x] Implementar armazenamento seguro e vínculo multi-tenant dos comprovantes
- [x] Adicionar envio, consulta e abertura de comprovantes na tela de conciliação mensal
- [x] Validar permissões, formatos, tamanho, isolamento, mobile e regressões antes do checkpoint

## FASE 56 – Correção de Comprovantes Bancários

- [x] Mapear o vínculo atual dos comprovantes e definir remoção ou substituição segura
- [x] Implementar remoção protegida dos metadados de comprovantes no mesmo tenant
- [x] Adicionar ações de substituir e remover comprovantes na tela de conciliação mensal
- [x] Validar permissões, isolamento, mobile e regressões antes do checkpoint

## FASE 57 – Próxima Prioridade Operacional

- [x] Auditar lacunas funcionais pendentes e selecionar a prioridade com maior impacto operacional — relatório de presença por Evento
- [x] Mapear dados, permissões, escopo e transições do fluxo priorizado
- [x] Implementar o fluxo priorizado com isolamento por tenant e autorização no servidor
- [x] Cobrir o fluxo com testes e validar TypeScript, logs, mobile e regressões antes do checkpoint

## FASE 58 – Relatório de Presença por Evento

- [x] Mapear inscrições, check-ins, ausências e permissões do módulo de Eventos
- [x] Criar resumo protegido de inscritos, check-ins e ausentes por evento no servidor
- [x] Adicionar relatório visual e impressão na tela de Eventos, com leitura mobile-first
- [x] Cobrir o relatório com testes de tenant e autorização, validar TypeScript, logs e regressões

## FASE 59 – Prazos de Cuidado na Consolidação

- [x] Mapear encaminhamentos, escopos e a regra configurável de prazo de cuidado
- [x] Persistir o prazo de cada encaminhamento e calcular proximidade ou atraso no servidor
- [x] Adicionar definição de prazo e alertas visuais seguros na Consolidação e na fila pessoal
- [x] Cobrir os estados de prazo com testes de tenant e permissão, validar TypeScript, logs, mobile e regressões

## FASE 60 – Calendário de Escalas e Conflitos

- [x] Mapear os dados atuais de Escalas, permissões e sobreposição de horário por voluntário
- [x] Implementar validação no servidor para bloquear atribuições conflitantes no mesmo tenant
- [x] Adicionar calendário mensal de Escalas com destaque de conflitos e leitura mobile-first
- [x] Cobrir conflitos, isolamento e autorização com testes, validar TypeScript, logs e regressões antes do checkpoint

## FASE 61 – Lembretes Internos de Escalas

- [x] Mapear Escalas, notificações e automação existentes para lembretes de 24 horas e 2 horas
- [x] Emitir lembretes internos idempotentes de 24 horas e 2 horas, respeitando igreja e destinatário
- [x] Decidir não registrar Heartbeat; a ativação será exclusivamente por systemd timer na Hostinger VPS
- [x] Cobrir deduplicação, isolamento e destinatários com testes, validar TypeScript, logs e regressões

## FASE 62 – Arquitetura Portável para VPS

- [x] Mapear dependências e definir o contrato de job interno com segredo local
- [x] Adaptar o handler de lembretes para execução via systemd timer, sem autenticação de cron externa
- [x] Documentar unidades systemd, logs, variáveis e implantação com Node e MySQL na Hostinger VPS
- [x] Validar autenticação, deduplicação, isolamento e portabilidade antes do checkpoint

## FASE 63 – Backup no GitHub

- [x] Verificar o repositório remoto correto e o estado local antes do envio
- [x] Preparar commit da Ide Fazei sem segredos ou artefatos locais
- [x] Enviar o backup ao GitHub e confirmar o commit remoto

## FASE 64 – Repositório GitHub da Ide Fazei

- [x] Verificar a disponibilidade de igrea/idefazei e a permissão de criação
- [x] Não criar igrea/idefazei por indisponibilidade do proprietário; usar o repositório confirmado rch20/idefazei
- [x] Enviar o commit inicial da Ide Fazei sem segredos e confirmar o backup remoto

## FASE 65 – Backup em rch20/idefazei

- [x] Verificar acesso, histórico e branch principal de rch20/idefazei
- [x] Preparar um commit seguro com o estado atual da Ide Fazei
- [x] Enviar o commit ao repositório confirmado e validar o backup remoto

## FASE 66 – Preparação da VPS Hostinger

- [x] Receber acesso temporário seguro e confirmar o escopo de preparação sem deploy da aplicação
- [x] Auditar a VPS e aplicar a base segura de sistema e rede
- [x] Instalar Node.js, pnpm, MySQL, Nginx e dependências operacionais necessárias
- [x] Preparar usuário de serviço, diretórios, unidades systemd e timer local sem expor segredos
- [x] Validar a preparação e entregar o checklist do deploy independente

## FASE 67 – Domínio, Wildcard e Cloudflare

- [ ] Auditar Nginx, aplicação, certificados, firewall e serviços da VPS em modo somente leitura
- [ ] Verificar DNS de idefazei.com.br, www e wildcard durante a delegação Cloudflare
- [ ] Definir a configuração segura de Nginx, TLS e firewall para o domínio principal e subdomínios automáticos
- [ ] Apresentar diagnóstico e solicitar autorização antes de aplicar qualquer alteração na VPS
- [ ] Configurar o domínio aprovado e validar HTTPS, proxy e multi-tenant wildcard

## FASE 68 – Estabilidade Mobile da Página Pública

- [x] Inspecionar carregamento, transbordamento e estabilidade da página pública em viewport móvel
- [x] Nenhuma correção CSS necessária; não foram identificados transbordamentos ou deslocamentos visuais na inspeção
- [x] Validar novamente a página em mobile e registrar o resultado

## FASE 69 – Auditoria Global de Scroll e Overflow

- [ ] Inventariar todas as rotas, layouts, modais, drawers, tabelas e componentes compartilhados
- [ ] Auditar em desktop, tablet e celular qualquer overflow horizontal, deslocamento lateral e scroll aninhado desnecessário
- [ ] Inspecionar CSS e componentes responsáveis, identificando causas sem aplicar correções genéricas
- [ ] Entregar diagnóstico por rota e proposta de padronização global antes de alterar layouts
- [ ] Aplicar somente as correções de CSS e componentes compartilhados aprovadas pelo usuário
- [ ] Revalidar todas as rotas nos três breakpoints e registrar estabilidade final

## FASE 70 – Implantação Controlada na VPS

- [ ] Auditar a VPS, repositório, serviços e pré-requisitos antes de iniciar o deploy
- [ ] Preparar código, segredos locais e banco MySQL para execução privada
- [ ] Instalar dependências, validar build e iniciar a aplicação apenas no loopback
- [ ] Aplicar migrations e ativar as units locais da aplicação após validação do banco
- [ ] Solicitar autorização antes de abrir portas, configurar Nginx, TLS Cloudflare Origin CA e wildcard
- [ ] Validar produção, systemd timer, isolamento multi-tenant e controles de segurança
- [ ] Restringir a escuta de produção ao loopback antes de expor a aplicação por Nginx
