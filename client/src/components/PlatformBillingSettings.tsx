import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BILLING_PLAN_KEYS, BILLING_PLANS, formatBrl } from "@shared/billing";

const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", pago: "Pago", falhou: "Falhou", cancelado: "Cancelado" };
const MODE_LABEL: Record<string, string> = { pontual: "Avulso", recorrente: "Recorrente", manual: "Manual" };
const BASE_TEST = "https://sdx-api.pagar.me/core/v5";
const BASE_LIVE = "https://api.pagar.me/core/v5";

/** Super Admin → Pagamentos: chaves do Pagar.me, teste de conexão, bloqueio por vencimento e cobranças. */
export default function PlatformBillingSettings() {
  const utils = trpc.useUtils();
  const config = trpc.billing.admin.config.useQuery();
  const payments = trpc.billing.admin.payments.useQuery();
  const churches = trpc.superAdmin.churches.useQuery();
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enforce, setEnforce] = useState<boolean | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [grant, setGrant] = useState({ churchId: "", plan: "basico", cycle: "mensal", note: "" });

  const save = trpc.billing.admin.saveConfig.useMutation({
    onSuccess: async () => { setSecretKey(""); setResult(null); toast.success("Configuração salva."); await utils.billing.admin.config.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const test = trpc.billing.admin.testConnection.useMutation({ onSuccess: setResult, onError: (error) => setResult({ ok: false, message: error.message }) });
  const grantMutation = trpc.billing.admin.grant.useMutation({
    onSuccess: async (data) => { toast.success(`Lançado. Vigência até ${data.paidUntil ? new Date(data.paidUntil).toLocaleDateString("pt-BR") : "—"}.`); setGrant({ ...grant, note: "" }); await utils.billing.admin.payments.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  if (!config.data) return <p className="text-sm text-white/50">Carregando…</p>;
  const view = config.data;
  const currentBase = baseUrl ?? view.baseUrl;
  const currentPublic = publicKey ?? view.publicKey;
  const currentEnforce = enforce ?? view.enforce;
  const webhookUrl = view.webhookPath ? `${window.location.origin}${view.webhookPath}` : "";
  const field = "border-white/10 bg-white/5 text-white placeholder:text-white/30";

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5"><CardContent className="space-y-4 pt-6">
        <div>
          <h3 className="font-semibold text-white">Pagar.me</h3>
          <p className="text-xs text-white/50">Pix, cartão e boleto. A chave secreta fica criptografada e nunca volta para esta tela.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-white/70">Ambiente (endereço da API)</Label>
            <select value={currentBase === BASE_TEST || currentBase === BASE_LIVE ? currentBase : "custom"} onChange={(event) => setBaseUrl(event.target.value === "custom" ? currentBase : event.target.value)} className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${field}`}>
              <option className="text-black" value={BASE_TEST}>Teste (sdx-api.pagar.me)</option>
              <option className="text-black" value={BASE_LIVE}>Produção (api.pagar.me)</option>
              <option className="text-black" value="custom">Outro endereço</option>
            </select>
            <Input className={`mt-2 font-mono text-xs ${field}`} value={currentBase} onChange={(event) => setBaseUrl(event.target.value)} aria-label="Endereço da API" />
          </div>
          <div>
            <Label className="text-white/70">Chave secreta (sk_…)</Label>
            <Input type="password" autoComplete="off" className={`mt-1 font-mono ${field}`} value={secretKey} onChange={(event) => setSecretKey(event.target.value)} placeholder={view.secretKeyMasked ?? "sk_test_…"} />
            <p className="mt-1 text-xs text-white/40">{view.secretKeyMasked ? `Salva: ${view.secretKeyMasked}. Deixe em branco para manter.` : "Ainda não salva."}</p>
          </div>
          <div>
            <Label className="text-white/70">Chave pública (pk_…)</Label>
            <Input className={`mt-1 font-mono ${field}`} value={currentPublic} onChange={(event) => setPublicKey(event.target.value)} placeholder="pk_test_…" />
          </div>
          <div>
            <Label className="text-white/70">Endereço do webhook (cadastre no painel do Pagar.me)</Label>
            <Input readOnly className={`mt-1 font-mono text-xs ${field}`} value={webhookUrl || "Salve a configuração para gerar"} onFocus={(event) => event.currentTarget.select()} />
            <p className="mt-1 text-xs text-white/40">Eventos: order.paid, charge.paid, charge.payment_failed. O código no endereço é secreto: não divulgue.</p>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-white/10 p-3 text-sm text-white/80">
          <input type="checkbox" className="mt-1" checked={currentEnforce} onChange={(event) => setEnforce(event.target.checked)} />
          <span><strong>Bloquear igrejas vencidas.</strong> Desligado: só aparecem avisos. Ligado: depois do teste de 30 dias ou do vencimento, mais 7 dias de carência, a igreja só consegue abrir a tela Assinatura.</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={save.isPending} className="bg-[#c9a84c] text-[#14283f] hover:bg-[#c9a84c]/90" onClick={() => save.mutate({ baseUrl: currentBase, secretKey: secretKey || undefined, publicKey: currentPublic, enforce: currentEnforce })}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          <Button variant="outline" disabled={test.isPending || !view.configured} className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => test.mutate()}>{test.isPending ? "Testando…" : "Testar conexão"}</Button>
          {view.configured ? <Button variant="ghost" className="text-white/60 hover:text-white" onClick={() => save.mutate({ baseUrl: currentBase, enforce: currentEnforce, regenerateWebhookToken: true })}>Gerar novo código do webhook</Button> : null}
        </div>
        {result ? <p role="status" className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{result.message}</p> : null}
      </CardContent></Card>

      <Card className="border-white/10 bg-white/5"><CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold text-white">Lançar pagamento manual</h3>
        <p className="text-xs text-white/50">Para quem pagou fora do sistema ou ganhou cortesia. Soma o período à vigência da igreja.</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <select value={grant.churchId} onChange={(event) => setGrant({ ...grant, churchId: event.target.value })} className={`h-10 rounded-md border px-3 text-sm ${field}`} aria-label="Igreja">
            <option className="text-black" value="">Escolha a igreja</option>
            {(churches.data ?? []).map((church: { id: number; name: string }) => <option className="text-black" key={church.id} value={church.id}>{church.name}</option>)}
          </select>
          <select value={grant.plan} onChange={(event) => setGrant({ ...grant, plan: event.target.value })} className={`h-10 rounded-md border px-3 text-sm ${field}`} aria-label="Plano">
            {BILLING_PLAN_KEYS.map((key) => <option className="text-black" key={key} value={key}>{BILLING_PLANS[key].name}</option>)}
          </select>
          <select value={grant.cycle} onChange={(event) => setGrant({ ...grant, cycle: event.target.value })} className={`h-10 rounded-md border px-3 text-sm ${field}`} aria-label="Período">
            <option className="text-black" value="mensal">1 mês</option>
            <option className="text-black" value="anual">12 meses</option>
          </select>
          <Input className={field} value={grant.note} onChange={(event) => setGrant({ ...grant, note: event.target.value })} placeholder="Observação" maxLength={200} />
        </div>
        <Button disabled={!grant.churchId || grantMutation.isPending} className="bg-white/10 text-white hover:bg-white/20" onClick={() => grantMutation.mutate({ churchId: Number(grant.churchId), plan: grant.plan as "basico", cycle: grant.cycle as "mensal", note: grant.note || undefined })}>Lançar</Button>
      </CardContent></Card>

      <Card className="border-white/10 bg-white/5"><CardContent className="pt-6">
        <h3 className="mb-3 font-semibold text-white">Cobranças recentes</h3>
        {(payments.data ?? []).length === 0 ? <p className="py-6 text-center text-sm text-white/40">Nenhuma cobrança ainda.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm text-white/80">
            <thead className="text-xs uppercase text-white/40"><tr><th className="py-2 pr-3">Igreja</th><th className="pr-3">Plano</th><th className="pr-3">Tipo</th><th className="pr-3">Valor</th><th className="pr-3">Status</th><th>Data</th></tr></thead>
            <tbody>{(payments.data ?? []).map((item) => (
              <tr key={item.id} className="border-t border-white/5">
                <td className="py-2 pr-3">{item.churchName ?? `#${item.churchId}`}</td>
                <td className="pr-3">{BILLING_PLANS[item.planKey as "basico"]?.name ?? item.planKey} · {item.cycle}</td>
                <td className="pr-3">{MODE_LABEL[item.mode] ?? item.mode}</td>
                <td className="pr-3">{formatBrl(item.amountCents)}</td>
                <td className="pr-3">{STATUS_LABEL[item.status] ?? item.status}</td>
                <td>{new Date(item.paidAt ?? item.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </CardContent></Card>
    </div>
  );
}
