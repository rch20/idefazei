# Auditoria Fase 13 — Achados iniciais

## Fluxos e segurança

- O acesso do tenant dependia de uma sessão JWT que não era enviada pelo cliente nem interpretada pelo contexto do servidor; a ponte foi implementada e coberta por testes.
- O painel Super Admin possui endpoints sensíveis expostos publicamente e o token administrativo ainda não é enviado nas chamadas tRPC.
- O cadastro público de usuários de igreja aceita `churchId` arbitrário e deve ser restrito ao fluxo de convite/autorização.
- A consulta de leads do Portal do Visitante está pública e precisa exigir vínculo com a igreja solicitada.

## Interface e jornada

- A rota de onboarding não é envolvida pelo layout autenticado; depende de contexto padrão e possui links finais inconsistentes para `/dashboard` em vez de `/app/dashboard`.
- Há páginas que reaplicam `ChurchLayout` dentro do wrapper global, podendo criar layout aninhado.
- Ações sem fluxo completo foram encontradas, incluindo recuperação de senha e upload de material na biblioteca.
- A página pública exibe depoimentos apresentados como reais sem fonte verificável; esse conteúdo deve ser removido.
- A página de planos precisa usar a sessão JWT da igreja, e não o fluxo Manus, quando um tenant autenticado inicia o checkout.

## Validação visual pós-correção

As rotas públicas, cadastro, login, onboarding e planos foram verificadas em viewport mobile de 375 × 812 pixels. Os fluxos permanecem legíveis, os CTAs não ultrapassam a largura da tela e a nova seção institucional da página inicial substitui os antigos depoimentos apresentados como avaliações reais. O onboarding mantém a jornada de quatro etapas e agora direciona para `/app/dashboard`.

A verificação posterior ao reinício confirmou o carregamento das telas públicas sem erro de módulo visível. A tela de login mantém o controle de senha e a opção de sessão persistente, enquanto planos e onboarding preservam a hierarquia visual e a usabilidade em tela estreita.

## Validação final de acessibilidade e interações

Foi aplicado um estilo global de foco visível em links, botões, campos, seletores e controles com papel de botão. Os controles de ícone da senha e da navegação de meses receberam rótulos acessíveis, o alternador de período dos planos e os filtros da biblioteca passaram a expor estado selecionado, e as áreas de upload de logo e CSV foram tornadas acionáveis por Enter e Espaço.

A varredura final não encontrou layouts `ChurchLayout` aninhados nem os antigos avisos clicáveis e sem fluxo para upload, escala ou placeholder. Os últimos fluxos provisórios foram substituídos por modais funcionais, navegação de retorno ao Dashboard ou comunicação explícita do estado de planejamento. A paleta mantém azul-marinho como cor de conteúdo principal sobre fundo creme e anel dourado de foco com afastamento visual, preservando contraste e identificação de foco nos fluxos verificados.
