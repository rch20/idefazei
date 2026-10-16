# Ide Fazei — Lembretes de Escalas na Hostinger VPS

Este guia implanta os lembretes internos de Escala **sem Heartbeat, agendador, credencial ou serviço de produção do Manus**. A aplicação recebe uma chamada local autenticada, calcula as janelas de **24 horas** e **2 horas**, e grava eventos e entregas no MySQL da própria Ide Fazei. A chave de deduplicação por `escala + etapa` impede novos avisos para a mesma janela quando o timer for repetido.

## Dependências do fluxo

| Componente | Responsabilidade | Dependência de Manus |
| --- | --- | --- |
| Node.js + Express | Expõe `POST /api/scheduled/schedule-reminders`. | Não. |
| MySQL | Lê Escalas, contas ativas e Ministérios; grava notificações. | Não. |
| `INTERNAL_JOBS_TOKEN` | Protege a chamada local do timer. | Não. |
| systemd timer | Dispara a rotina a cada hora e preserva logs no journal. | Não. |
| Notificações internas | Usa `notification_events` e `notification_deliveries`. | Não. |

> O job não consulta APIs de IA, armazenamento de arquivos, OAuth ou notificações de proprietário. Esses recursos existentes em outros módulos devem ser tratados separadamente em uma migração completa, mas **não fazem parte desta rotina**.

## 1. Variáveis de ambiente

Crie `/etc/ide-fazei/ide-fazei.env` com permissão restrita ao usuário que executa a aplicação:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://USUARIO:SENHA@127.0.0.1:3306/ide_fazei
JWT_SECRET=troque-por-uma-chave-longa-e-aleatoria
INTERNAL_JOBS_TOKEN=troque-por-um-segredo-longo-e-aleatorio
TZ=America/Sao_Paulo
```

Gere o segredo local sem expô-lo em conversas, repositórios ou arquivos públicos:

```bash
openssl rand -hex 32
```

```bash
sudo chown root:idefazei /etc/ide-fazei/ide-fazei.env
sudo chmod 640 /etc/ide-fazei/ide-fazei.env
```

## 2. Preparar a aplicação

Após copiar o código para `/opt/ide-fazei`, instale dependências, aplique as migrations e gere a build:

```bash
cd /opt/ide-fazei
corepack enable
pnpm install --frozen-lockfile
pnpm drizzle-kit migrate
pnpm build
```

As migrations precisam incluir a `0022_overconfident_zarek.sql`, que adiciona o evento `lembrete_escala` ao catálogo de notificações.

## 3. Serviço principal da aplicação

Crie `/etc/systemd/system/ide-fazei.service`:

```ini
[Unit]
Description=Ide Fazei Web Application
After=network.target mysql.service

[Service]
Type=simple
User=idefazei
Group=idefazei
WorkingDirectory=/opt/ide-fazei
EnvironmentFile=/etc/ide-fazei/ide-fazei.env
ExecStart=/usr/bin/node /opt/ide-fazei/dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

## 4. Job de lembretes

Crie `/etc/systemd/system/ide-fazei-schedule-reminders.service`:

```ini
[Unit]
Description=Ide Fazei - Lembretes internos de Escalas
After=ide-fazei.service
Requires=ide-fazei.service

[Service]
Type=oneshot
User=idefazei
Group=idefazei
EnvironmentFile=/etc/ide-fazei/ide-fazei.env
ExecStart=/usr/bin/sh -c '/usr/bin/curl --fail --silent --show-error --max-time 55 -X POST http://127.0.0.1:3000/api/scheduled/schedule-reminders -H "x-internal-jobs-token: $INTERNAL_JOBS_TOKEN"'
StandardOutput=journal
StandardError=journal
```

Crie `/etc/systemd/system/ide-fazei-schedule-reminders.timer`:

```ini
[Unit]
Description=Executa lembretes de Escala da Ide Fazei a cada hora

[Timer]
OnCalendar=hourly
Persistent=true
AccuracySec=1min
Unit=ide-fazei-schedule-reminders.service

[Install]
WantedBy=timers.target
```

Ative os serviços:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ide-fazei.service
sudo systemctl enable --now ide-fazei-schedule-reminders.timer
```

## 5. Validação e observabilidade

Execute manualmente uma vez antes de aguardar o timer:

```bash
sudo systemctl start ide-fazei-schedule-reminders.service
sudo systemctl status ide-fazei-schedule-reminders.service --no-pager
sudo systemctl list-timers ide-fazei-schedule-reminders.timer
sudo journalctl -u ide-fazei-schedule-reminders.service -n 100 --no-pager
```

O retorno bem-sucedido contém `remindersCreated` e `deliveries`. Reexecutar o mesmo job na mesma janela não cria novos eventos, pois a aplicação persiste as chaves `lembrete-escala-<id>-24h` e `lembrete-escala-<id>-2h`.

## 6. Limites de acesso e rede

O endpoint é chamado apenas por `127.0.0.1`; não o exponha no Nginx. A chamada exige o cabeçalho `x-internal-jobs-token`, comparado de modo seguro no backend. Uma chamada sem segredo retorna `403`; ambiente sem `INTERNAL_JOBS_TOKEN` retorna `503` em vez de processar o job.

Para a aplicação pública, coloque Nginx ou Caddy na frente do Node com TLS e mantenha a porta 3000 acessível somente localmente. A rotina não precisa de acesso externo além do MySQL configurado na VPS.
