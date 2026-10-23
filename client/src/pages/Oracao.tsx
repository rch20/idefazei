import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getWhatsAppLink, formatContactPhone } from "@/lib/whatsapp";
import { CheckCircle2, Clock, HandHeart, Lock, MessageCircle, Phone, Plus, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PedidoFilter = "ativos" | "atendidos" | "todos";

function formatPrayerDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days > 1 && days < 7) return `Há ${days} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Oracao() {
  const { churchId, accessSummary } = useChurch();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isPrayerManager = Boolean(accessSummary?.isPrayerManager);
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    type: "pedido" as const,
    content: "",
    isPrivate: false,
  });

  const managerRequestsQuery = trpc.prayer.list.useQuery({ churchId }, { enabled: isPrayerManager });
  const ownRequestsQuery = trpc.prayer.mine.useQuery({ churchId }, { enabled: accessSummary !== null && !isPrayerManager });
  const requests = isPrayerManager ? managerRequestsQuery.data : ownRequestsQuery.data;
  const isLoading = isPrayerManager ? managerRequestsQuery.isLoading : ownRequestsQuery.isLoading;
  const createPublicRequest = trpc.prayer.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido registrado com sucesso!");
      setOpen(false);
      setForm({ visitorName: "", visitorPhone: "", type: "pedido", content: "", isPrivate: false });
      void managerRequestsQuery.refetch();
    },
    onError: (error) => {
      const message = error.message || "Erro ao registrar pedido";
      setFormError(message);
      toast.error(message);
    },
  });
  const createOwnRequest = trpc.prayer.createMine.useMutation({
    onSuccess: () => {
      toast.success("Pedido registrado com sucesso!");
      setOpen(false);
      setForm({ visitorName: "", visitorPhone: "", type: "pedido", content: "", isPrivate: false });
      void ownRequestsQuery.refetch();
    },
    onError: (error) => {
      const message = error.message || "Erro ao registrar pedido";
      setFormError(message);
      toast.error(message);
    },
  });
  const isSubmitting = createPublicRequest.isPending || createOwnRequest.isPending;

  const [pedidoFilter, setPedidoFilter] = useState<PedidoFilter>("ativos");
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const setAnswered = trpc.prayer.setAnswered.useMutation({
    onMutate: (variables) => setAnsweringId(variables.id),
    onSuccess: (_data, variables) => {
      toast.success(variables.answered ? "Pedido marcado como atendido." : "Pedido reaberto.");
      void managerRequestsQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o pedido."),
    onSettled: () => setAnsweringId(null),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPrayerManager) {
      createPublicRequest.mutate({ churchId, ...form });
    } else {
      createOwnRequest.mutate({ churchId, type: form.type, content: form.content, isPrivate: form.isPrivate });
    }
  }

  const pedidos = (requests ?? []).filter((r) => r.type === "pedido");
  const testemunhos = (requests ?? []).filter((r) => r.type === "testemunho");
  const pedidosAtivos = pedidos.filter((r) => !r.answered);
  const pedidosAtendidos = pedidos.filter((r) => r.answered);
  const visiblePedidos = pedidoFilter === "ativos" ? pedidosAtivos : pedidoFilter === "atendidos" ? pedidosAtendidos : pedidos;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Oração</h1>
            <p className="text-sm text-muted-foreground mt-1">{isPrayerManager ? "Pedidos recebidos e testemunhos da comunidade" : "Faça um pedido e acompanhe seus registros"}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Em oração", value: pedidosAtivos.length, icon: Clock, tint: "text-rose-600", ring: "border-rose-100 bg-rose-50/40" },
          { label: "Atendidos", value: pedidosAtendidos.length, icon: CheckCircle2, tint: "text-emerald-600", ring: "border-emerald-100 bg-emerald-50/40" },
          { label: "Testemunhos", value: testemunhos.length, icon: Sparkles, tint: "text-amber-600", ring: "border-amber-100 bg-amber-50/40" },
        ].map((tile) => (
          <div key={tile.label} className={`rounded-2xl border ${tile.ring} p-4 shadow-sm`}>
            <div className="flex items-center gap-2">
              <tile.icon className={`h-4 w-4 ${tile.tint}`} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{tile.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-navy">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos */}
        <div className="card-sacred p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-bold text-navy flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-rose-500" />
              {isPrayerManager ? "Pedidos recebidos" : "Meus pedidos"}
            </h2>
            <div className="inline-flex rounded-full border border-border/70 bg-muted/30 p-0.5 text-xs">
              {([
                { key: "ativos", label: "Em oração", count: pedidosAtivos.length },
                { key: "atendidos", label: "Atendidos", count: pedidosAtendidos.length },
                { key: "todos", label: "Todos", count: pedidos.length },
              ] as { key: PedidoFilter; label: string; count: number }[]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPedidoFilter(tab.key)}
                  className={`rounded-full px-3 py-1 font-medium transition-colors active:scale-[0.98] ${pedidoFilter === tab.key ? "bg-navy text-white shadow-sm" : "text-muted-foreground hover:text-navy"}`}
                  aria-pressed={pedidoFilter === tab.key}
                >
                  {tab.label} <span className="opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : visiblePedidos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <HandHeart className="h-8 w-8 text-rose-200" />
              <p className="text-sm text-muted-foreground">
                {pedidos.length === 0 ? "Nenhum pedido registrado ainda." : pedidoFilter === "ativos" ? "Nenhum pedido em oração no momento." : "Nenhum pedido atendido ainda."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePedidos.map((r) => {
                const contactPhone = isPrayerManager ? formatContactPhone(r.visitorPhone) : null;
                const whatsappLink = isPrayerManager ? getWhatsAppLink(r.visitorPhone, r.visitorName ?? "") : null;
                const isAnswered = Boolean(r.answered);
                const isBusy = answeringId === r.id && setAnswered.isPending;
                return (
                  <div key={r.id} className={`rounded-xl border p-3 transition-colors ${isAnswered ? "border-emerald-100 bg-emerald-50/30" : "border-border/70 bg-background/60 hover:bg-muted/20"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${isAnswered ? "text-muted-foreground" : "text-foreground"}`}>{r.content}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.isPrivate && <Lock className="mt-0.5 h-3 w-3 text-muted-foreground" aria-label="Privado" />}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${isAnswered ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {isAnswered ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {isAnswered ? "Atendido" : "Em oração"}
                      </span>
                      <span className="text-muted-foreground">{formatPrayerDate(r.createdAt)}</span>
                    </div>
                    {isPrayerManager && (
                      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="flex items-center gap-2 text-sm font-medium text-navy">
                            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{r.visitorName || "Visitante sem nome"}</span>
                          </p>
                          {contactPhone ? (
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              {contactPhone}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Telefone não informado</p>
                          )}
                        </div>
                        {whatsappLink && (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Conversar com ${r.visitorName || "o visitante"} pelo WhatsApp`}
                            title="Conversar no WhatsApp"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#168b45] transition-colors hover:bg-[#25D366]/10 hover:text-[#12763a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2"
                          >
                            <MessageCircle className="h-5 w-5" />
                            <span className="sr-only">Conversar no WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
                    {isPrayerManager && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => setAnswered.mutate({ churchId, id: r.id, answered: !isAnswered })}
                          className={`h-8 gap-1.5 text-xs ${isAnswered ? "" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                        >
                          {isAnswered ? <><RotateCcw className="h-3.5 w-3.5" /> Reabrir</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Marcar como atendido</>}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Testemunhos */}
        <div className="card-sacred p-5">
          <h2 className="font-display font-bold text-navy mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Testemunhos ({testemunhos.length})
          </h2>
          {testemunhos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Sparkles className="h-8 w-8 text-amber-200" />
              <p className="text-sm text-muted-foreground">Nenhum testemunho registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testemunhos.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <p className="text-sm text-foreground">{r.content}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{r.visitorName ? `— ${r.visitorName}` : ""}</span>
                    <span className="shrink-0">{formatPrayerDate(r.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setFormError(null); }}>
        <AdaptiveFormDialogContent>
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-rose-500" />
              {isPrayerManager ? "Registrar Pedido de Oração" : "Meu Pedido de Oração"}
            </DialogTitle>
          </div>
          <form onSubmit={handleSubmit} className="contents">
            <AdaptiveFormDialogBody className="space-y-4">
            {isPrayerManager ? <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome (opcional)</Label>
                <Input value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} />
              </div>
              <div>
                <Label>Telefone (opcional)</Label>
                <Input value={form.visitorPhone} onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })} />
              </div>
            </div> : <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">Este pedido será registrado no seu cadastro e ficará visível para você e para a liderança autorizada.</p>}
            <div>
              <Label>Tipo</Label>
              <div className="flex gap-3 mt-1">
                {[{ v: "pedido", l: "Pedido de Oração" }, { v: "testemunho", l: "Testemunho" }].map(({ v, l }) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={v} checked={form.type === v} onChange={() => setForm({ ...form, type: v as any })} className="accent-navy" />
                    <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required placeholder="Descreva o pedido ou testemunho..." />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })} className="w-4 h-4 accent-navy" />
              <span className="text-sm text-foreground">Manter privado (somente liderança autorizada)</span>
            </label>
            {formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</div>}
            </AdaptiveFormDialogBody>
            <AdaptiveFormDialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-navy hover:bg-navy-light text-white" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Registrar"}
              </Button>
            </AdaptiveFormDialogFooter>
          </form>
        </AdaptiveFormDialogContent>
      </Dialog>
    </div>
  );
}
