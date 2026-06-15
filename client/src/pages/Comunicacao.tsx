import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageSquare, Send, Bell, CheckCircle, XCircle, Clock, Plus, Zap } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  push: "Push",
  email: "E-mail",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

const TYPE_COLORS: Record<string, string> = {
  push: "bg-blue-100 text-blue-800",
  email: "bg-purple-100 text-purple-800",
  whatsapp: "bg-green-100 text-green-800",
  sms: "bg-orange-100 text-orange-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  boas_vindas: "Boas-vindas",
  aniversario: "Aniversário",
  lembrete_evento: "Lembrete de Evento",
  lembrete_celula: "Lembrete de Célula",
  convite: "Convite",
  aviso: "Aviso",
  outro: "Outro",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  enviado: <Clock className="h-3 w-3 text-yellow-500" />,
  entregue: <CheckCircle className="h-3 w-3 text-green-500" />,
  falhou: <XCircle className="h-3 w-3 text-red-500" />,
};

const AUTOMATIONS = [
  {
    id: "boas_vindas",
    title: "Boas-vindas à Nova Alma",
    description: "Enviada automaticamente quando uma nova alma é cadastrada no sistema.",
    icon: "🎉",
    category: "boas_vindas",
    active: true,
    trigger: "Ao cadastrar nova alma",
  },
  {
    id: "aniversario",
    title: "Parabéns de Aniversário",
    description: "Enviada todo dia às 09:00 para membros aniversariantes do dia (via heartbeat).",
    icon: "🎂",
    category: "aniversario",
    active: true,
    trigger: "Diariamente às 09:00",
  },
  {
    id: "lembrete_celula",
    title: "Lembrete de Célula",
    description: "Lembrete enviado 24h antes da reunião de célula.",
    icon: "🏠",
    category: "lembrete_celula",
    active: false,
    trigger: "24h antes da reunião",
  },
  {
    id: "lembrete_evento",
    title: "Lembrete de Evento",
    description: "Lembrete enviado 24h antes de eventos cadastrados.",
    icon: "📅",
    category: "lembrete_evento",
    active: false,
    trigger: "24h antes do evento",
  },
];

export default function Comunicacao() {
  const { churchId } = useChurch();
  const [sendOpen, setSendOpen] = useState(false);
  const [form, setForm] = useState({
    type: "push" as "push" | "email" | "whatsapp" | "sms",
    category: "aviso" as "boas_vindas" | "aniversario" | "lembrete_evento" | "lembrete_celula" | "convite" | "aviso" | "outro",
    recipientPersonId: "",
    recipientName: "",
    title: "",
    message: "",
  });
  const utils = trpc.useUtils();

  const { data: logs, isLoading } = trpc.comunicacao.list.useQuery(
    { churchId: churchId!, limit: 100 },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const sendMutation = trpc.comunicacao.send.useMutation({
    onSuccess: () => {
      toast.success("Mensagem registrada e enviada!");
      setSendOpen(false);
      setForm({ type: "push", category: "aviso", recipientPersonId: "", recipientName: "", title: "", message: "" });
      utils.comunicacao.list.invalidate();
    },
    onError: () => toast.error("Erro ao enviar mensagem"),
  });

  if (!churchId) return null;

  const totalEnviados = logs?.length ?? 0;
  const entregues = logs?.filter((l) => l.status === "entregue").length ?? 0;
  const falhas = logs?.filter((l) => l.status === "falhou").length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-[#c9a84c]" />
            Comunicação
          </h1>
          <p className="text-muted-foreground mt-1">Central de mensagens, automações e histórico de envios</p>
        </div>
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Send className="h-4 w-4 mr-2" /> Enviar Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Mensagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Canal *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push Notification</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as typeof form.category })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Destinatário</Label>
                <Select value={form.recipientPersonId || "todos"} onValueChange={(v) => {
                  if (v === "todos") {
                    setForm({ ...form, recipientPersonId: "", recipientName: "" });
                    return;
                  }
                  const person = (people ?? []).find((p) => String(p.id) === v);
                  setForm({ ...form, recipientPersonId: v, recipientName: person?.fullName ?? "" });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione (ou deixe em branco para todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os membros</SelectItem>
                    {(people ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da mensagem" />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Conteúdo da mensagem..." />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={sendMutation.isPending}
                onClick={() => sendMutation.mutate({
                  churchId: churchId!,
                  type: form.type,
                  category: form.category,
                  recipientPersonId: form.recipientPersonId ? Number(form.recipientPersonId) : undefined,
                  recipientName: form.recipientName || undefined,
                  title: form.title || undefined,
                  message: form.message || undefined,
                })}
              >
                {sendMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#c9a84c]/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#1e3a5f]">{totalEnviados}</div>
            <div className="text-sm text-muted-foreground">Total Enviados</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{entregues}</div>
            <div className="text-sm text-muted-foreground">Entregues</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{falhas}</div>
            <div className="text-sm text-muted-foreground">Falhas</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="historico">
        <TabsList>
          <TabsTrigger value="historico">Histórico de Envios</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-16 bg-muted/30" />)}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <Card key={log.id} className="border border-muted">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {STATUS_ICONS[log.status ?? "enviado"]}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[log.type]}`}>
                              {TYPE_LABELS[log.type]}
                            </span>
                            <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[log.category]}</span>
                            {log.recipientName && (
                              <span className="text-xs font-medium truncate">→ {log.recipientName}</span>
                            )}
                          </div>
                          {log.title && <p className="text-sm font-medium mt-0.5 truncate">{log.title}</p>}
                          {log.message && <p className="text-xs text-muted-foreground truncate">{log.message}</p>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-muted">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhuma mensagem enviada</h3>
                <p className="text-muted-foreground text-sm">O histórico de comunicações aparecerá aqui.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="automacoes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUTOMATIONS.map((auto) => (
              <Card key={auto.id} className={`border ${auto.active ? "border-green-200" : "border-muted"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{auto.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1e3a5f]">{auto.title}</h3>
                        <Badge variant={auto.active ? "default" : "secondary"} className="text-xs">
                          {auto.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{auto.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        <span>{auto.trigger}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            As automações ativas são executadas pelo sistema de heartbeat diário. Para ativar as demais, entre em contato com o suporte.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
