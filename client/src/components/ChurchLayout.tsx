import { useChurchAuth } from "@/hooks/useChurchAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Award,
  Bell,
  BookOpen,
  CreditCard,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Droplets,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  MessageSquare,
  Music,
  Shield,
  Star,
  TreePine,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTenantPwaMeta } from "@/hooks/useTenantPwaMeta";

// ─── CHURCH CONTEXT ───────────────────────────────────────────────────────────

interface ChurchContextType {
  churchId: number;
  churchName: string;
  churchSlug?: string | null;
  pwaIconAssetId?: number | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
}

const ChurchContext = createContext<ChurchContextType>({
  churchId: 1,
  churchName: "Minha Igreja",
  churchSlug: null,
  pwaIconAssetId: null,
  primaryColor: "#1e3a5f",
  secondaryColor: "#c9a84c",
});

export const useChurch = () => useContext(ChurchContext);

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard", group: "principal" },
  { icon: Heart, label: "Central de Cuidado", path: "/app/cuidado", group: "principal", roles: ["pastor_presidente", "pastor_local", "supervisor", "lider", "consolidador"] },
  { icon: Zap, label: "Radar Espiritual", path: "/app/radar", group: "principal" },
  { icon: TreePine, label: "Árvore de Discipulado", path: "/app/arvore", group: "principal" },
  { icon: Flame, label: "Ganhar Almas", path: "/app/almas", group: "discipulado" },
  { icon: Heart, label: "Consolidação", path: "/app/consolidacao", group: "discipulado", roles: ["pastor_presidente", "pastor_local", "supervisor", "lider", "consolidador", "visitador"] },
  { icon: ChevronRight, label: "Funil de Discipulado", path: "/app/funil", group: "discipulado" },
  { icon: Users, label: "Pessoas", path: "/app/pessoas", group: "membros" },
  { icon: Home, label: "Famílias", path: "/app/familias", group: "membros" },
  { icon: Globe, label: "Células", path: "/app/celulas", group: "celulas" },
  { icon: Map, label: "Mapa de Células", path: "/app/mapa", group: "celulas" },
  { icon: CalendarDays, label: "Eventos", path: "/app/eventos", group: "ministerio" },
  { icon: Music, label: "Ministérios", path: "/app/ministerios", group: "ministerio" },
  { icon: Star, label: "Escalas", path: "/app/escalas", group: "ministerio" },
  { icon: BookOpen, label: "Escola de Fundamentos", path: "/app/escola-fundamentos", group: "discipulado" },
  { icon: Droplets, label: "Batismo nas Águas", path: "/app/batismo", group: "discipulado" },
  { icon: Heart, label: "Encontro com Deus", path: "/app/encontro-com-deus", group: "discipulado" },
  { icon: GraduationCap, label: "Escola de Líderes", path: "/app/escola-lideres", group: "lideranca" },
  { icon: Crown, label: "Gestão de Liderança", path: "/app/gestao-lideranca", group: "lideranca", roles: ["pastor_presidente", "pastor_local", "supervisor"] },
  { icon: Shield, label: "Aconselhamento", path: "/app/aconselhamento", group: "lideranca", roles: ["pastor_presidente", "pastor_local", "supervisor"] },
  { icon: MessageCircle, label: "Pedidos de Oração", path: "/app/oracao", group: "comunicacao" },
  { icon: BookOpen, label: "Mural", path: "/app/mural", group: "comunicacao" },
  { icon: MessageSquare, label: "Comunicação", path: "/app/comunicacao", group: "comunicacao", roles: ["pastor_presidente", "pastor_local", "secretario"] },
  { icon: Shield, label: "Biblioteca", path: "/app/biblioteca", group: "comunicacao" },
  { icon: Building2, label: "Configurações", path: "/app/configuracoes", group: "admin", roles: ["pastor_presidente", "pastor_local", "secretario"] },
  { icon: Award, label: "Certificados", path: "/app/configuracoes/certificados", group: "admin", roles: ["pastor_presidente", "pastor_local", "secretario"] },
  { icon: WalletCards, label: "Tesouraria", path: "/app/tesouraria", group: "admin", roles: ["pastor_presidente", "pastor_local", "tesoureiro"] },
  { icon: CreditCard, label: "Faturamento", path: "/app/faturamento", group: "admin", roles: ["pastor_presidente", "pastor_local"] },
  { icon: Users, label: "Área do Membro", path: "/app/membro", group: "membros" },
  { icon: Star, label: "App do Líder", path: "/app/lider", group: "membros", roles: ["pastor_presidente", "pastor_local", "supervisor", "lider", "consolidador"] },
];

const groups = [
  { key: "principal", label: "Visão Geral" },
  { key: "discipulado", label: "Discipulado" },
  { key: "membros", label: "Membros" },
  { key: "celulas", label: "Células" },
  { key: "ministerio", label: "Ministério" },
  { key: "lideranca", label: "Liderança" },
  { key: "comunicacao", label: "Comunicação" },
  { key: "admin", label: "Administração" },
];

const roleLabels: Record<string, string> = {
  pastor_presidente: "Pastor Presidente",
  pastor_local: "Pastor Local",
  supervisor: "Supervisor",
  lider: "Líder de Célula",
  consolidador: "Consolidador",
  visitador: "Visitador",
  diacono: "Diácono",
  secretario: "Secretário",
  tesoureiro: "Tesoureiro",
  levita: "Levita",
  membro: "Discípulo",
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useChurchAuth();
  const { churchName, logoUrl } = useChurch();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const currentRole = user?.role ?? "membro";
  const effectiveRolesQuery = trpc.churchAuth.effectiveRoles.useQuery(
    { churchId: user?.churchId ?? 0 },
    { enabled: Boolean(user?.churchId) }
  );
  const effectiveRoles = Array.from(new Set([currentRole, ...(effectiveRolesQuery.data ?? [])]));
  const canReviewRegistrations = effectiveRoles.some((role) => ["pastor_presidente", "pastor_local", "secretario"].includes(role));
  const pendingRegistrationsQuery = trpc.churchAuth.pendingRegistrations.useQuery(
    { churchId: user?.churchId ?? 0 },
    { enabled: Boolean(user?.churchId && canReviewRegistrations) }
  );
  const pendingRegistrationCount = pendingRegistrationsQuery.data?.length ?? 0;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 flex flex-col
          sidebar-sacred transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={churchName} className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center">
                <span className="text-gold font-bold text-lg">✝</span>
              </div>
            )}
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Igreja</p>
              <p className="text-sm font-semibold text-white leading-tight truncate max-w-[130px]">
                {churchName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => {
            const items = navItems.filter((i) => i.group === group.key && (!i.roles || i.roles.some((role) => effectiveRoles.includes(role))));
            if (!items.length) return null;
            return (
              <div key={group.key}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-1">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = location === item.path || location.startsWith(item.path + "/");
                    return (
                      <button
                        key={item.path}
                        className={`sidebar-item w-full ${isActive ? "active" : ""}`}
                        onClick={() => { navigate(item.path); onClose(); }}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                        {item.path === "/app/configuracoes" && pendingRegistrationCount > 0 && (
                          <span className="ml-auto min-w-5 rounded-full bg-gold px-1.5 py-0.5 text-center text-[10px] font-bold text-navy" aria-label={`${pendingRegistrationCount} cadastro${pendingRegistrationCount === 1 ? "" : "s"} aguardando aprovação`}>
                            {pendingRegistrationCount > 9 ? "9+" : pendingRegistrationCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-gold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name ?? "Usuário"}</p>
              <p className="text-xs text-white/40 truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={() => {
                onClose();
                setLogoutOpen(true);
              }}
              className="text-white/30 hover:text-white/70 transition-colors"
              title="Sair"
              aria-label="Sair da plataforma"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Suas atuações</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {effectiveRoles.map((role) => (
                <span key={role} className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                  {roleLabels[role] ?? role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] border-gold/30 bg-card sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-navy">Sair da plataforma?</AlertDialogTitle>
            <AlertDialogDescription>
              Você voltará para a página pública de {churchName}. Seus dados de sessão serão encerrados neste dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLogoutOpen(false)}>Continuar aqui</AlertDialogCancel>
            <AlertDialogAction className="bg-navy text-white hover:bg-navy/90" onClick={logout}>
              Sair agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────

function TopBar({
  onMenuClick,
  title,
}: {
  onMenuClick: () => void;
  title?: string;
}) {
  const { user } = useChurchAuth();
  const { churchId } = useChurch();
  const utils = trpc.useUtils();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationCountQuery = trpc.notifications.unreadCount.useQuery({ churchId }, { enabled: Boolean(user?.churchId) });
  const notificationsQuery = trpc.notifications.mine.useQuery({ churchId }, { enabled: Boolean(user?.churchId && notificationsOpen) });
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.notifications.unreadCount.invalidate(), utils.notifications.mine.invalidate()]);
    },
  });

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5 text-navy" />
        </button>
        {title && (
          <h1 className="text-base font-semibold text-navy font-display">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block">
          Plataforma de Discipulado
        </span>
        <div className="w-1 h-1 rounded-full bg-gold hidden sm:block" />
        <span className="text-xs text-gold font-medium hidden sm:block">
          Ganhar → Multiplicar
        </span>
        <div className="relative">
          <button type="button" aria-label="Abrir notificações" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-lg p-2 text-navy transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            <Bell className="h-5 w-5" />
            {(notificationCountQuery.data?.count ?? 0) > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{(notificationCountQuery.data?.count ?? 0) > 9 ? "9+" : notificationCountQuery.data?.count}</span>}
          </button>
          {notificationsOpen && <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="font-semibold text-navy">Notificações</p><p className="text-xs text-muted-foreground">Avisos da sua igreja</p></div><button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar notificações" onClick={() => setNotificationsOpen(false)}><X className="h-4 w-4" /></button></div>
            <div className="max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto">
              {notificationsQuery.isLoading ? <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div> : (notificationsQuery.data ?? []).length === 0 ? <div className="p-7 text-center text-sm text-muted-foreground">Você não tem notificações por enquanto.</div> : (notificationsQuery.data ?? []).map(({ delivery, event }) => <button key={delivery.id} type="button" className={`block w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/70 ${delivery.readAt ? "opacity-70" : "bg-gold/5"}`} onClick={() => { if (!delivery.readAt) markReadMutation.mutate({ churchId, id: delivery.id }); }}><div className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${delivery.readAt ? "bg-transparent" : "bg-gold"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">{event.title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{event.body}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div>{!delivery.readAt && <Check className="mt-1 h-4 w-4 shrink-0 text-gold" />}</div></button>) }
            </div>
          </div>}
        </div>
      </div>
    </header>
  );
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────

interface ChurchLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function ChurchLayout({ children, title }: ChurchLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, loading } = useChurchAuth();
  const churchId = user?.churchId ?? null;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.replace("/login");
    }
  }, [isAuthenticated, loading]);

  const { data: church } = trpc.churches.getById.useQuery(
    { id: churchId ?? 0 },
    { enabled: isAuthenticated && churchId !== null }
  );
  useTenantPwaMeta({ tenantSlug: church?.slug, tenantName: church?.name, primaryColor: church?.primaryColor, pwaIconAssetId: church?.pwaIconAssetId });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Carregando plataforma...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || churchId === null) {
    return null;
  }

  const churchContext: ChurchContextType = {
    churchId,
    churchName: church?.name ?? "Minha Igreja",
    churchSlug: church?.slug,
    pwaIconAssetId: church?.pwaIconAssetId,
    primaryColor: church?.primaryColor ?? "#1e3a5f",
    secondaryColor: church?.secondaryColor ?? "#c9a84c",
    logoUrl: church?.logoUrl,
  };

  return (
    <ChurchContext.Provider value={churchContext}>
      <div className="min-h-screen min-w-0 overflow-x-hidden bg-background flex golden-pattern">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ChurchContext.Provider>
  );
}
