# Validação responsiva da Escola de Fundamentos

A suíte usa os viewports `375×812`, `390×844`, `768×1024` e `1280×800` e executa somente verificações de leitura na homologação.

## Pré-requisitos

- `@playwright/test` instalado;
- Chromium instalado com `pnpm exec playwright install chromium`;
- `playwright/.auth/student-homolog.json` materializado por um canal protegido, com modo `600`;
- conta de aluno matriculado na homologação correta.

O arquivo de autenticação é ignorado pelo Git. **Não** cole seu conteúdo no chat, não o envie para o repositório e não coloque senha, cookie ou token em argumento de comando.

## Execução

```bash
cd /home/ubuntu/idefazei-stage3a-ficha-financeira-worktree
pnpm test:mobile
```

Para usar outro caminho protegido, defina somente o caminho do arquivo:

```bash
PW_STORAGE_STATE_PATH=/caminho/protegido/student-homolog.json pnpm test:mobile
```

A suíte bloqueia automaticamente:

- alvo diferente de `https://homolog.idefazei.com.br`;
- execução sem storage state;
- atualização de snapshots sem `ALLOW_UPDATE_SNAPSHOTS=1`;
- requests `POST`, `PUT`, `PATCH` ou `DELETE` durante os cenários;
- overflow horizontal no documento;
- erro JavaScript não tratado na página.

São executados dois cenários por viewport, totalizando oito testes. Os artefatos ficam em diretórios ignorados (`test-results/` e `playwright-report/`).
