import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Heart, Home, BookOpen, UserPlus, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useChurchSlug } from "@/hooks/useTenant";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";
import { TenantPublicFooter } from "@/components/TenantPublicFooter";

const visitorSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  type: z.enum(["pedido_oracao", "visita_pastoral", "primeira_visita", "interesse_participar"]),
  message: z.string().optional(),
});

type VisitorData = z.infer<typeof visitorSchema>;

const REQUEST_TYPES = [
  { value: "pedido_oracao", label: "Pedido de Oração", icon: Heart, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200", description: "Compartilhe um pedido de oração com nossa equipe" },
  { value: "visita_pastoral", label: "Visita Pastoral", icon: Home, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", description: "Solicite uma visita de um pastor ou líder" },
  { value: "primeira_visita", label: "Primeira Visita", icon: BookOpen, color: "text-green-500", bg: "bg-green-50", border: "border-green-200", description: "Registre sua primeira visita à nossa igreja" },
  { value: "interesse_participar", label: "Quero Participar", icon: UserPlus, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", description: "Demonstre interesse em se tornar membro" },
];

export default function PortalVisitante() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("pedido_oracao");
  const churchSlug = useChurchSlug();
  const tenantPublic = trpc.tenantPublic.current.useQuery();
  useTenantPwaMeta({ tenantSlug: tenantPublic.data?.church.slug, tenantName: tenantPublic.data?.church.name, primaryColor: tenantPublic.data?.theme?.primaryColor ?? tenantPublic.data?.church.primaryColor, pwaIconAssetId: tenantPublic.data?.church.pwaIconAssetId, pwaIconVersion: tenantPublic.data?.church.pwaIconVersion });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<VisitorData>({
    resolver: zodResolver(visitorSchema),
    defaultValues: { type: "pedido_oracao" },
  });

  const createLeadMutation = trpc.visitor.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao enviar. Tente novamente.");
    },
  });

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get("tipo");
    if (requestedType && REQUEST_TYPES.some((item) => item.value === requestedType)) {
      setSelectedType(requestedType);
      setValue("type", requestedType as VisitorData["type"]);
    }
  }, [setValue]);

  const onSubmit = (data: VisitorData) => {
    if (!churchSlug) {
      toast.error("Abra o portal pelo subdomínio da igreja para enviar sua solicitação.");
      return;
    }
    createLeadMutation.mutate({ ...data, churchSlug, email: data.email || undefined });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] mb-3">Recebemos sua mensagem!</h2>
          <p className="text-[#1e3a5f]/60 mb-8">Nossa equipe entrará em contato em breve. Que Deus abençoe você!</p>
          <Button
            onClick={() => setSubmitted(false)}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
          >
            Enviar outra mensagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Sacred geometry background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="500" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
          <circle cx="30%" cy="40%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
          <circle cx="70%" cy="60%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 py-5 px-6 border-b border-[#c9a84c]/20 bg-white/60 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
              <span className="text-[#c9a84c] font-bold">✦</span>
            </div>
            <div>
              <p className="font-bold text-[#1e3a5f] text-base leading-tight">{tenantPublic.data?.church.name ?? "Igreja"}</p>
              <p className="text-[#c9a84c] text-[10px] uppercase tracking-widest">Portal do Visitante</p>
            </div>
          </div>
          <a href="/login" className="text-sm text-[#1e3a5f]/60 hover:text-[#1e3a5f] transition-colors">
            Já sou membro →
          </a>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-[#1e3a5f] mb-3">Bem-vindo(a)!</h1>
          <p className="text-[#1e3a5f]/60 text-lg">Como podemos ajudar você hoje?</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tipo de solicitação */}
          <div className="grid grid-cols-2 gap-3">
            {REQUEST_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setSelectedType(type.value);
                    setValue("type", type.value as VisitorData["type"]);
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `${type.bg} ${type.border} shadow-md`
                      : "bg-white/70 border-[#c9a84c]/20 hover:border-[#c9a84c]/40"
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? type.color : "text-[#1e3a5f]/40"}`} />
                  <p className={`font-semibold text-sm ${isSelected ? "text-[#1e3a5f]" : "text-[#1e3a5f]/60"}`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-[#1e3a5f]/40 mt-0.5 leading-tight">{type.description}</p>
                </button>
              );
            })}
          </div>

          {/* Dados pessoais */}
          <Card className="bg-white/80 backdrop-blur-sm border-[#c9a84c]/20 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-lg text-[#1e3a5f]">Seus dados</CardTitle>
              <CardDescription>Preencha para que possamos entrar em contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#1e3a5f] font-medium text-sm">Nome completo *</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  className="mt-1 border-[#c9a84c]/30 focus:border-[#1e3a5f] bg-white"
                  {...register("name")}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-[#1e3a5f] font-medium text-sm">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    className="mt-1 border-[#c9a84c]/30 focus:border-[#1e3a5f] bg-white"
                    {...register("phone")}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-[#1e3a5f] font-medium text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="mt-1 border-[#c9a84c]/30 focus:border-[#1e3a5f] bg-white"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="message" className="text-[#1e3a5f] font-medium text-sm">Mensagem (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Compartilhe mais detalhes se desejar..."
                  rows={3}
                  className="mt-1 border-[#c9a84c]/30 focus:border-[#1e3a5f] bg-white resize-none"
                  {...register("message")}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold py-5 text-base"
            disabled={createLeadMutation.isPending}
          >
            {createLeadMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              "Enviar Solicitação"
            )}
          </Button>

          <p className="text-center text-xs text-[#1e3a5f]/40">
            Seus dados são tratados com respeito e privacidade.
          </p>
        </form>
      </div>
      {tenantPublic.data && <TenantPublicFooter church={tenantPublic.data.church} />}
    </div>
  );
}
