import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Flame,
  Globe,
  Heart,
  Layers,
  Map,
  Shield,
  Star,
  TreePine,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  {
    icon: Flame,
    title: "Ganhar Almas",
    desc: "Registre novas conversões com origem, consolidador e status inicial de cada decisão de fé.",
    color: "#f59e0b",
    bg: "bg-amber-50",
  },
  {
    icon: Heart,
    title: "Consolidação",
    desc: "Checklist completo de acompanhamento: ligação, visita, Bíblia, célula e oração.",
    color: "#f43f5e",
    bg: "bg-rose-50",
  },
  {
    icon: Layers,
    title: "Funil de Discipulado",
    desc: "Kanban visual com 9 etapas: Nova Alma → Consolidação → Fundamentos → ... → Multiplicador.",
    color: "#6366f1",
    bg: "bg-indigo-50",
  },
  {
    icon: Globe,
    title: "Gestão de Células",
    desc: "Cadastro, controle de membros, presença e relatórios automáticos por célula.",
    color: "#22c55e",
    bg: "bg-green-50",
  },
  {
    icon: Map,
    title: "Mapa Geográfico",
    desc: "Visualize todas as células no mapa, áreas descobertas e sugestões de expansão.",
    color: "#0ea5e9",
    bg: "bg-sky-50",
  },
  {
    icon: Zap,
    title: "Radar Espiritual",
    desc: "Identifique pessoas em risco: sem célula, sem discipulador, sem consolidação.",
    color: "#f59e0b",
    bg: "bg-amber-50",
  },
  {
    icon: TreePine,
    title: "Árvore de Discipulado",
    desc: "Visualize a genealogia espiritual e as relações de discipulado de toda a igreja.",
    color: "#10b981",
    bg: "bg-emerald-50",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Seguro",
    desc: "Cada igreja com logo, cores e subdomínio exclusivos. Dados totalmente isolados.",
    color: "#1e3a5f",
    bg: "bg-slate-50",
  },
];

const FUNNEL_STAGES = [
  { label: "Nova Alma", color: "#3b82f6" },
  { label: "Consolidação", color: "#f59e0b" },
  { label: "Fundamentos", color: "#8b5cf6" },
  { label: "Célula", color: "#22c55e" },
  { label: "Batismo", color: "#06b6d4" },
  { label: "Encontro com Deus", color: "#f43f5e" },
  { label: "Escola de Líderes", color: "#f97316" },
  { label: "Liderança", color: "#6366f1" },
  { label: "Multiplicador", color: "#10b981" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background golden-pattern">
      {/* ─── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
              <span className="text-gold font-bold text-lg">✝</span>
            </div>
            <div>
              <p className="font-display font-bold text-navy text-base leading-none">Igreja SaaS</p>
              <p className="text-[10px] text-gold font-medium tracking-wide">PLATAFORMA DE DISCIPULADO</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading ? null : isAuthenticated ? (
              <Link href="/app/dashboard">
                <Button className="bg-navy hover:bg-navy-light text-white gap-2">
                  Acessar Plataforma <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-navy hover:bg-navy-light text-white gap-2"
              >
                Entrar <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <section className="sacred-geometry-bg py-20 md:py-32 relative overflow-hidden">
        {/* Decorative golden circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="absolute -top-20 -right-20 w-96 h-96 opacity-10"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle cx="200" cy="200" r="180" stroke="#c9a84c" strokeWidth="1" />
            <circle cx="200" cy="200" r="120" stroke="#c9a84c" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="60" stroke="#c9a84c" strokeWidth="0.6" />
            <circle cx="200" cy="140" r="60" stroke="#c9a84c" strokeWidth="0.5" />
            <circle cx="252" cy="170" r="60" stroke="#c9a84c" strokeWidth="0.5" />
            <circle cx="252" cy="230" r="60" stroke="#c9a84c" strokeWidth="0.5" />
            <circle cx="200" cy="260" r="60" stroke="#c9a84c" strokeWidth="0.5" />
            <circle cx="148" cy="230" r="60" stroke="#c9a84c" strokeWidth="0.5" />
            <circle cx="148" cy="170" r="60" stroke="#c9a84c" strokeWidth="0.5" />
          </svg>
          <svg
            className="absolute -bottom-20 -left-20 w-80 h-80 opacity-8"
            viewBox="0 0 400 400"
            fill="none"
          >
            <circle cx="200" cy="200" r="160" stroke="#1e3a5f" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="100" stroke="#1e3a5f" strokeWidth="0.6" />
            <line x1="40" y1="200" x2="360" y2="200" stroke="#1e3a5f" strokeWidth="0.4" />
            <line x1="200" y1="40" x2="200" y2="360" stroke="#1e3a5f" strokeWidth="0.4" />
          </svg>
        </div>

        <div className="container relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold mb-8 tracking-wide uppercase">
            <Star className="w-3 h-3" />
            Plataforma de Crescimento, Discipulado e Multiplicação
          </div>

          <h1 className="text-4xl md:text-6xl font-bold font-display text-navy leading-tight mb-6">
            Ganhar, Consolidar,{" "}
            <span className="text-gold">Discipular</span>{" "}
            e Multiplicar
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-serif italic mb-10 max-w-2xl mx-auto leading-relaxed">
            A plataforma ministerial completa para igrejas que desejam crescer com propósito,
            precisão e excelência espiritual.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              size="lg"
              className="bg-navy hover:bg-navy-light text-white gap-2 px-8 h-12 text-base"
            >
              Começar Gratuitamente <ArrowRight className="w-5 h-5" />
            </Button>
            <Link href="/app/dashboard">
              <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base border-gold/40 text-navy hover:bg-gold/5">
                Ver Demo <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FUNIL VISUAL ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-navy">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-2">
              O Funil de Discipulado
            </h2>
            <p className="text-white/60 font-serif italic">
              Da Nova Alma ao Multiplicador — 9 etapas de transformação espiritual
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {FUNNEL_STAGES.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-2">
                <div
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white border border-white/10"
                  style={{ background: `${stage.color}30`, borderColor: `${stage.color}50` }}
                >
                  {stage.label}
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-navy mb-3">
              Tudo que sua igreja precisa
            </h2>
            <p className="text-muted-foreground font-serif italic text-lg">
              Módulos integrados para cada etapa do ciclo ministerial
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-sacred p-5 hover:border-gold/30 transition-all duration-200 group">
                <div
                  className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="font-display font-bold text-navy text-base mb-2 group-hover:text-gold transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-cream-dark">
        <div className="container text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-navy mx-auto flex items-center justify-center mb-6">
            <span className="text-gold text-2xl font-bold">✝</span>
          </div>
          <h2 className="text-3xl font-bold font-display text-navy mb-4">
            Pronto para multiplicar?
          </h2>
          <p className="text-muted-foreground font-serif italic text-lg mb-8">
            Junte-se a igrejas que estão crescendo com propósito e precisão.
          </p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            size="lg"
            className="bg-navy hover:bg-navy-light text-white gap-2 px-10 h-12 text-base"
          >
            Criar Conta Gratuita <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-navy font-bold">✝</span>
            <span className="text-sm font-display font-semibold text-navy">Igreja SaaS</span>
            <span className="text-xs text-gold">· Plataforma de Discipulado</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ganhar → Consolidar → Discipular → Formar → Enviar → Multiplicar
          </p>
        </div>
      </footer>
    </div>
  );
}
