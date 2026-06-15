import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  Flame,
  Globe,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  Music,
  Shield,
  Star,
  TreePine,
  Users,
  X,
  Zap,
} from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Link, useLocation } from "wouter";

// ─── CHURCH CONTEXT ───────────────────────────────────────────────────────────

interface ChurchContextType {
  churchId: number;
  churchName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
}

const ChurchContext = createContext<ChurchContextType>({
  churchId: 1,
  churchName: "Minha Igreja",
  primaryColor: "#1e3a5f",
  secondaryColor: "#c9a84c",
});

export const useChurch = () => useContext(ChurchContext);

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app/dashboard", group: "principal" },
  { icon: Zap, label: "Radar Espiritual", path: "/app/radar", group: "principal" },
  { icon: TreePine, label: "Árvore de Discipulado", path: "/app/arvore", group: "principal" },
  { icon: Flame, label: "Ganhar Almas", path: "/app/almas", group: "discipulado" },
  { icon: Heart, label: "Consolidação", path: "/app/consolidacao", group: "discipulado" },
  { icon: ChevronRight, label: "Funil de Discipulado", path: "/app/funil", group: "discipulado" },
  { icon: Users, label: "Pessoas", path: "/app/pessoas", group: "membros" },
  { icon: Home, label: "Famílias", path: "/app/familias", group: "membros" },
  { icon: Globe, label: "Células", path: "/app/celulas", group: "celulas" },
  { icon: Map, label: "Mapa de Células", path: "/app/mapa", group: "celulas" },
  { icon: CalendarDays, label: "Eventos", path: "/app/eventos", group: "ministerio" },
  { icon: Music, label: "Ministérios", path: "/app/ministerios", group: "ministerio" },
  { icon: Star, label: "Escalas", path: "/app/escalas", group: "ministerio" },
  { icon: MessageCircle, label: "Pedidos de Oração", path: "/app/oracao", group: "comunicacao" },
  { icon: BookOpen, label: "Mural", path: "/app/mural", group: "comunicacao" },
  { icon: Shield, label: "Biblioteca", path: "/app/biblioteca", group: "comunicacao" },
  { icon: Building2, label: "Configurações", path: "/app/configuracoes", group: "admin" },
  { icon: Users, label: "Área do Membro", path: "/app/membro", group: "membros" },
  { icon: Star, label: "App do Líder", path: "/app/lider", group: "membros" },
];

const groups = [
  { key: "principal", label: "Visão Geral" },
  { key: "discipulado", label: "Discipulado" },
  { key: "membros", label: "Membros" },
  { key: "celulas", label: "Células" },
  { key: "ministerio", label: "Ministério" },
  { key: "comunicacao", label: "Comunicação" },
  { key: "admin", label: "Administração" },
];

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { churchName, logoUrl } = useChurch();

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
            const items = navItems.filter((i) => i.group === group.key);
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
              onClick={logout}
              className="text-white/30 hover:text-white/70 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
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
      </div>
    </header>
  );
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────

interface ChurchLayoutProps {
  children: React.ReactNode;
  title?: string;
  churchId?: number;
}

export default function ChurchLayout({ children, title, churchId = 1 }: ChurchLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, loading, logout } = useAuth();

  const { data: church } = trpc.churches.getById.useQuery(
    { id: churchId },
    { enabled: isAuthenticated }
  );

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

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const churchContext: ChurchContextType = {
    churchId,
    churchName: church?.name ?? "Minha Igreja",
    primaryColor: church?.primaryColor ?? "#1e3a5f",
    secondaryColor: church?.secondaryColor ?? "#c9a84c",
    logoUrl: church?.logoUrl,
  };

  return (
    <ChurchContext.Provider value={churchContext}>
      <div className="min-h-screen bg-background flex golden-pattern">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ChurchContext.Provider>
  );
}
