import { useState } from "react";
import { Link } from "wouter";
import {
  Users, Heart, GitBranch, MapPin, Calendar, Bell,
  ChevronRight, ChevronLeft, Play, CheckCircle2,
  BarChart3, BookOpen, Church, Shield, ArrowRight
} from "lucide-react";

type StepPreview =
  | { type: "form"; fields: { label: string; value: string }[] }
  | { type: "stats"; items: { label: string; value: string; icon: any }[] }
  | { type: "list"; items: { name: string; date: string; origin: string; status: string }[] }
  | { type: "kanban"; columns: { name: string; count: number; color: string }[] }
  | { type: "map"; stats: { label: string; value: string }[] }
  | { type: "dashboard"; kpis: { label: string; value: string; trend: string }[] };

const STEPS: { id: number; icon: any; title: string; subtitle: string; description: string; color: string; accent: string; preview: StepPreview }[] = [
  {
    id: 1,
    icon: Church,
    title: "Cadastre sua Igreja",
    subtitle: "Em menos de 2 minutos",
    description:
      "Preencha o nome da sua igreja, escolha um subdomínio exclusivo e crie a conta do Pastor Presidente. O sistema cria automaticamente o ambiente completo da sua igreja.",
    color: "#1e3a5f",
    accent: "#c9a84c",
    preview: {
      type: "form",
      fields: [
        { label: "Nome da Igreja", value: "Igreja Viver em Cristo" },
        { label: "Subdomínio", value: "igrejaviver.idefazei.com.br" },
        { label: "Pastor Presidente", value: "Pr. João Silva" },
        { label: "Email", value: "joao@igrejaviver.com.br" },
      ],
    },
  },
  {
    id: 2,
    icon: Users,
    title: "Cadastre Pessoas",
    subtitle: "Dados completos e espirituais",
    description:
      "Registre membros, visitantes e novas almas com dados pessoais, de contato, endereço e informações espirituais como conversão, batismo e célula.",
    color: "#1e3a5f",
    accent: "#c9a84c",
    preview: {
      type: "stats",
      items: [
        { label: "Membros ativos", value: "247", icon: Users },
        { label: "Novas almas (mês)", value: "18", icon: Heart },
        { label: "Famílias", value: "89", icon: Church },
        { label: "Líderes", value: "34", icon: Shield },
      ],
    },
  },
  {
    id: 3,
    icon: Heart,
    title: "Ganhar Almas",
    subtitle: "Registre cada conversão",
    description:
      "Registre novas conversões com origem (culto, célula, evento), quem ganhou a pessoa, data e status inicial. Cada nova alma entra automaticamente no funil de discipulado.",
    color: "#1e3a5f",
    accent: "#c9a84c",
    preview: {
      type: "list",
      items: [
        { name: "Maria Santos", date: "Hoje", origin: "Culto Domingo", status: "Nova Alma" },
        { name: "Carlos Oliveira", date: "Ontem", origin: "Célula Zona Norte", status: "Consolidação" },
        { name: "Ana Lima", date: "3 dias", origin: "Evento Jovens", status: "Fundamentos" },
        { name: "Pedro Costa", date: "1 semana", origin: "Culto Quarta", status: "Célula" },
      ],
    },
  },
  {
    id: 4,
    icon: GitBranch,
    title: "Funil de Discipulado",
    subtitle: "Kanban visual com 9 etapas",
    description:
      "Acompanhe cada pessoa em sua jornada espiritual com um Kanban visual. Arraste e solte para mover entre as etapas: Nova Alma → Consolidação → Fundamentos → Célula → Batismo → Encontro com Deus → Escola de Líderes → Liderança → Multiplicador.",
    color: "#1e3a5f",
    accent: "#c9a84c",
    preview: {
      type: "kanban",
      columns: [
        { name: "Nova Alma", count: 18, color: "#e8f4f8" },
        { name: "Consolidação", count: 12, color: "#f0f8e8" },
        { name: "Fundamentos", count: 9, color: "#f8f4e8" },
        { name: "Célula", count: 24, color: "#f4e8f8" },
        { name: "Batismo", count: 7, color: "#e8f0f8" },
      ],
    },
  },
  {
    id: 5,
    icon: MapPin,
    title: "Mapa de Células",
    subtitle: "Inteligência geográfica",
    description:
      "Visualize todas as células no mapa, veja a quantidade de pessoas por região, identifique áreas descobertas e receba sugestões de expansão baseadas em dados reais.",
    color: "#1e3a5f",
    accent: "#c9a84c",
    preview: {
      type: "map",
      stats: [
        { label: "Células ativas", value: "32" },
        { label: "Cobertura da cidade", value: "68%" },
        { label: "Áreas descobertas", value: "5 bairros" },
        { label: "Sugestões de expansão", value: "3 regiões" },
      ],
    },
  },
  {
    id: 6,
    icon: BarChart3,
    title: "Dashboard Executivo",
    subtitle: "Radar Espiritual e Árvore de Discipulado",
    description:
      "Acompanhe KPIs em tempo real, identifique pessoas em risco espiritual com o Radar Espiritual e visualize a genealogia de discipulado da sua igreja com a Árvore de Discipulado.",
    color: "#1e3a5f",
    accent: "#c9a84c",
    preview: {
      type: "dashboard",
      kpis: [
        { label: "Total de Membros", value: "247", trend: "+12%" },
        { label: "Novas Almas (mês)", value: "18", trend: "+33%" },
        { label: "Células Ativas", value: "32", trend: "+4%" },
        { label: "Líderes Formados", value: "34", trend: "+8%" },
      ],
    },
  },
];

function PreviewForm({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.label}>
          <label className="block text-xs font-medium text-[#1e3a5f]/60 mb-1">{f.label}</label>
          <div className="w-full px-3 py-2 bg-white border border-[#1e3a5f]/10 rounded-lg text-sm text-[#1e3a5f] font-medium">
            {f.value}
          </div>
        </div>
      ))}
      <button className="w-full mt-2 py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> Criar Minha Igreja
      </button>
    </div>
  );
}

function PreviewStats({ items }: { items: { label: string; value: string; icon: any }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl p-4 border border-[#1e3a5f]/10">
          <item.icon className="w-5 h-5 text-[#c9a84c] mb-2" />
          <div className="text-2xl font-bold text-[#1e3a5f]">{item.value}</div>
          <div className="text-xs text-[#1e3a5f]/60 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewList({ items }: { items: { name: string; date: string; origin: string; status: string }[] }) {
  const statusColor: Record<string, string> = {
    "Nova Alma": "bg-blue-100 text-blue-700",
    "Consolidação": "bg-green-100 text-green-700",
    "Fundamentos": "bg-yellow-100 text-yellow-700",
    "Célula": "bg-purple-100 text-purple-700",
  };
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.name} className="bg-white rounded-xl p-3 border border-[#1e3a5f]/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {item.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[#1e3a5f] text-sm truncate">{item.name}</div>
            <div className="text-xs text-[#1e3a5f]/50 truncate">{item.origin} · {item.date}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[item.status] ?? "bg-gray-100 text-gray-600"}`}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function PreviewKanban({ columns }: { columns: { name: string; count: number; color: string }[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col.name} className="flex-shrink-0 w-28">
          <div className="text-xs font-semibold text-[#1e3a5f] mb-2 truncate">{col.name}</div>
          <div className="rounded-xl p-2 space-y-1.5" style={{ backgroundColor: col.color }}>
            {Array.from({ length: Math.min(col.count, 3) }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
                <div className="w-full h-1.5 bg-[#1e3a5f]/10 rounded-full mb-1" />
                <div className="w-2/3 h-1.5 bg-[#1e3a5f]/10 rounded-full" />
              </div>
            ))}
            <div className="text-center text-xs text-[#1e3a5f]/60 font-medium pt-1">
              {col.count} pessoas
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewMap({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="space-y-3">
      <div className="bg-[#1e3a5f]/5 rounded-xl h-32 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-[#c9a84c]"
              style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            />
          ))}
        </div>
        <div className="text-center z-10">
          <MapPin className="w-8 h-8 text-[#c9a84c] mx-auto mb-1" />
          <p className="text-xs text-[#1e3a5f]/60">32 células mapeadas</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg p-2.5 border border-[#1e3a5f]/10">
            <div className="font-bold text-[#1e3a5f] text-sm">{s.value}</div>
            <div className="text-xs text-[#1e3a5f]/50">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewDashboard({ kpis }: { kpis: { label: string; value: string; trend: string }[] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-3 border border-[#1e3a5f]/10">
            <div className="text-xl font-bold text-[#1e3a5f]">{kpi.value}</div>
            <div className="text-xs text-[#1e3a5f]/60">{kpi.label}</div>
            <div className="text-xs font-semibold text-emerald-600 mt-1">{kpi.trend}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-3 border border-[#1e3a5f]/10">
        <div className="text-xs font-semibold text-[#1e3a5f] mb-2">Radar Espiritual</div>
        <div className="space-y-1.5">
          {["Sem célula há 30 dias", "Sem consolidação", "Afastados"].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <div className="text-xs text-[#1e3a5f]/70">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Geometria sagrada de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-5">
        <svg viewBox="0 0 1200 800" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <circle cx="600" cy="400" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="450" cy="400" r="300" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="750" cy="400" r="300" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
          <circle cx="600" cy="300" r="200" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#1e3a5f]/10 bg-[#f5f0e8]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
              <span className="text-[#c9a84c] font-bold text-sm">I</span>
            </div>
            <span className="font-bold text-[#1e3a5f] text-lg font-display">Ide Fazei</span>
          </Link>
          <Link
            href="/cadastro-igreja"
            className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f]/90 transition-colors"
          >
            Começar grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 text-[#c9a84c] text-sm font-medium mb-6">
          <Play className="w-3.5 h-3.5" /> Tour Interativo
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display text-[#1e3a5f] mb-4">
          Veja a plataforma em ação
        </h1>
        <p className="text-lg text-[#1e3a5f]/60 max-w-xl mx-auto font-serif italic">
          Explore cada módulo e entenda como a Ide Fazei transforma a gestão ministerial da sua igreja.
        </p>
      </div>

      {/* Steps navigation */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, idx) => {
            const StepIcon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                  idx === currentStep
                    ? "bg-[#1e3a5f] text-white shadow-md"
                    : "bg-white text-[#1e3a5f]/60 border border-[#1e3a5f]/10 hover:border-[#1e3a5f]/30"
                }`}
              >
                <StepIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left: description */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1e3a5f] flex items-center justify-center">
                <Icon className="w-6 h-6 text-[#c9a84c]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#c9a84c] uppercase tracking-wider">
                  Passo {currentStep + 1} de {STEPS.length}
                </div>
                <h2 className="text-2xl font-bold font-display text-[#1e3a5f]">{step.title}</h2>
              </div>
            </div>

            <p className="text-[#1e3a5f]/70 font-serif italic text-lg leading-relaxed">
              {step.subtitle}
            </p>

            <p className="text-[#1e3a5f]/80 leading-relaxed">
              {step.description}
            </p>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#1e3a5f]/50">
                <span>Progresso do tour</span>
                <span>{Math.round(((currentStep + 1) / STEPS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-[#1e3a5f]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c9a84c] rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#1e3a5f]/20 rounded-xl text-sm font-medium text-[#1e3a5f] hover:border-[#1e3a5f]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#1e3a5f]/90 transition-colors"
                >
                  Próximo <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/cadastro-igreja"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#c9a84c] text-white rounded-xl text-sm font-semibold hover:bg-[#c9a84c]/90 transition-colors"
                >
                  Começar agora <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Right: preview */}
          <div className="bg-[#f5f0e8] border border-[#1e3a5f]/10 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-[#1e3a5f]/40 ml-2">
                app.idefazei.com.br
              </div>
            </div>

            {step.preview.type === "form" && <PreviewForm fields={step.preview.fields!} />}
            {step.preview.type === "stats" && <PreviewStats items={step.preview.items!} />}
            {step.preview.type === "list" && <PreviewList items={step.preview.items!} />}
            {step.preview.type === "kanban" && <PreviewKanban columns={step.preview.columns!} />}
            {step.preview.type === "map" && <PreviewMap stats={step.preview.stats!} />}
            {step.preview.type === "dashboard" && <PreviewDashboard kpis={step.preview.kpis!} />}
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="relative z-10 bg-[#1e3a5f] py-16 px-4 text-center">
        <h2 className="text-3xl font-bold font-display text-white mb-4">
          Pronto para transformar sua igreja?
        </h2>
        <p className="text-white/60 font-serif italic mb-8 max-w-md mx-auto">
          14 dias grátis, sem cartão de crédito. Suporte em português.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/cadastro-igreja"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a84c] text-white rounded-xl font-semibold hover:bg-[#c9a84c]/90 transition-colors"
          >
            Cadastrar Minha Igreja <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/planos"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
          >
            Ver Planos
          </Link>
        </div>
      </div>
    </div>
  );
}
