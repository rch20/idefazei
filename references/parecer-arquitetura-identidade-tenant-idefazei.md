# Parecer Arquitetural — Identidade e Página Pública por Tenant

**Status:** análise técnica; nenhuma funcionalidade existente foi alterada nesta etapa.  
**Objetivo:** evoluir a Ide Fazei para uma única plataforma multi-tenant, na qual cada igreja possui identidade e página pública próprias, sem criar uma aplicação ou um código independente por igreja.

## Conclusão

> **Sim, a evolução é viável sem comprometer o que já funciona.** A base atual já resolve a igreja pelo subdomínio, mantém `churchId` nas regras operacionais e possui uma configuração institucional inicial por igreja. O que falta é transformar essa configuração básica em uma camada estruturada de **tema, conteúdo e página pública publicada**.

O modelo correto não é uma cópia do Dia & Beleza. A referência serve somente para o princípio de isolamento: `igrejaa.idefazei.com.br` e `igrejab.idefazei.com.br` executam o mesmo sistema, mas cada uma resolve uma configuração distinta. A identidade, os textos e as mídias de uma igreja não participam de consultas, cache de escrita, permissões ou publicação de outra.

| Aspecto | Situação atual | Evolução recomendada |
| --- | --- | --- |
| Código | Uma base React/Express compartilhada | Permanecer uma única base e um único deploy. |
| Tenant | Resolvido pelo primeiro subdomínio no servidor e frontend | Manter o resolvedor e centralizá-lo como fonte oficial do tenant público. |
| Dados | `churchId` sustenta os módulos operacionais | Toda nova configuração pública terá `churchId` obrigatório e filtro composto no servidor. |
| Identidade | Nome, slug, logo e duas cores já existem em `churches` | Criar configuração visual e conteúdo publicados por igreja. |
| Página pública | A landing comercial é fixa e aparece na rota `/` de qualquer host | Domínio principal mantém a landing da Ide Fazei; subdomínio passa a renderizar a página da igreja. |

## Leitura da arquitetura atual

O backend já extrai o subdomínio do host e resolve a igreja pelo `slug`. Se o host for `igrejaa.idefazei.com.br`, o contexto carrega a Igreja A; o mesmo mecanismo reconhece a Igreja B no respectivo host. A tabela `churches` possui `slug` único, nome, logo, cores, contatos, visão e missão. O painel atual de Configurações já permite ao administrador alterar esses dados dentro da própria igreja.

Esta é uma base apropriada para a evolução. A principal lacuna está na camada de apresentação: a landing comercial atual é um componente global fixo, e o Portal do Visitante/cadastro público ainda possuem textos e estilo estáticos. Assim, o isolamento de **dados operacionais** já é real em boa parte da plataforma; o isolamento de **identidade e conteúdo público** precisa ser implementado de forma explícita.

## Separação recomendada

### 1. Núcleo global da Ide Fazei

O núcleo continuará global, versionado e mantido uma única vez. Inclui autenticação, subdomínios, permissões, regras de discipulado, pessoas, células, consolidação, escalas, tesouraria, notificações, componentes base, segurança, responsividade e atualizações de código. Uma correção nesse núcleo alcançará todas as igrejas no próximo deploy, sem copiar arquivos ou executar migrações por tenant.

### 2. Configuração individual da igreja

Cada igreja terá apenas dados configuráveis: marca, cores, tipografia permitida, logo, mídias, textos, links, seções ativadas, ordem de seções e template escolhido. Esses dados serão lidos pelo subdomínio e aplicados como variáveis de tema e conteúdo. Eles não poderão substituir componentes do sistema nem executar HTML, CSS ou JavaScript arbitrários.

| Pode ser configurável | Deve continuar global e protegido |
| --- | --- |
| Logo, ícone, nome público e slogan | Estrutura técnica, rotas, autenticação e permissões |
| Cores dentro de paleta/contraste validado | Componentes, acessibilidade e comportamento de botões |
| Hero: mídia, título, subtítulo e CTAs | Regras de negócio e consultas de dados |
| Seções permitidas, textos, imagens, banners e ordem | Código de templates e limites responsivos |
| Links sociais, endereço, horários e rodapé | Política de segurança, upload e cache |
| Template global selecionado | Código arbitrário, CSS livre, scripts ou embeds não validados |

## Modelo de dados proposto

Não recomendo colocar todos os blocos em dezenas de colunas na tabela `churches`. Ela deve permanecer como registro institucional e operacional. A camada pública deve ser separada para permitir rascunho, publicação e evolução sem risco de alterar módulos internos.

| Entidade proposta | Chave e isolamento | Finalidade |
| --- | --- | --- |
| `tenant_public_sites` | `churchId` único | Template escolhido, estado `draft/published`, SEO básico, versão publicada e datas. |
| `tenant_themes` | `churchId` único | Cores, fontes permitidas, contraste, logo, favicon e aparência global do site da igreja. |
| `tenant_page_sections` | `churchId` + `siteId` | Blocos permitidos, ativação, ordem, conteúdo e configuração visual por bloco. |
| `tenant_public_media` | `churchId` | Metadados de imagem/vídeo; bytes ficam no armazenamento de objetos e nunca no banco. |
| `tenant_page_revisions` | `churchId` + versão | Histórico de rascunhos e publicação; permite reversão e auditoria. |

Uma implementação inicial pode começar com `tenant_public_sites` e `tenant_page_sections`, guardando tema e SEO em JSON validado por schema. Quando os blocos ficarem mais variados, o modelo já permite normalizar sem migrar a lógica de tenant.

## Garantias de isolamento

O servidor jamais aceitará `churchId` vindo da tela como autoridade para configurar um site. Nas mutações, o `churchId` será derivado da conta autenticada; cada leitura/atualização/exclusão combinará `churchId` com o ID do recurso. A leitura pública fará o caminho inverso: **host → slug → igreja ativa → configuração publicada daquela igreja**.

Mídias usarão chaves com prefixo por igreja, como `churches/{churchId}/public/...`. A conta da Igreja A só poderá alterar suas próprias seções, mídias e revisões. Super Admin poderá consultar e suspender, mas não misturará conteúdos. A publicação será atômica: o visitante recebe somente a última versão marcada como publicada, nunca um rascunho em edição.

## Painel do administrador da igreja

O local natural é a atual área **Configurações**, em uma nova seção chamada **Página Pública**. Não deve ser um construtor livre de páginas; deve ser um configurador visual com blocos aprovados, prévia e publicação. Assim, entrega autonomia sem transformar cada tenant em uma aplicação diferente.

| Etapa do painel | Conteúdo | Controle |
| --- | --- | --- |
| Identidade | Nome público, logo, favicon, cores e fonte permitida | Validação de contraste e prévia instantânea. |
| Hero | Imagem ou vídeo, título, subtítulo e até dois botões | Limites de texto, mídia otimizada e CTA por tipo seguro. |
| Seções | Sobre a igreja, visão/valores, horários, ministérios, eventos, convite, mapa, banner e contato | Ativar/desativar blocos globais e ordenar por controles de mover. |
| Mídia | Biblioteca de imagens, alt text e seleção de capa | Tipo, tamanho e propriedade por tenant validados no servidor. |
| Rodapé e links | Redes sociais, endereço, WhatsApp e links úteis | URLs normalizadas e testadas. |
| Prévia e publicação | Preview em desktop/mobile, salvar rascunho, publicar e reverter | Rascunho privado; publicação auditada. |

Minha recomendação de permissão é permitir edição e publicação a **Pastor Presidente** e **Pastor Local**. Secretário pode ser incluído futuramente como editor de rascunho, mas não como publicador inicial. Essa divisão reduz alterações públicas acidentais.

## Rotas e experiência recomendadas

| Host / rota | Experiência futura |
| --- | --- |
| `idefazei.com.br/` | Landing institucional/comercial da Ide Fazei, planos, recursos, vendas e acesso Super Admin. |
| `admin.idefazei.com.br/` ou `/admin` | Administração global da plataforma. |
| `igrejaa.idefazei.com.br/` | Página pública publicada e temática da Igreja A. |
| `igrejab.idefazei.com.br/` | Página pública publicada e temática da Igreja B. |
| `igrejaa.idefazei.com.br/login` | Login com nome, logo e tema da Igreja A. |
| `igrejaa.idefazei.com.br/visitante` | Portal visitante e formulários com a identidade da Igreja A. |
| `igrejaa.idefazei.com.br/app/...` | Painel operacional existente, recebendo o tema da Igreja A sem alterar as permissões. |

## Templates e crescimento

É possível oferecer templates diferentes sem criar aplicações diferentes. O template será uma chave global, como `ministerial-classico`, `comunidade-acolhedora` ou `eventos-e-conexoes`. Cada chave aponta para componentes mantidos no núcleo da Ide Fazei; a igreja escolhe o template e preenche os blocos permitidos. Isso garante atualizações globais, acessibilidade, desempenho e correções para todos.

Não recomendo, na primeira etapa, um editor com blocos totalmente livres, código customizado, CSS personalizado ou seções inventadas pelo usuário. Esse formato aumenta risco de páginas quebradas, baixo desempenho, falhas mobile e vulnerabilidades. O configurador por blocos resolve a necessidade real de identidade e apresentação sem criar um produto difícil de sustentar.

## Desempenho, responsividade e scroll

A configuração pública será pequena e poderá ser carregada uma vez por host, com cache curto no Cloudflare e invalidação na publicação. O template será carregado sob demanda; vídeos não deverão bloquear a primeira pintura e sempre terão imagem de poster/fallback. Imagens serão convertidas para formatos responsivos e limitadas por tamanho.

Os templates continuam usando o mesmo sistema de espaçamento, containers, guarda contra overflow horizontal e componentes responsivos já validados na Ide Fazei. A igreja poderá trocar conteúdo e ordem dos blocos, mas não poderá quebrar a grade, definir larguras arbitrárias ou inserir elementos que escapem do viewport.

## Plano de evolução recomendado

| Fase | Entrega | Risco e proteção |
| --- | --- | --- |
| 1. Fundação | Resolver público central e tabelas de site/tema por igreja; migrar logo e cores existentes como padrão. | Aditiva, sem mudar o painel operacional. |
| 2. Página pública base | Subdomínio renderiza template ministerial com hero, identidade, contato e CTA. | Landing global permanece exclusiva no domínio principal. |
| 3. Painel de personalização | Rascunho, prévia, hero, cores, textos, mídia e publicação. | Permissões no servidor e revisão de tenant em cada ação. |
| 4. Blocos e templates | Seções ativáveis, ordem e dois ou três templates globais. | Componentes permitidos, sem código livre. |
| 5. Maturidade | Revisões, reversão, SEO, Open Graph, métricas e biblioteca de mídia. | Auditoria, cache por versão e testes de isolamento. |

## Decisão recomendada

Recomendo aprovar a evolução por **configurador visual de páginas com templates globais e blocos seguros**, iniciando por um único template ministerial. A Igreja A poderá ter logo, hero, cores, textos e seções próprias; a Igreja B terá configurações distintas; e ambas receberão melhorias do mesmo núcleo da Ide Fazei. Esse é o melhor equilíbrio entre autonomia, estabilidade, custo de manutenção e crescimento futuro.

## Referências internas analisadas

| Arquivo | Evidência usada |
| --- | --- |
| `server/_core/context.ts` | Resolução atual do tenant por subdomínio e vínculo com a igreja. |
| `drizzle/schema.ts` | Estrutura atual de `churches`, incluindo slug, logo, cores e dados institucionais. |
| `server/routers.ts` | Consulta pública limitada por slug e escrita protegida por igreja. |
| `client/src/App.tsx` | Landing global fixa na rota raiz e rotas existentes de login/app. |
| `client/src/pages/Configuracoes.tsx` | Área existente de identidade básica para expansão natural. |
| `client/src/pages/PortalVisitante.tsx` | Exemplo atual de apresentação pública ainda fixa. |
