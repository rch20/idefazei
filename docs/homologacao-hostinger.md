# Homologação do Ide Fazei na VPS Hostinger

A homologação é uma cópia do sistema, separada da produção, para ver as mudanças antes de publicá-las. Ela tem banco de dados próprio, e nada nela toca nos dados reais das igrejas.

> **Status:** estes arquivos foram escritos, mas **ainda não foram executados** em uma VPS. O primeiro subir deve ser acompanhado, e o que falhar vira correção neste mesmo PR.

## O que existe

| Arquivo | Função |
|---|---|
| `Dockerfile` | Compila o sistema e gera a imagem |
| `docker-compose.staging.yml` | Sobe o app e um MySQL só da homologação |
| `.env.staging.example` | Modelo das variáveis (copie para `.env.staging`) |
| `scripts/staging-db-init.mjs` | Cria as tabelas num banco vazio |
| `.github/workflows/deploy-homologacao.yml` | Testa e publica sozinho quando a branch `homologacao` recebe código |

## Regras de segurança (não pule)

1. **Não copie o banco de produção** para cá. Há dados pessoais de membros, aconselhamento e finanças (LGPD). Se precisar de dados realistas, use um dump anonimizado.
2. **E-mail desligado** (`PASSWORD_RESET_EMAIL_ENABLED=false`, `EMAIL_VERIFICATION_ENABLED=false`), para não escrever para pessoas reais.
3. **Stripe só com chaves de teste** (`sk_test_...`). **Cloudinary** com conta ou pasta de teste.
4. **Segredos diferentes** dos de produção (`JWT_SECRET`, `INTERNAL_JOBS_TOKEN` etc.).
5. O `.env.staging` fica **só na VPS**. Nunca vai para o GitHub.

## Primeira vez na VPS

Pré-requisito: Docker e Docker Compose instalados. Na Hostinger, o modelo de VPS "Ubuntu com Docker" já vem pronto.

```bash
# 1. Baixar o código (o repositório é público)
sudo mkdir -p /opt/idefazei-staging && sudo chown $USER /opt/idefazei-staging
git clone https://github.com/rch20/idefazei.git /opt/idefazei-staging
cd /opt/idefazei-staging

# 2. Configurar
cp .env.staging.example .env.staging
nano .env.staging          # preencha senhas, JWT_SECRET, PUBLIC_APP_URL etc.
# dica para gerar segredos: openssl rand -hex 32

# 3. Subir
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# 4. Criar as tabelas (só na primeira vez; recusa rodar se o banco já tiver dados)
docker compose -f docker-compose.staging.yml exec app node scripts/staging-db-init.mjs

# 5. Conferir
docker compose -f docker-compose.staging.yml ps
curl -I http://127.0.0.1:3100/
```

Para recomeçar do zero, apagando **só** o banco da homologação:
`docker compose -f docker-compose.staging.yml down -v`

## Acesso pelo navegador (HTTPS)

O app escuta só em `127.0.0.1:3100`. Para abrir pela internet, aponte um proxy reverso (Nginx, Caddy ou o que você já usa na VPS) de um endereço HTTPS para `127.0.0.1:3100`. Use um endereço diferente da produção.

### Limitação conhecida: o sistema escolhe a igreja pelo endereço

O servidor trata qualquer endereço com três partes (como `homolog.exemplo.com`) como o subdomínio de uma igreja, e só reconhece como "plataforma" os endereços `idefazei.com.br`, `www.` e `admin.` escritos no código (`server/_core/index.ts`). Por isso, na homologação:

- a tela de plataforma e o login do Super Admin **podem não abrir** num endereço novo;
- o front-end também compara com `.idefazei.com.br` (`client/src/App.tsx`).

A correção é pequena e segura: ler essa lista de uma variável de ambiente (por exemplo `PLATFORM_HOSTNAMES`), mantendo os valores atuais como padrão. Não está neste PR porque mexe no código de produção e deve ter PR e testes próprios.

## Publicar sozinho na homologação

1. No GitHub, em **Settings → Environments**, crie o ambiente `homologacao`.
2. Em **Settings → Secrets and variables → Actions**, crie:

   | Segredo | Valor |
   |---|---|
   | `STAGING_SSH_HOST` | IP ou nome da VPS |
   | `STAGING_SSH_USER` | usuário de deploy (não use root se puder evitar) |
   | `STAGING_SSH_PORT` | porta SSH (opcional, padrão 22) |
   | `STAGING_SSH_KEY` | chave **privada** criada só para deploy |
   | `STAGING_SSH_KNOWN_HOSTS` | saída de `ssh-keyscan -p PORTA IP_DA_VPS` |
   | `STAGING_PATH` | `/opt/idefazei-staging` |

3. Na VPS, adicione a chave **pública** correspondente em `~/.ssh/authorized_keys` do usuário de deploy.
4. Para ver uma mudança na homologação: `git push origin nome-da-branch:homologacao --force-with-lease`.

O fluxo roda `pnpm check`, `pnpm test` e `pnpm build`. Se passar, entra na VPS, atualiza o código e sobe os containers. Se o app não ficar saudável em cerca de 2 minutos, volta sozinho para a versão anterior.

## Migrações de banco: atenção

- A homologação nunca roda `pnpm db:push`. Esse comando também **gera** novas migrações (`drizzle-kit generate`) e não deve rodar sozinho em nenhum ambiente.
- O projeto tem 15 migrações "custom-additive" (a partir da `0068`) que, pela política em `drizzle/custom-migrations.json`, são aplicadas por um fluxo operacional controlado. O `staging-db-init.mjs` aplica todos os 84 arquivos em ordem só para montar um banco novo.
- O arquivo `0082_church_email_verification.sql` não consta no ledger de migrações custom. Confirme se ele deve mesmo ser aplicado.
- Quando uma mudança nova trouxer migração, aplique primeiro na homologação, valide, e só depois pela rotina que você já usa em produção (com backup do MySQL antes).

## Produção

Nada aqui altera a produção. Quando a homologação estiver estável, o mesmo `Dockerfile` pode servir de base para um deploy automático de produção com aprovação manual.
