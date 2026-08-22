import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, EyeOff, Building2, Users, TrendingUp, Shield, CheckCircle2, XCircle, Clock, LogOut, LayoutDashboard, Settings, CreditCard, MessageSquare, Bug } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});
type LoginData = z.infer<typeof loginSchema>;

const bootstrapSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().email("Email inválido"),
  password: z.string().min(12, "Use pelo menos 12 caracteres"),
  confirmPassword: z.string().min(1, "Confirme a senha"),
  setupToken: z.string().min(16, "Informe o código de configuração"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});
type BootstrapData = z.infer<typeof bootstrapSchema>;

function readAdminToken() {
  try {
    return localStorage.getItem("admin_token") ?? sessionStorage.getItem("admin_token");
  } catch {
    try {
      return sessionStorage.getItem("admin_token");
    } catch {
      return null;
    }
  }
}

function persistAdminToken(token: string) {
  try {
    localStorage.setItem("admin_token", token);
  } catch {
    try {
      sessionStorage.setItem("admin_token", token);
    } catch {
      // Sem armazenamento disponível, a sessão continua ativa enquanto o painel estiver aberto.
    }
  }
}

function clearAdminToken() {
  try {
    localStorage.removeItem("admin_token");
  } catch {
    // Safari pode restringir localStorage em alguns contextos.
  }
  try {
    sessionStorage.removeItem("admin_token");
  } catch {
    // Sem sessão persistente disponível, o estado local será removido.
  }
}

function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: (data: { token: string }) => {
      try {
        localStorage.removeItem("church_token");
        localStorage.removeItem("church_user");
      } catch {
        // O token administrativo continua protegido nas chamadas ao servidor.
      }
      persistAdminToken(data.token);
      onLogin(data.token);
      toast.success("Acesso autorizado!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Credenciais inválidas.");
    },
  });

  return (
    <div className="min-h-screen bg-[#0f1923] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="500" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
        </svg>
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#c9a84c] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-[#0f1923]" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white mb-1">Super Admin</h1>
          <p className="text-white/40 text-sm">Acesso exclusivo ao painel de administração</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@idefazei.com.br"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#c9a84c]"
                  {...register("email")}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="text-white/70 text-sm">Senha</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#c9a84c] pr-10"
                    {...register("password")}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full bg-[#c9a84c] hover:bg-[#b8943e] text-[#0f1923] font-bold py-5" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : "Acessar Painel"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-white/20 mt-4">
          Acesso restrito. Tentativas são registradas.
        </p>
      </div>
    </div>
  );
}

function InitialAdminSetup({ onLogin }: { onLogin: (token: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<BootstrapData>({
    resolver: zodResolver(bootstrapSchema),
  });

  const bootstrapMutation = trpc.adminAuth.bootstrap.useMutation({
    onSuccess: (data: { token: string }) => {
      persistAdminToken(data.token);
      onLogin(data.token);
      toast.success("Super Admin configurado com sucesso.");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Não foi possível concluir a configuração.");
    },
  });

  return (
    <div className="min-h-screen bg-[#0f1923] flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="50%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" /><circle cx="50%" cy="50%" r="500" fill="none" stroke="#c9a84c" strokeWidth="0.8" /></svg>
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#c9a84c] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Shield className="w-8 h-8 text-[#0f1923]" /></div>
          <h1 className="font-serif text-3xl font-bold text-white mb-1">Configurar Super Admin</h1>
          <p className="text-white/50 text-sm">Crie a conta principal de administração da Ide Fazei.</p>
        </div>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm"><CardContent className="pt-6">
          <form onSubmit={handleSubmit((data) => bootstrapMutation.mutate(data))} className="space-y-4">
            <div><Label htmlFor="setup-name" className="text-white/70 text-sm">Seu nome</Label><Input id="setup-name" className="mt-1 bg-white/10 border-white/20 text-white" {...register("name")} />{errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}</div>
            <div><Label htmlFor="setup-email" className="text-white/70 text-sm">Email administrativo</Label><Input id="setup-email" type="email" autoComplete="email" className="mt-1 bg-white/10 border-white/20 text-white" {...register("email")} />{errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}</div>
            <div><Label htmlFor="setup-password" className="text-white/70 text-sm">Senha principal</Label><div className="relative mt-1"><Input id="setup-password" type={showPassword ? "text" : "password"} autoComplete="new-password" className="bg-white/10 border-white/20 text-white pr-10" {...register("password")} /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}</div>
            <div><Label htmlFor="setup-confirm-password" className="text-white/70 text-sm">Confirmar senha</Label><Input id="setup-confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" className="mt-1 bg-white/10 border-white/20 text-white" {...register("confirmPassword")} />{errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}</div>
            <div><Label htmlFor="setup-token" className="text-white/70 text-sm">Código de configuração</Label><Input id="setup-token" type="password" autoComplete="one-time-code" className="mt-1 bg-white/10 border-white/20 text-white" {...register("setupToken")} />{errors.setupToken && <p className="text-red-400 text-xs mt-1">{errors.setupToken.message}</p>}</div>
            <Button type="submit" className="w-full bg-[#c9a84c] hover:bg-[#b8943e] text-[#0f1923] font-bold py-5" disabled={bootstrapMutation.isPending}>{bootstrapMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Configurando...</> : "Criar Super Admin"}</Button>
          </form>
        </CardContent></Card>
        <p className="text-center text-xs text-white/30 mt-4">Este cadastro só fica disponível enquanto não houver Super Admin configurado.</p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

type Church = {
  id: number;
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt: Date;
};

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "churches" | "plans" | "support" | "diagnostics" | "settings">("overview");

  const { data: churches, isLoading, refetch } = trpc.superAdmin.churches.useQuery();
  const { data: pendingRegs, refetch: refetchPending } = trpc.superAdmin.pendingRegistrations.useQuery();
  const { data: startupDiagnostics, isLoading: diagnosticsLoading } = trpc.diagnostics.recent.useQuery({ limit: 80 }, { enabled: activeTab === "diagnostics" });

  const reviewMutation = trpc.superAdmin.reviewRegistration.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Igreja aprovada!" : "Igreja suspensa.");
      refetch();
      refetchPending();
    },
    onError: (err: { message?: string }) => toast.error(err.message || "Erro ao processar."),
  });

  const total = churches?.length ?? 0;
  const activeCount = churches?.filter((c: Church) => c.active).length ?? 0;
  const pendingCount = pendingRegs?.length ?? 0;
  const suspendedCount = total - activeCount;

  const statusBadge = (isActive: boolean) => {
    if (isActive) return <Badge className="bg-green-100 text-green-700 border-green-200">Ativa</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-200">Inativa</Badge>;
  };

  return (
    <div className="min-h-screen bg-[#0f1923] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0a1018] border-r border-white/10 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#0f1923]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Super Admin</p>
              <p className="text-white/30 text-[10px]">Ide Fazei Platform</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
            { id: "churches", label: "Igrejas", icon: Building2 },
            { id: "plans", label: "Planos", icon: CreditCard },
            { id: "support", label: "Suporte", icon: MessageSquare },
            { id: "diagnostics", label: "Diagnósticos", icon: Bug },
            { id: "settings", label: "Configurações", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === item.id
                    ? "bg-[#c9a84c]/20 text-[#c9a84c]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Overview */}
          {activeTab === "overview" && (
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Visão Geral da Plataforma</h1>
              <p className="text-white/40 text-sm mb-8">Métricas globais de todas as igrejas</p>

              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total de Igrejas", value: total, icon: Building2, color: "text-blue-400" },
                  { label: "Igrejas Ativas", value: activeCount, icon: CheckCircle2, color: "text-green-400" },
                  { label: "Aguardando Aprovação", value: pendingCount, icon: Clock, color: "text-amber-400" },
                  { label: "Inativas", value: suspendedCount, icon: XCircle, color: "text-red-400" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.label} className="bg-white/5 border-white/10">
                      <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-3">
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                          <TrendingUp className="w-4 h-4 text-white/20" />
                        </div>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                        <p className="text-white/40 text-sm mt-1">{stat.label}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Igrejas pendentes */}
              {pendingCount > 0 && (
                <Card className="bg-amber-500/10 border-amber-500/20">
                  <CardHeader>
                    <CardTitle className="text-amber-400 text-base flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {pendingCount} {pendingCount === 1 ? "Igreja aguardando" : "Igrejas aguardando"} aprovação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pendingRegs?.map((church: { id: number; churchName: string; churchSlug: string; status: string }) => (
                        <div key={church.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white font-medium text-sm">{church.churchName}</p>
                            <p className="text-white/40 text-xs">{church.churchSlug}.idefazei.com.br</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                              onClick={() => reviewMutation.mutate({ id: church.id, status: "approved" })}
                              disabled={reviewMutation.isPending}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-7"
                              onClick={() => reviewMutation.mutate({ id: church.id, status: "rejected" })}
                              disabled={reviewMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Churches */}
          {activeTab === "churches" && (
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Gestão de Igrejas</h1>
              <p className="text-white/40 text-sm mb-8">Todas as igrejas cadastradas na plataforma</p>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#c9a84c]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {churches?.map((church: Church) => (
                    <Card key={church.id} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-[#c9a84c]" />
                            </div>
                            <div>
                              <p className="text-white font-semibold">{church.name}</p>
                              <p className="text-white/40 text-sm">{church.slug}.idefazei.com.br</p>
                              {(church.city || church.state) && (
                                <p className="text-white/30 text-xs">{[church.city, church.state].filter(Boolean).join(", ")}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {statusBadge(church.active)}
                            {!church.active && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                                onClick={() => reviewMutation.mutate({ id: church.id, status: "approved" })}
                                disabled={reviewMutation.isPending}
                              >
                                Ativar
                              </Button>
                            )}
                            {church.active && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-7"
                                onClick={() => reviewMutation.mutate({ id: church.id, status: "suspended" })}
                                disabled={reviewMutation.isPending}
                              >
                                Suspender
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!churches || churches.length === 0) && (
                    <div className="text-center py-20 text-white/30">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma igreja cadastrada ainda.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Plans */}
          {activeTab === "plans" && (
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Planos e Assinaturas</h1>
              <p className="text-white/40 text-sm mb-8">Gerencie os planos disponíveis na plataforma</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { name: "Básico", price: "R$ 97/mês", members: "200", cells: "10", color: "border-blue-500/30" },
                  { name: "Pro", price: "R$ 197/mês", members: "1.000", cells: "50", color: "border-[#c9a84c]/50" },
                  { name: "Enterprise", price: "R$ 497/mês", members: "Ilimitado", cells: "Ilimitado", color: "border-purple-500/30" },
                ].map((plan) => (
                  <Card key={plan.name} className={`bg-white/5 border-2 ${plan.color}`}>
                    <CardContent className="pt-6">
                      <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                      <p className="text-[#c9a84c] font-semibold mb-4">{plan.price}</p>
                      <div className="space-y-2 text-sm text-white/60">
                        <div className="flex justify-between"><span>Membros</span><span className="text-white">{plan.members}</span></div>
                        <div className="flex justify-between"><span>Células</span><span className="text-white">{plan.cells}</span></div>
                      </div>
                      <Button size="sm" className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border-0">Editar plano</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-white font-semibold mb-4">Assinaturas Ativas</h3>
                  <div className="text-center py-8 text-white/30">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma assinatura ativa ainda.</p>
                    <p className="text-xs mt-1">As assinaturas aparecerão aqui quando as igrejas fizerem upgrade.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Support */}
          {activeTab === "support" && (
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Painel de Suporte</h1>
              <p className="text-white/40 text-sm mb-8">Mensagens de contato e solicitações de suporte</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Tickets Abertos", value: "0", color: "text-yellow-400" },
                  { label: "Resolvidos Hoje", value: "0", color: "text-green-400" },
                  { label: "Tempo Médio", value: "—", color: "text-blue-400" },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-white/5 border-white/10">
                    <CardContent className="pt-6 text-center">
                      <p className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                      <p className="text-white/40 text-xs">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-white/30">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma mensagem de suporte ainda.</p>
                    <p className="text-xs mt-1">Mensagens enviadas pelo formulário de contato aparecerão aqui.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Diagnósticos de Inicialização</h1>
              <p className="text-white/40 text-sm mb-8">Falhas técnicas anônimas dos últimos 30 dias. Nenhum token, e-mail ou texto de formulário é armazenado.</p>
              {diagnosticsLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#c9a84c]" /></div>
              ) : (startupDiagnostics?.length ?? 0) === 0 ? (
                <Card className="bg-white/5 border-white/10"><CardContent className="py-16 text-center text-white/35"><Bug className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>Nenhum diagnóstico recente.</p></CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {startupDiagnostics?.map((diagnostic) => (
                    <Card key={diagnostic.id} className="bg-white/5 border-white/10">
                      <CardContent className="py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">{diagnostic.kind}</Badge>
                              <span className="text-xs text-white/35">{diagnostic.churchId ? `Igreja #${diagnostic.churchId}` : "Domínio principal"}</span>
                            </div>
                            <p className="break-words text-sm text-white/85">{diagnostic.message}</p>
                            <p className="mt-1 break-all text-xs text-white/35">{diagnostic.path} · {diagnostic.platform || "plataforma não informada"}</p>
                          </div>
                          <div className="shrink-0 text-xs text-white/35">{new Date(diagnostic.createdAt).toLocaleString("pt-BR")}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (
            <div>
              <h1 className="font-serif text-2xl font-bold text-white mb-1">Configurações da Plataforma</h1>
              <p className="text-white/40 text-sm mb-8">Configurações globais do SaaS</p>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {[
                      { label: "Nome da Plataforma", value: "Ide Fazei" },
                      { label: "Domínio Principal", value: "idefazei.com.br" },
                      { label: "Versão", value: "1.0.0" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                        <span className="text-white/60 text-sm">{item.label}</span>
                        <span className="text-white font-medium text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(readAdminToken);
  const bootstrapStatus = trpc.adminAuth.bootstrapStatus.useQuery(undefined, { retry: false, staleTime: 0 });

  const handleLogout = () => {
    clearAdminToken();
    setToken(null);
    navigate("/admin/login");
  };

  if (!token) {
    if (bootstrapStatus.isLoading) {
      return <div className="min-h-screen bg-[#0f1923] flex items-center justify-center text-white/60"><Loader2 className="h-6 w-6 animate-spin mr-3" /> Carregando...</div>;
    }
    if (bootstrapStatus.data?.available) {
      return <InitialAdminSetup onLogin={setToken} />;
    }
    return <AdminLogin onLogin={setToken} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}
