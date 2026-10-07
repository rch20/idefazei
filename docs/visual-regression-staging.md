# Regressão visual diária em homologação

## O que foi configurado

O workflow `.github/workflows/visual-regression-staging.yml` executa todos os dias às **09:00 UTC (06:00 BRT)** contra:

```text
https://homolog.idefazei.com.br
```

Projetos Playwright:

- `mobile-375`: 375x812;
- `mobile-390`: 390x844;
- `tablet-768`: 768x1024;
- `desktop-1440`: 1440x900.

A suíte cobre:

- overflow horizontal em Escalas;
- estabilidade visual do calendário;
- limpeza da seleção ao trocar de mês;
- overflow horizontal em Ministérios;
- estado vazio e cards de Ministérios;
- busca sem resultado e limpeza da busca;
- abertura/fechamento do modal Novo Ministério;
- ausência de mutations de criação, edição, exclusão ou cancelamento.

A rotina nunca acessa produção e não executa gravações.

## Segredo obrigatório no GitHub

O workflow precisa de uma sessão autenticada **exclusiva de homologação** no secret:

```text
PW_STORAGE_STATE
```

O valor é o conteúdo JSON do arquivo Playwright `storageState`, contendo somente cookies/origins da homologação. Não use sessão de produção.

O arquivo nunca é commitado. O workflow o materializa em:

```text
playwright/.auth/pastor-homolog.json
```

A sessão deve pertencer a uma conta de teste com permissões suficientes para consultar Escalas e Ministérios. Não use uma conta pessoal.

## Gerar o storage state localmente

Em uma máquina segura, com Playwright instalado:

```bash
mkdir -p playwright/.auth
pnpm exec playwright codegen \
  --save-storage=playwright/.auth/pastor-homolog.json \
  https://homolog.idefazei.com.br/login
```

Faça login apenas na conta de teste de homologação, acesse a aplicação e encerre o Codegen. Não copie a senha para o repositório nem para o chat.

Antes de configurar o secret, valide localmente:

```bash
pnpm exec playwright install chromium
STAGING_BASE_URL=https://homolog.idefazei.com.br \
  pnpm test:visual
```

## Configurar o secret via GitHub CLI

Execute em uma máquina confiável, dentro do repositório, sem imprimir o conteúdo:

```bash
gh secret set PW_STORAGE_STATE \
  --repo rch20/idefazei \
  < playwright/.auth/pastor-homolog.json
```

Verifique apenas a presença do secret:

```bash
gh secret list --repo rch20/idefazei
```

O comando não deve ser usado com `cat`, `echo`, logs verbosos ou redirecionamento para arquivos públicos.

## Baselines visuais

Os screenshots de referência ficam versionados em:

```text
tests/visual/__screenshots__/
```

Eles devem ser gerados em Linux/Chromium, no mesmo ambiente do GitHub Actions. Depois de configurar o secret, gere-os manualmente:

```bash
pnpm test:visual -- --update-snapshots
```

Revise os arquivos e faça commit somente das imagens esperadas. A sessão em `playwright/.auth/` permanece ignorada pelo Git.

Também é possível executar a regeneração pelo GitHub Actions em **Actions → Visual Regression — Staging → Run workflow**, marcando `update_snapshots`. Esse modo é manual e não é usado pelo agendamento diário.

## Executar somente os dois mobiles

```bash
pnpm test:visual:mobile
```

## Executar manualmente no GitHub

Sem regenerar baselines:

```bash
gh workflow run visual-regression-staging.yml \
  --repo rch20/idefazei
```

Acompanhar a execução:

```bash
gh run watch --repo rch20/idefazei
```

## Falhas

Em caso de falha, o workflow publica por 14 dias:

- relatório HTML do Playwright;
- screenshots atualizados;
- diffs visuais;
- traces e vídeos de falha, quando gerados.

A investigação deve comparar a mudança com a homologação atual. Não atualizar baselines automaticamente no job agendado: uma regressão não pode se tornar a nova referência sem revisão humana.

## Segurança e escopo

- base URL fixa em homologação;
- `permissions: contents: read`;
- `concurrency` evita execuções concorrentes;
- segredo nunca é publicado como artefato;
- nenhum teste clica em Criar, Salvar, Excluir ou Cancelar escala;
- o teste falha se detectar URLs de mutations proibidas;
- o job agendado não faz deploy, migration ou alteração de dados.
