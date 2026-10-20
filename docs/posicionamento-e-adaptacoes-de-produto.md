# Página de venda: posicionamento e adaptações de produto

Este documento separa o que mudou na **página de venda** (somente apresentação) do que exigiria **mudança no sistema**.

## 1. O que a página de venda afirma hoje (e onde isso existe no sistema)

Regra: só aparece na página o que já funciona. Recursos ligados a uma visão específica (células, consolidação,
Escola de Fundamentos, Encontro com Deus) aparecem como recursos dentro das áreas, nunca como requisito.

| Área na página | Recursos citados | Onde existem no sistema |
|---|---|---|
| Pessoas, membros e visitantes | cadastro, famílias, novas almas, ficha pública com QR, Portal do Visitante, Área do Membro | `/app/pessoas`, `/app/familias`, `/app/almas`, `/cadastro-publico`, `/visite-nos`, `/app/membro` |
| Acompanhamento e cuidado pastoral | central de cuidado, consolidação, radar, oração, aconselhamento, árvore | `/app/cuidado`, `/app/consolidacao`, `/app/radar`, `/app/oracao`, `/app/aconselhamento`, `/app/arvore` |
| Ensino, cursos e formação | Escola de Fundamentos, Escola de Líderes, batismo, Encontro com Deus, estudos, biblioteca | `/app/escola-fundamentos`, `/app/escola-lideres`, `/app/batismo`, `/app/encontro-com-deus`, `/app/estudos-celulas`, `/app/biblioteca` |
| Equipes, ministérios e voluntários | ministérios, escalas com lembretes, estrutura, células, mapa, liderança, App do Líder | `/app/ministerios`, `/app/escalas`, `/app/estrutura-organizacional`, `/app/celulas`, `/app/mapa`, `/app/gestao-lideranca`, `/app/lider` |
| Cultos, eventos e comunicação | eventos com inscrição e QR, página pública, mural, comunicação, notificações | `/app/eventos`, página do tenant, `/app/mural`, `/app/comunicacao`, web push |
| Finanças e administração | tesouraria, contribuições online, contas a pagar, conciliação, perfis, registro de acessos | `/app/tesouraria`, `/doacao`, auditoria financeira e de segurança |

## 2. Decisões comerciais pendentes (não são código)

A página **deixou de prometer** os itens abaixo porque o sistema não os comprova hoje:

1. **Teste grátis de 14 dias, sem cartão.** Não há `trialEndsAt` sendo gravado nem período de teste no checkout.
   O fluxo real é: cadastro, análise da equipe em até 24 horas úteis, liberação por e-mail.
2. **Limites por plano** (200 membros, 10 células). Os valores existem na configuração de cobrança, mas nenhuma regra do servidor os aplica.
3. **Preço do Enterprise** com três versões: "sob consulta" (página de venda), R$ 497 (`/planos`) e R$ 397 (cobrança).
   A página de venda usa "sob consulta".
4. **Recursos de plano que o sistema não tem:** multi-campus, API de integração, white-label, SLA 99,9%, IA Pastoral,
   migração assistida, suporte 24/7. Aparecem em `/planos` e na configuração de cobrança e devem ser corrigidos ou removidos.
5. **Certificados e Faturamento** aparecem como "em construção" no menu; não são citados na página.
6. **Política de privacidade e termos de uso** não existem; a página não cita LGPD, criptografia nem backups.

## 3. Adaptações de produto (exigem mudança no sistema)

Para a página poder prometer isto, o sistema precisa mudar primeiro:

- Nomes configuráveis por igreja (por exemplo, "Células" como "Grupos", "Famílias" ou "Conexões").
- Ligar e desligar módulos por igreja (hoje o que se pode fazer é não usar).
- Aplicar os limites de cada plano no servidor, com aviso ao se aproximar do limite.
- Teste gratuito real (data de término, bloqueio e conversão em assinatura).
- Multi-campus e visão consolidada para redes.
- Demonstração interativa com roteiro por área (a atual segue o caminho de células e funil).
- Idiomas e moedas diferentes (o sistema é em português e em reais).

## 4. Próximas etapas da página (somente apresentação)

- Capturas reais do sistema (celular e computador) no lugar de ilustrações.
- Reescrever `/recursos` e `/planos` com o mesmo posicionamento e as mesmas informações verificadas.
- Política de privacidade e termos de uso, redigidos e revisados por um advogado.
- Imagem de pré-visualização para compartilhamento e `robots.txt`/sitemap.
- Copiar o logo para dentro do sistema, em vez de depender de `/manus-storage/`.
