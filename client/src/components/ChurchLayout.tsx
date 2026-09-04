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
  ExternalLink,
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
import { normalizePastoralSupportConfig, shouldShowPastoralSupport, type PastoralSupportConfig } from "../../../shared/pastoralSupport";

// ─── CHURCH CONTEXT ───────────────────────────────────────────────────────────

export type ChurchAccessSummary = {
  actorPersonId: number | null;
  actorRole: string;
  roles: string[];
  isPastor: boolean;
  isExecutive: boolean;
  isCommunicationManager: boolean;
  isPrayerManager: boolean;
  isConsolidator: boolean;
  isVisitador: boolean;
  isPastoralWorker: boolean;
  canAccessVisits: boolean;
  canManageCells: boolean;
  canManageMinistry: boolean;
  canManageLibrary: boolean;
  canAccessTreasury: boolean;
  canIndicateNewSoul: boolean;
  canManageEvents: boolean;
  canManageEncounter: boolean;
};

interface ChurchContextType {
  churchId: number;
  churchName: string;
  churchSlug?: string | null;
  pwaIconAssetId?: number | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  pastoralSupport: PastoralSupportConfig;
  accessSummary: ChurchAccessSummary | null;
}

const ChurchContext = createContext<ChurchContextType>({
  churchId: 1,
  churchName: "Minha Igreja",
  churchSlug: null,
  pwaIconAssetId: null,
  primaryColor: "#1e3a5f",
  secondaryColor: "#c9a84c",
  pastoralSupport: normalizePastoralSupportConfig(null),
  accessSummary: null,
});

export const useChurch = () => useContext(ChurchContext);

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

type NavItem = { icon: typeof Home; label: string; path: string; group: string; roles?: string[]; accessKey?: keyof ChurchAccessSummary; requiresEncounterAccess?: boolean };

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/app/dashboard", group: "principal", accessKey: "isExecutive" },
  { icon: Heart, label: "Cuidado", path: "/app/cuidado", group: "principal", accessKey: "isPastoralWorker" },
  { icon: Zap, label: "Radar Espiritual", path: "/app/radar", group: "principal", accessKey: "isExecutive" },
  { icon: TreePine, label: "Árvore de Discipulado", path: "/app/arvore", group: "principal", accessKey: "isExecutive" },
  { icon: Flame, label: "Novas Almas", path: "/app/almas", group: "discipulado" },
  { icon: Heart, label: "Consolidação", path: "/app/consolidacao", group: "discipulado", accessKey: "canAccessVisits" },
  { icon: ChevronRight, label: "Acompanhamento", path: "/app/funil", group: "discipulado", accessKey: "isExecutive" },
  { icon: Users, label: "Pessoas", path: "/app/pessoas", group: "membros", accessKey: "isExecutive" },
  { icon: Home, label: "Famílias", path: "/app/familias", group: "membros", accessKey: "isExecutive" },
  { icon: Globe, label: "Células", path: "/app/celulas", group: "celulas" },
  { icon: Map, label: "Mapa de Células", path: "/app/mapa", group: "celulas" },
  { icon: BookOpen, label: "Estudos de Células", path: "/app/estudos-celulas", group: "celulas" },
  { icon: CalendarDays, label: "Eventos", path: "/app/eventos", group: "ministerio", accessKey: "isExecutive" },
  { icon: Music, label: "Ministérios", path: "/app/ministerios", group: "ministerio", accessKey: "canManageMinistry" },
  { icon: Star, label: "Escalas", path: "/app/escalas", group: "ministerio", roles: ["pastor_presidente", "pastor_local", "supervisor", "lider"], accessKey: "canManageCells" },
  { icon: BookOpen, label: "Escola de Fundamentos", path: "/app/escola-fundamentos", group: "discipulado", accessKey: "isExecutive" },
  { icon: Droplets, label: "Batismo nas Águas", path: "/app/batismo", group: "discipulado", accessKey: "isExecutive" },
  { icon: Heart, label: "Encontro com Deus", path: "/app/encontro-com-deus", group: "discipulado", accessKey: "canManageEncounter", requiresEncounterAccess: true },
  { icon: GraduationCap, label: "Escola de Líderes", path: "/app/escola-lideres", group: "lideranca", accessKey: "isExecutive" },
  { icon: Crown, label: "Liderança", path: "/app/gestao-lideranca", group: "lideranca", roles: ["pastor_presidente", "pastor_local", "supervisor"] },
  { icon: Shield, label: "Aconselhamento", path: "/app/aconselhamento", group: "lideranca", roles: ["pastor_presidente", "pastor_local", "supervisor"] },
  { icon: MessageCircle, label: "Pedidos de Oração", path: "/app/oracao", group: "comunicacao" },
  { icon: BookOpen, label: "Mural", path: "/app/mural", group: "comunicacao", accessKey: "isCommunicationManager" },
  { icon: MessageSquare, label: "Comunicação", path: "/app/comunicacao", group: "comunicacao", roles: ["pastor_presidente", "pastor_local", "secretario"], accessKey: "isCommunicationManager" },
  { icon: Shield, label: "Biblioteca", path: "/app/biblioteca", group: "comunicacao" },
  { icon: Building2, label: "Igreja", path: "/app/configuracoes", group: "admin", roles: ["pastor_presidente", "pastor_local"] },
  { icon: Award, label: "Certificados", path: "/app/configuracoes/certificados", group: "admin", roles: ["pastor_presidente", "pastor_local"] },
  { icon: WalletCards, label: "Tesouraria", path: "/app/tesouraria", group: "admin", accessKey: "canAccessTreasury" },
  { icon: CreditCard, label: "Faturamento", path: "/app/faturamento", group: "admin", accessKey: "isPastor" },
  { icon: Users, label: "Área do Membro", path: "/app/membro", group: "membros" },
  { icon: Star, label: "App do Líder", path: "/app/lider", group: "membros", roles: ["pastor_presidente", "pastor_local", "supervisor", "lider"] },
];

type QuickAccessItem = { icon: typeof Home; label: string; mobileLabel: string; path: string; accessKey?: keyof ChurchAccessSummary };

const quickAccessItems: QuickAccessItem[] = [
  { icon: MessageCircle, label: "Pedido de oração", mobileLabel: "Oração", path: "/app/oracao" },
  { icon: Flame, label: "Nova alma", mobileLabel: "Nova alma", path: "/app/almas" },
  { icon: CalendarDays, label: "Eventos", mobileLabel: "Eventos", path: "/app/eventos", accessKey: "isExecutive" },
  { icon: Users, label: "Painel do discípulo", mobileLabel: "Meu painel", path: "/app/membro" },
];

function getVisibleQuickAccess(accessSummary: ChurchAccessSummary | null) {
  return quickAccessItems.filter((item) => !item.accessKey || Boolean(accessSummary?.[item.accessKey]));
}

const groups = [
  { key: "principal", label: "Início" },
  { key: "discipulado", label: "Jornada" },
  { key: "membros", label: "Pessoas" },
  { key: "celulas", label: "Equipes" },
  { key: "ministerio", label: "Atuação" },
  { key: "lideranca", label: "Formação e liderança" },
  { key: "comunicacao", label: "Comunicação" },
  { key: "admin", label: "Igreja" },
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

// ─── MOBILE QUICK NAV ──────────────────────────────────────────────────────────

function MobileQuickNav({ onMenuClick, menuOpen }: { onMenuClick: () => void; menuOpen: boolean }) {
  const [location, navigate] = useLocation();
  const { accessSummary } = useChurch();
  const visibleQuickAccess = getVisibleQuickAccess(accessSummary);

  return (
    <nav
      aria-label="Acesso rápido móvel"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md pointer-events-auto touch-manipulation items-stretch gap-1 rounded-2xl border border-white/15 bg-navy px-1.5 pt-1.5 shadow-2xl shadow-navy/25 lg:hidden"
      style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom))" }}
    >
      {visibleQuickAccess.map((item) => {
        const isActive = location === item.path || location.startsWith(item.path + "/");
        return (
          <button
            key={item.path}
            type="button"
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
            onClick={() => navigate(item.path)}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80 ${isActive ? "bg-white/12 text-gold shadow-inner ring-1 ring-inset ring-gold/35" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="w-full truncate text-[10px] font-medium leading-tight">{item.mobileLabel}</span>
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Mais opções"
        title="Mais opções"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls="church-sidebar-drawer"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMenuClick();
        }}
        className={`relative z-[101] flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80 ${menuOpen ? "bg-white/12 text-gold" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
      >
        <Menu className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className="w-full truncate text-[9px] font-medium leading-tight">Mais</span>
      </button>
    </nav>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useChurchAuth();
  const { churchName, logoUrl, accessSummary } = useChurch();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>("principal");
  const currentRole = user?.role ?? "membro";
  const effectiveRoles = Array.from(new Set([currentRole, ...(accessSummary?.roles ?? [])]));
  const isPastoralAdmin = Boolean(accessSummary?.isPastor || ["pastor_presidente", "pastor_local"].includes(currentRole));
  const encounterAccessQuery = trpc.encontro.hasAccess.useQuery(
    { churchId: user?.churchId ?? 0 },
    { enabled: Boolean(user?.churchId) }
  );
  useEffect(() => {
    const activeGroup = groups.find((group) => navItems.some((item) => item.group === group.key && (location === item.path || location.startsWith(item.path + "/"))));
    if (activeGroup) setExpandedGroup(activeGroup.key);
  }, [location]);
  const canReviewRegistrations = Boolean(accessSummary?.isPastor);
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
          className="fixed inset-0 z-[110] bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Floating mobile menu; desktop keeps the persistent sidebar. */}
      <aside
        id="church-sidebar-drawer"
        className={`
          fixed left-3 right-3 top-16 bottom-24 z-[120] flex min-h-0 w-auto max-w-md flex-col overflow-hidden rounded-2xl
          border border-white/10 shadow-2xl shadow-navy/30 sidebar-sacred transition-[transform,opacity] duration-200 ease-out
          lg:relative lg:inset-auto lg:z-auto lg:h-dvh lg:max-h-none lg:w-64 lg:max-w-none lg:rounded-none lg:border-0 lg:shadow-none
          ${open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-3 opacity-0 lg:pointer-events-auto lg:translate-x-0 lg:opacity-100"}
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
          {groups.map((group) => {
            const items = navItems.filter((i) => i.group === group.key && (!i.roles || i.roles.some((role) => effectiveRoles.includes(role))) && (!i.accessKey || Boolean(accessSummary?.[i.accessKey])) && (!i.requiresEncounterAccess || encounterAccessQuery.data === true));
            if (!items.length) return null;
            const isExpanded = expandedGroup === group.key;
            const contextualGroupLabel = group.key === "membros"
              ? (isPastoralAdmin ? "Pessoas" : "Minha área")
              : group.label;
            return (
              <section key={group.key} className="border-b border-white/5 pb-1 last:border-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-white/45 transition-colors hover:bg-white/5 hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                  onClick={() => setExpandedGroup((current) => current === group.key ? null : group.key)}
                  aria-expanded={isExpanded}
                  aria-controls={`sidebar-group-${group.key}`}
                >
                  <span>{contextualGroupLabel}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} aria-hidden="true" />
                </button>
                {isExpanded && (
                  <div id={`sidebar-group-${group.key}`} className="space-y-0.5 pb-1">
                    {items.map((item) => {
                      const isActive = location === item.path || location.startsWith(item.path + "/");
                      const contextualLabel = item.path === "/app/celulas"
                        ? (isPastoralAdmin ? "Células" : "Minhas Células")
                        : item.path === "/app/mapa"
                          ? (isPastoralAdmin ? "Mapa de Células" : "Mapa das minhas Células")
                          : item.path === "/app/ministerios"
                            ? (isPastoralAdmin ? "Ministérios" : "Meus Ministérios")
                            : item.path === "/app/escalas"
                              ? (isPastoralAdmin ? "Escalas" : "Minhas Escalas")
                              : item.path === "/app/lider"
                                ? (isPastoralAdmin ? "App do Líder" : "Meu painel")
                                : item.label;
                      return (
                        <button
                          key={item.path}
                          className={`sidebar-item w-full ${isActive ? "active" : ""}`}
                          onClick={() => { navigate(item.path); onClose(); }}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="min-w-0 truncate">{contextualLabel}</span>
                          {item.path === "/app/configuracoes" && pendingRegistrationCount > 0 && (
                            <span className="ml-auto min-w-5 rounded-full bg-gold px-1.5 py-0.5 text-center text-[10px] font-bold text-navy" aria-label={`${pendingRegistrationCount} cadastro${pendingRegistrationCount === 1 ? "" : "s"} aguardando aprovação`}>
                              {pendingRegistrationCount > 9 ? "9+" : pendingRegistrationCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        {/* Quick access remains available in the desktop sidebar; mobile uses the fixed bottom bar. */}
        {getVisibleQuickAccess(accessSummary).length > 0 && (
          <div className="mx-3 mb-2 hidden rounded-xl border border-gold/15 bg-white/5 p-2 lg:block group-data-[collapsible=icon]:mx-2 group-data-[collapsible=icon]:p-1" aria-label="Acesso rápido">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40 group-data-[collapsible=icon]:hidden">Acesso rápido</p>
            <div className="grid grid-cols-2 gap-1 group-data-[collapsible=icon]:grid-cols-1">
              {getVisibleQuickAccess(accessSummary).map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + "/");
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-2 text-left text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1 ${isActive ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                    onClick={() => { navigate(item.path); onClose(); }}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Account footer: compact avatar on mobile, with profile details on demand. */}
        <div className="relative px-3 py-4 border-t border-white/10">
          {profileOpen && (
            <div role="dialog" aria-label="Conta do usuário" className="absolute bottom-full left-3 right-3 z-10 mb-2 rounded-xl border border-white/15 bg-navy/95 p-3 shadow-2xl backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold" aria-hidden="true">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user?.name ?? "Usuário"}</p>
                  <p className="truncate text-xs text-white/55">{user?.email ?? ""}</p>
                </div>
                <button type="button" onClick={() => setProfileOpen(false)} className="rounded-md p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70" aria-label="Fechar conta">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1 border-t border-white/10 pt-3">
                {effectiveRoles.map((role) => (
                  <span key={role} className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                    {roleLabels[role] ?? role}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onClose();
                  setLogoutOpen(true);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair da plataforma
              </button>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-1">
            <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="dialog" aria-label={`Abrir conta de ${user?.name ?? "usuário"}`} title="Abrir conta" className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold transition-colors hover:bg-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Conta</p>
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

function TopBar({ title }: { title?: string }) {
  const { user } = useChurchAuth();
  const { churchId, pastoralSupport } = useChurch();
  const utils = trpc.useUtils();
  const showPastoralSupport = shouldShowPastoralSupport(pastoralSupport, "authenticated");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationCountQuery = trpc.notifications.unreadCount.useQuery({ churchId }, { enabled: Boolean(user?.churchId) });
  const notificationsQuery = trpc.notifications.mine.useQuery({ churchId }, { enabled: Boolean(user?.churchId && notificationsOpen) });
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.notifications.unreadCount.invalidate(), utils.notifications.mine.invalidate()]);
    },
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-base font-semibold text-navy font-display">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showPastoralSupport && pastoralSupport.url && <a href={pastoralSupport.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 max-w-[10rem] items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-2 py-1.5 text-[11px] font-semibold text-navy transition-colors hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:max-w-[min(18rem,32vw)] sm:gap-1.5 sm:px-2.5 sm:text-xs md:px-3" aria-label={`${pastoralSupport.label} — atendimento pastoral externo`} title={pastoralSupport.label}><MessageCircle className="h-4 w-4 shrink-0 text-gold" /><span className="min-w-0 truncate sm:hidden">Atendimento pastoral</span><span className="hidden min-w-0 truncate sm:inline">{pastoralSupport.label}</span><ExternalLink className="hidden h-3 w-3 shrink-0 text-muted-foreground sm:block" /></a>}
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
  const { data: accessSummary } = trpc.churchAuth.accessSummary.useQuery(
    { churchId: churchId ?? 0 },
    { enabled: isAuthenticated && churchId !== null, staleTime: 30_000 }
  );
  const pastoralSupport = normalizePastoralSupportConfig(church?.pastoralSupport);
  useTenantPwaMeta({ tenantSlug: church?.slug, tenantName: church?.name, primaryColor: church?.primaryColor, pwaIconAssetId: church?.pwaIconAssetId, pwaIconVersion: church?.updatedAt?.getTime() });

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
    pastoralSupport,
    accessSummary: accessSummary ?? null,
  };

  return (
    <ChurchContext.Provider value={churchContext}>
      <div className="flex h-dvh min-h-screen min-w-0 overflow-hidden bg-background golden-pattern">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar title={title} />
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-28 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>
        <MobileQuickNav menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </ChurchContext.Provider>
  );
}
