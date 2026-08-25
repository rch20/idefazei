import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getWhatsAppLink, formatContactPhone } from "@/lib/whatsapp";
import { HandHeart, Lock, MessageCircle, Phone, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Oracao() {
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    type: "pedido" as const,
    content: "",
    isPrivate: false,
  });

  const { data: requests, isLoading, refetch } = trpc.prayer.list.useQuery({ churchId });
  const createRequest = trpc.prayer.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido registrado com sucesso!");
      setOpen(false);
      setForm({ visitorName: "", visitorPhone: "", type: "pedido", content: "", isPrivate: false });
      refetch();
    },
    onError: () => toast.error("Erro ao registrar pedido"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRequest.mutate({ churchId, ...form });
  }

  const pedidos = (requests ?? []).filter((r) => r.type === "pedido" && !r.isPrivate);
  const testemunhos = (requests ?? []).filter((r) => r.type === "testemunho");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Pedidos de Oração</h1>
          <p className="text-sm text-muted-foreground mt-1">Intercessão e testemunhos da comunidade</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos */}
        <div className="card-sacred p-5">
          <h2 className="font-display font-bold text-navy mb-4 flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-rose-500" />
            Pedidos de Oração ({pedidos.length})
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido registrado</p>
          ) : (
            <div className="space-y-3">
              {pedidos.map((r) => {
                const contactPhone = formatContactPhone(r.visitorPhone);
                const whatsappLink = getWhatsAppLink(r.visitorPhone, r.visitorName ?? "");
                return (
                  <div key={r.id} className="rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground">{r.content}</p>
                      {r.isPrivate && <Lock className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                    </div>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Testemunhos */}
        <div className="card-sacred p-5">
          <h2 className="font-display font-bold text-navy mb-4 flex items-center gap-2">
            <span className="text-lg">✨</span>
            Testemunhos ({testemunhos.length})
          </h2>
          {testemunhos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum testemunho registrado</p>
          ) : (
            <div className="space-y-3">
              {testemunhos.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <p className="text-sm text-foreground">{r.content}</p>
                  {r.visitorName && (
                    <p className="text-xs text-muted-foreground mt-1">— {r.visitorName}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-rose-500" />
              Registrar Pedido de Oração
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome (opcional)</Label>
                <Input value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} />
              </div>
              <div>
                <Label>Telefone (opcional)</Label>
                <Input value={form.visitorPhone} onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })} />
              </div>
            </div>
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
              <span className="text-sm text-foreground">Pedido privado (apenas para liderança)</span>
            </label>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Enviando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
