import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, MapPin, BarChart3, Bell, BookOpen, Heart,
  ChevronRight, Star, CheckCircle2, ArrowRight, Menu, X,
  Layers, GitBranch, Globe, Shield, Zap, Phone
} from "lucide-react";

const FUNNEL_STEPS = [
  { label: "Nova Alma", color: "#e8d5b7", icon: "✦" },
  { label: "Consolidação", color: "#d4c4a0", icon: "✦" },
  { label: "Fundamentos", color: "#c9a84c", icon: "✦" },
  { label: "Célula", color: "#b8943e", icon: "✦" },
  { label: "Batismo", color: "#1e3a5f", icon: "✦" },
  { label: "Encontro com Deus", color: "#162d4a", icon: "✦" },
  { label: "Escola de Líderes", color: "#0f2035", icon: "✦" },
  { label: "Liderança", color: "#0a1828", icon: "✦" },
  { label: "Multiplicador", color: "#050d14", icon: "✦" },
];

const PLANS = [
  {
    name: "Básico",
    price: "R$ 97",
    period: "/mês",
    description: "Para igrejas em crescimento",
    features: ["Até 200 membros", "Funil de Discipulado", "Gestão de Células", "Módulo Ganhar Almas", "Consolidação", "Suporte por email"],
    cta: "Começar Grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    description: "Para igrejas estabelecidas",
    features: ["Até 1.000 membros", "Tudo do Básico", "Mapa Geográfico", "Radar Espiritual", "Árvore de Discipulado", "Biblioteca Digital", "Notificações automáticas", "Suporte prioritário"],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para redes e denominações",
    features: ["Membros ilimitados", "Tudo do Pro", "Multi-campus", "API personalizada", "Relatórios avançados", "Gerente de conta dedicado", "Treinamento presencial", "SLA garantido"],
    cta: "Falar com Especialista",
    highlight: false,
  },
];

const FEATURES = [
  { icon: GitBranch, title: "Funil de Discipulado", desc: "Kanban visual com 9 etapas do ciclo completo: da Nova Alma ao Multiplicador." },
  { icon: Users, title: "Gestão de Membros", desc: "Cadastro completo com dados pessoais, espirituais, familiares e histórico." },
  { icon: MapPin, title: "Inteligência Geográfica", desc: "Mapa interativo de células, áreas descobertas e sugestões de expansão." },
  { icon: BarChart3, title: "Dashboard Executivo", desc: "KPIs em tempo real, Radar Espiritual e Árvore de Discipulado visual." },
  { icon: Heart, title: "Ganhar Almas", desc: "Registro de conversões com origem, consolidador e acompanhamento completo." },
  { icon: Bell, title: "Notificações Automáticas", desc: "Alertas de aniversários, ausências, etapas do funil e eventos." },
  { icon: BookOpen, title: "Biblioteca Digital", desc: "Materiais de ensino, cursos e recursos para toda a liderança." },
  { icon: Shield, title: "Multi-Tenant Seguro", desc: "Isolamento total de dados. Cada igreja tem seu próprio subdomínio e ambiente." },
  { icon: Globe, title: "Portal do Visitante", desc: "Página pública para pedidos de oração, visitas e interesse em participar." },
  { icon: Layers, title: "Ministérios e Escalas", desc: "Gestão completa de equipes ministeriais com calendário visual." },
  { icon: Zap, title: "PWA Instalável", desc: "Funciona como app nativo no celular, sem precisar de loja de aplicativos." },
  { icon: Phone, title: "App do Líder", desc: "Interface simplificada para líderes de célula gerenciarem sua equipe." },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans">
      {/* Sacred geometry background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="500" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
          <circle cx="50%" cy="50%" r="700" fill="none" stroke="#c9a84c" strokeWidth="0.6" />
          <circle cx="30%" cy="40%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
          <circle cx="70%" cy="60%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#c9a84c" strokeWidth="0.5" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#c9a84c" strokeWidth="0.5" />
        </svg>
      </div>

      {/* HEADER */}
      <header className="relative z-50 bg-[#f5f0e8]/95 backdrop-blur-sm border-b border-[#c9a84c]/20 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <span className="text-[#c9a84c] font-bold text-sm">✦</span>
              </div>
              <div>
                <span className="font-bold text-[#1e3a5f] text-lg tracking-tight">Lampas</span>
                <span className="text-[#c9a84c] text-xs block leading-none tracking-widest uppercase">Plataforma Ministerial</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#recursos" className="text-[#1e3a5f]/70 hover:text-[#1e3a5f] text-sm font-medium transition-colors">Recursos</a>
              <a href="#planos" className="text-[#1e3a5f]/70 hover:text-[#1e3a5f] text-sm font-medium transition-colors">Planos</a>
              <a href="#funil" className="text-[#1e3a5f]/70 hover:text-[#1e3a5f] text-sm font-medium transition-colors">Funil</a>
              <a href="#contato" className="text-[#1e3a5f]/70 hover:text-[#1e3a5f] text-sm font-medium transition-colors">Contato</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/admin/login">
                <Button variant="ghost" size="sm" className="text-[#1e3a5f]/70 hover:text-[#1e3a5f]">
                  Admin
                </Button>
              </Link>
              <Link href="/cadastro-igreja">
                <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
                  Cadastrar Igreja
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-[#1e3a5f]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#c9a84c]/20 bg-[#f5f0e8] px-4 py-4 space-y-3">
            <a href="#recursos" className="block text-[#1e3a5f] font-medium py-2">Recursos</a>
            <a href="#planos" className="block text-[#1e3a5f] font-medium py-2">Planos</a>
            <a href="#funil" className="block text-[#1e3a5f] font-medium py-2">Funil</a>
            <a href="#contato" className="block text-[#1e3a5f] font-medium py-2">Contato</a>
            <Link href="/cadastro-igreja">
              <Button className="w-full bg-[#1e3a5f] text-white">Cadastrar Igreja</Button>
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative pt-20 pb-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30 hover:bg-[#c9a84c]/20 font-medium tracking-wider uppercase text-xs px-4 py-1.5">
            ✦ Plataforma de Crescimento, Discipulado e Multiplicação
          </Badge>

          <h1 className="font-serif text-5xl md:text-7xl font-bold text-[#1e3a5f] leading-tight mb-6">
            Ganhar, Consolidar,{" "}
            <span className="text-[#c9a84c]">Discipular</span>
            <br />e Multiplicar
          </h1>

          <p className="font-serif text-xl md:text-2xl text-[#1e3a5f]/60 italic max-w-3xl mx-auto mb-10 leading-relaxed">
            A plataforma ministerial completa para igrejas que desejam crescer com propósito, precisão e excelência espiritual.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro-igreja">
              <Button size="lg" className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white px-8 py-4 text-base font-semibold group">
                Cadastrar Minha Igreja
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#planos">
              <Button size="lg" variant="outline" className="border-[#1e3a5f]/30 text-[#1e3a5f] hover:bg-[#1e3a5f]/5 px-8 py-4 text-base">
                Ver Planos
              </Button>
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-[#1e3a5f]/50">
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#c9a84c]" /> 14 dias grátis</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#c9a84c]" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#c9a84c]" /> Suporte em português</span>
          </div>
        </div>
      </section>

      {/* FUNIL VISUAL */}
      <section id="funil" className="py-20 bg-[#1e3a5f] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <circle cx="50%" cy="50%" r="400" fill="none" stroke="#c9a84c" strokeWidth="1" />
            <circle cx="50%" cy="50%" r="600" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
          </svg>
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">O Funil de Discipulado</h2>
            <p className="font-serif text-[#c9a84c]/80 italic text-lg">Da Nova Alma ao Multiplicador — 9 etapas de transformação espiritual</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-0">
            {FUNNEL_STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div
                  className="px-4 py-2.5 rounded-lg text-center min-w-[110px] transition-transform hover:scale-105"
                  style={{ backgroundColor: step.color + "33", border: `1px solid ${step.color}66` }}
                >
                  <div className="text-[#c9a84c] text-xs mb-0.5">{step.icon}</div>
                  <div className="text-white text-xs font-medium leading-tight">{step.label}</div>
                </div>
                {i < FUNNEL_STEPS.length - 1 && (
                  <ChevronRight className="text-[#c9a84c]/40 mx-1 hidden md:block" size={16} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30 text-xs tracking-widest uppercase">Funcionalidades</Badge>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
              Tudo que sua igreja precisa
            </h2>
            <p className="text-[#1e3a5f]/60 max-w-2xl mx-auto">
              Uma plataforma integrada que acompanha cada pessoa desde a primeira visita até se tornar um multiplicador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Card key={i} className="bg-white/60 border-[#c9a84c]/20 hover:border-[#c9a84c]/50 hover:shadow-lg transition-all group">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/5 flex items-center justify-center mb-4 group-hover:bg-[#c9a84c]/10 transition-colors">
                    <f.icon size={20} className="text-[#1e3a5f] group-hover:text-[#c9a84c] transition-colors" />
                  </div>
                  <h3 className="font-semibold text-[#1e3a5f] mb-2">{f.title}</h3>
                  <p className="text-[#1e3a5f]/60 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24 px-4 bg-[#1e3a5f]/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30 text-xs tracking-widest uppercase">Planos</Badge>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
              Invista no crescimento da sua igreja
            </h2>
            <p className="text-[#1e3a5f]/60 max-w-2xl mx-auto">
              Planos flexíveis para igrejas de todos os tamanhos. Comece gratuitamente por 14 dias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 transition-all hover:-translate-y-1 ${
                  plan.highlight
                    ? "bg-[#1e3a5f] text-white shadow-2xl ring-2 ring-[#c9a84c]"
                    : "bg-white/80 border border-[#c9a84c]/20 hover:shadow-lg"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#c9a84c] text-[#1e3a5f] font-bold text-xs px-4">Mais Popular</Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`font-bold text-xl mb-1 ${plan.highlight ? "text-white" : "text-[#1e3a5f]"}`}>{plan.name}</h3>
                  <p className={`text-sm mb-4 ${plan.highlight ? "text-white/60" : "text-[#1e3a5f]/60"}`}>{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-serif text-4xl font-bold ${plan.highlight ? "text-[#c9a84c]" : "text-[#1e3a5f]"}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? "text-white/50" : "text-[#1e3a5f]/50"}`}>{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className={plan.highlight ? "text-[#c9a84c]" : "text-[#c9a84c]"} />
                      <span className={plan.highlight ? "text-white/80" : "text-[#1e3a5f]/70"}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/cadastro-igreja">
                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? "bg-[#c9a84c] hover:bg-[#b8943e] text-[#1e3a5f] font-bold"
                        : "bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-[#1e3a5f] mb-4">O que dizem os pastores</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Pr. Ricardo Alves", church: "Igreja Viver, São Paulo", text: "O Funil de Discipulado transformou nossa forma de acompanhar os membros. Conseguimos visualizar claramente onde cada pessoa está na jornada espiritual." },
              { name: "Pr. Marcos Ferreira", church: "Comunidade Luz, Curitiba", text: "O Radar Espiritual nos ajudou a identificar membros em risco antes que se afastassem. Uma ferramenta indispensável para o cuidado pastoral." },
              { name: "Pra. Ana Costa", church: "Igreja Renova, Fortaleza", text: "A gestão de células ficou muito mais eficiente. O mapa geográfico nos mostrou áreas da cidade sem cobertura e planejamos a expansão com precisão." },
            ].map((t, i) => (
              <Card key={i} className="bg-white/60 border-[#c9a84c]/20">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} size={14} className="text-[#c9a84c] fill-[#c9a84c]" />)}
                  </div>
                  <p className="text-[#1e3a5f]/70 text-sm italic leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <div className="font-semibold text-[#1e3a5f] text-sm">{t.name}</div>
                    <div className="text-[#1e3a5f]/50 text-xs">{t.church}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-[#1e3a5f] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%">
            <circle cx="20%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
            <circle cx="80%" cy="50%" r="300" fill="none" stroke="#c9a84c" strokeWidth="1" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para transformar sua gestão ministerial?
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Cadastre sua igreja hoje e experimente gratuitamente por 14 dias. Sem cartão de crédito.
          </p>
          <Link href="/cadastro-igreja">
            <Button size="lg" className="bg-[#c9a84c] hover:bg-[#b8943e] text-[#1e3a5f] font-bold px-10 py-4 text-base">
              Cadastrar Minha Igreja Agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] mb-4">Fale Conosco</h2>
          <p className="text-[#1e3a5f]/60 mb-8">Tem dúvidas? Nossa equipe está pronta para ajudar.</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#1e3a5f]/70">
            <a href="mailto:contato@lampas.com.br" className="flex items-center gap-2 hover:text-[#c9a84c] transition-colors">
              <span>✉</span> contato@lampas.com.br
            </a>
            <a href="https://wa.me/5511999999999" className="flex items-center gap-2 hover:text-[#c9a84c] transition-colors">
              <Phone size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1e3a5f] text-white/50 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#c9a84c] rounded flex items-center justify-center">
              <span className="text-[#1e3a5f] text-xs font-bold">✦</span>
            </div>
            <span className="text-white font-semibold">Lampas</span>
          </div>
          <p className="text-sm">© 2025 Lampas Plataforma Ministerial. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <Link href="/admin/login" className="hover:text-white transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
