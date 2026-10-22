import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronDown, GraduationCap, HeartHandshake, Mail,
  Menu, MessageCircle, Phone, Send, ShieldCheck, Smartphone, UserPlus, Users, UsersRound,
  WalletCards, X, ClipboardList, MapPin, Gift,
} from "lucide-react";
import { usePlatformContact } from "@/hooks/usePlatformContact";
import { formatBrazilianPhone, formatCnpj } from "@shared/platformContact";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { TRIAL_DAYS } from "@shared/billing";

/**
 * Página de venda do Ide Fazei.
 * Regra de conteúdo: só aparece aqui o que o sistema já faz hoje. Recursos que seguem o modelo de uma
 * visão específica (células, consolidação, Escola de Fundamentos, Encontro com Deus) aparecem como
 * recursos dentro das áreas, nunca como requisito para usar a plataforma.
 */

// Cores: ouro escuro (#7a5c0f) para texto sobre fundo claro (contraste 5,5:1); ouro claro só sobre azul.
const NAVY = "text-[#1e3a5f]";
const BODY = "text-[#1e3a5f]/75";
const EYEBROW = "text-[#7a5c0f]";

const AREAS = [
  {
    id: "pessoas",
    icon: Users,
    title: "Pessoas, membros e visitantes",
    summary: "Saiba quem faz parte da igreja, quem chegou agora e como cada família está.",
    items: [
      "Cadastro de pessoas com contato, endereço e histórico",
      "Famílias e vínculos entre as pessoas",
      "Registro de novas almas e visitantes",
      "Ficha de cadastro pública, com QR Code",
      "Portal do Visitante: pedido de oração, visita e interesse em participar",
      "Área do Membro com os dados e a jornada de cada pessoa",
    ],
  },
  {
    id: "cuidado",
    icon: HeartHandshake,
    title: "Acompanhamento e cuidado pastoral",
    summary: "Ninguém passa despercebido: veja quem precisa de um contato, uma visita ou uma oração.",
    items: [
      "Central de cuidado com pessoas que precisam de atenção",
      "Consolidação: primeiro contato e visitas, com responsável definido",
      "Radar espiritual: pessoas afastadas ou sem acompanhamento",
      "Pedidos de oração e testemunhos",
      "Aconselhamento com acesso restrito a quem pode ver",
      "Árvore de discipulado para enxergar quem acompanha quem",
    ],
  },
  {
    id: "ensino",
    icon: GraduationCap,
    title: "Ensino, cursos e formação",
    summary: "Organize turmas, estudos e a formação de novos membros e líderes.",
    items: [
      "Escola de Fundamentos, com aulas, material e acompanhamento do aluno",
      "Escola de Líderes, com estudo do aluno e do professor",
      "Turmas de batismo e acompanhamento das inscrições",
      "Encontro com Deus, com fichas e participantes",
      "Estudos para células e grupos",
      "Biblioteca de materiais para a liderança",
    ],
  },
  {
    id: "equipes",
    icon: UsersRound,
    title: "Equipes, ministérios e voluntários",
    summary: "Cada pessoa no lugar certo, com a escala certa e o líder certo.",
    items: [
      "Ministérios com responsável, participantes e funções",
      "Escalas por data, com lembretes",
      "Estrutura organizacional da igreja",
      "Células e grupos, com líder, anfitrião, endereço e presença",
      "Mapa para ver onde os grupos estão",
      "Gestão de liderança e App do Líder, simples para usar no celular",
    ],
  },
  {
    id: "cultos",
    icon: CalendarDays,
    title: "Cultos, eventos e comunicação",
    summary: "Divulgue, receba inscrições e mantenha todos informados.",
    items: [
      "Eventos com inscrição online e check-in por QR Code",
      "Página pública da igreja, com horários de culto e convite para visita",
      "Mural de avisos para a congregação",
      "Comunicação com as pessoas, com apoio de links de WhatsApp",
      "Notificações no celular",
      "Identidade visual da igreja: nome, logo e cores",
    ],
  },
  {
    id: "financas",
    icon: WalletCards,
    title: "Finanças e administração",
    summary: "Transparência e controle para quem cuida dos recursos da igreja.",
    items: [
      "Tesouraria: entradas, conferência de contagem e relatórios",
      "Contribuições e doações online, com comprovante",
      "Contas a pagar",
      "Conciliação e registro de quem fez cada alteração",
      "Perfis de acesso por função: pastor, supervisor, líder, secretaria, tesouraria e membro",
      "Registro de acessos para apoiar a segurança",
    ],
  },
] as const;

const STEPS = [
  { icon: ClipboardList, title: "Cadastre sua igreja", text: `Informe os dados da igreja e escolha o endereço dela na plataforma. Nossa equipe analisa o cadastro em até 24 horas úteis e você já começa com ${TRIAL_DAYS} dias grátis, sem cartão.` },
  { icon: UserPlus, title: "Cadastre pessoas e convide a equipe", text: "Registre membros e visitantes e dê a cada líder o acesso que combina com a sua função." },
  { icon: Smartphone, title: "Acompanhe no dia a dia", text: "Use no celular ou no computador. Comece pelo que a sua igreja já faz hoje e avance no seu ritmo." },
] as const;

const FIT = [
  { icon: ShieldCheck, title: "Os dados da sua igreja ficam separados", text: "Cada igreja tem o seu próprio endereço e o seu ambiente. As informações de uma igreja não aparecem para outra." },
  { icon: Users, title: "Cada pessoa vê o que precisa", text: "Perfis de acesso por função ajudam a proteger dados sensíveis, como finanças e aconselhamento." },
  { icon: CheckCircle2, title: "Use o que faz sentido para você", text: "Não é preciso adotar todos os recursos. Igrejas de tamanhos e formas de organização diferentes podem começar por pessoas, eventos, equipes ou finanças." },
] as const;

const PLANS = [
  {
    name: "Básico",
    price: "R$ 97",
    period: "/mês",
    description: "Para começar a organizar a igreja.",
    features: ["Até 200 membros", "Até 10 células", "Relatórios básicos", "Suporte por e-mail"],
    highlight: false,
    contactOnly: false,
    cta: "Cadastrar minha igreja",
  },
  {
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    description: "Para igrejas com mais pessoas e mais equipes.",
    features: ["Membros e células sem limite", "Todos os recursos do sistema", "Suporte prioritário"],
    highlight: true,
    contactOnly: false,
    cta: "Cadastrar minha igreja",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para redes e ministérios com necessidades próprias.",
    features: ["Conversa direta com a nossa equipe", "Avaliação da estrutura da sua rede ou ministério", "Proposta sob medida"],
    highlight: false,
    contactOnly: true,
    cta: "Falar com a equipe",
  },
] as const;

const FAQ = [
  { q: "Para que tipo de igreja o Ide Fazei serve?", a: "Para igrejas de diferentes tamanhos e formas de organização. O sistema reúne recursos de pessoas, cuidado, ensino, equipes, eventos e finanças, e a sua igreja usa os que fizerem sentido. Alguns recursos, como células e consolidação, têm nomes e fluxos próprios do sistema." },
  { q: "Preciso trabalhar com células ou com consolidação?", a: "Não. Esses recursos existem para quem os utiliza. Você pode começar apenas com cadastro de pessoas, eventos, ministérios e finanças." },
  { q: "Como faço para começar?", a: "Cadastre a sua igreja pelo botão desta página. Nossa equipe analisa o cadastro em até 24 horas úteis e avisa por e-mail quando o acesso for liberado." },
  { q: "Os dados da minha igreja ficam separados dos de outras igrejas?", a: "Sim. Cada igreja tem o seu próprio endereço e o seu ambiente, e os dados não se misturam." },
  { q: "Quem pode ver as finanças e os atendimentos pastorais?", a: "Somente quem recebe esse acesso. O sistema tem perfis por função, e áreas como tesouraria e aconselhamento têm acesso restrito." },
  { q: "Funciona no celular?", a: "Sim. Dá para usar no navegador do celular e instalar como aplicativo, sem precisar de loja de aplicativos." },
  { q: "Quanto custa?", a: `O plano Básico custa R$ 97 por mês e o Pro, R$ 197 por mês. Todo plano começa com ${TRIAL_DAYS} dias grátis, sem cartão de crédito, para você testar antes de decidir. Para redes e ministérios com necessidades próprias, conversamos para entender o que a sua realidade pede.` },
  { q: "Preciso de cartão de crédito para começar?", a: `Não. Você cadastra a sua igreja e usa o sistema por ${TRIAL_DAYS} dias sem informar nenhum dado de pagamento. Só depois desse período é que a cobrança passa a valer.` },
  { q: "O sistema atende igrejas fora do Brasil?", a: "Sim. O Ide Fazei funciona em português e pode ser usado por igrejas de qualquer país de língua portuguesa. Hoje a cobrança dos planos é feita em reais (R$), por cartão ou Pix; para outras moedas e formas de pagamento, fale com a nossa equipe." },
  { q: "Posso ver o sistema antes de cadastrar?", a: "Sim. A demonstração interativa mostra como o sistema funciona, com dados de exemplo. Se preferir, fale com a nossa equipe." },
] as const;

const SOCIAL_LABELS = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok" } as const;

const NAV_SECTION_IDS = ["areas", "telas", "como-funciona", "planos", "perguntas", "contato"] as const;

// Telas reais do produto (barra de status do iOS removida), para a prova visual.
const SCREENS = [
  { src: "inicio", label: "Início do membro" },
  { src: "ministerios", label: "Ministérios e equipes" },
  { src: "membro", label: "Área do membro" },
  { src: "fundamentos", label: "Escola de Fundamentos" },
] as const;

/** Moldura de celular com uma tela real do sistema dentro. */
function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full rounded-[2rem] border border-[#1e3a5f]/15 bg-[#1e3a5f] p-1.5 shadow-[0_22px_50px_-16px_rgba(30,58,95,0.5)]">
      <div className="overflow-hidden rounded-[1.6rem] bg-white">
        <picture>
          <source srcSet={`/brand/screens/${src}.webp`} type="image/webp" />
          <img
            src={`/brand/screens/${src}.png`}
            alt={alt}
            width={560}
            height={966}
            loading="lazy"
            decoding="async"
            className="block w-full"
          />
        </picture>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { contact, whatsappLink } = usePlatformContact();
  const socialLinks = (Object.keys(SOCIAL_LABELS) as Array<keyof typeof SOCIAL_LABELS>).filter(key => contact.social[key]);
  const closeMenu = () => setMobileMenuOpen(false);
  const activeSection = useActiveSection(NAV_SECTION_IDS);
  const areasRevealRef = useRevealOnScroll<HTMLDivElement>();
  const fitRevealRef = useRevealOnScroll<HTMLDivElement>();
  const screensRevealRef = useRevealOnScroll<HTMLDivElement>();

  const planButton = (plan: (typeof PLANS)[number]) => {
    const button = (
      <Button
        className={`w-full touch-manipulation transition-transform active:scale-[0.97] ${
          plan.highlight ? "bg-[#c9a84c] hover:bg-[#b8943e] text-[#1e3a5f] font-bold" : "bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
        }`}
      >
        {plan.cta}
      </Button>
    );
    if (plan.contactOnly && whatsappLink) {
      return <a href={whatsappLink} target="_blank" rel="noopener noreferrer">{button}</a>;
    }
    return <Link href={plan.contactOnly ? "/contato" : "/cadastro-igreja"}>{button}</Link>;
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans text-[#1e3a5f] antialiased">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Ir para o conteúdo
      </a>

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-[#1e3a5f]/10 bg-[#f5f0e8]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#f5f0e8]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#topo" className="flex items-center gap-2.5" aria-label="Ide Fazei, início da página">
            <img src="/brand/ide-fazei-wordmark.png" alt="Ide Fazei" className="h-7 w-auto object-contain sm:h-8" />
            <span className={`hidden border-l border-[#1e3a5f]/15 pl-2.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] sm:block ${EYEBROW}`}>
              Gestão<br />para igrejas
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Seções da página">
            {[
              ["areas", "#areas", "Recursos"],
              ["telas", "#telas", "Telas"],
              ["como-funciona", "#como-funciona", "Como funciona"],
              ["planos", "#planos", "Planos"],
              ["perguntas", "#perguntas", "Perguntas"],
              ["contato", "#contato", "Contato"],
            ].map(([id, href, label]) => (
              <a
                key={href}
                href={href}
                aria-current={activeSection === id ? "true" : undefined}
                className={`text-sm font-medium underline decoration-[#c9a84c] decoration-2 underline-offset-[22px] transition-colors hover:text-[#1e3a5f] ${
                  activeSection === id ? "text-[#1e3a5f] decoration-solid" : "text-[#1e3a5f]/75 decoration-transparent"
                }`}
              >
                {label}
              </a>
            ))}
            <Link href="/demo" className="text-sm font-medium text-[#1e3a5f]/75 transition-colors hover:text-[#1e3a5f]">Demonstração</Link>
          </nav>

          <div className="hidden md:block">
            <Link href="/cadastro-igreja">
              <Button size="sm" className="bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-[0.97]">Cadastrar minha igreja</Button>
            </Link>
          </div>

          <button
            className="touch-manipulation rounded-md p-2 text-[#1e3a5f] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] active:scale-90 md:hidden"
            onClick={() => setMobileMenuOpen(open => !open)}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="menu-mobile"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="menu-mobile" className="space-y-1 border-t border-[#1e3a5f]/10 bg-[#f5f0e8] px-4 py-4 md:hidden">
            {[
              ["areas", "#areas", "Recursos"],
              ["telas", "#telas", "Telas"],
              ["como-funciona", "#como-funciona", "Como funciona"],
              ["planos", "#planos", "Planos"],
              ["perguntas", "#perguntas", "Perguntas"],
              ["contato", "#contato", "Contato"],
            ].map(([id, href, label]) => (
              <a
                key={href}
                href={href}
                onClick={closeMenu}
                className={`block touch-manipulation py-2.5 font-medium transition-colors ${
                  activeSection === id ? "text-[#1e3a5f]" : "text-[#1e3a5f]/80"
                }`}
              >
                {label}
              </a>
            ))}
            <Link href="/demo" onClick={closeMenu} className="block py-2.5 font-medium text-[#1e3a5f]">Demonstração</Link>
            <Link href="/cadastro-igreja" onClick={closeMenu}>
              <Button className="mt-2 w-full bg-[#1e3a5f] text-white active:scale-[0.97]">Cadastrar minha igreja</Button>
            </Link>
          </div>
        )}
      </header>

      <main id="conteudo">
        {/* TOPO */}
        <section id="topo" className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <circle cx="80%" cy="30%" r="320" fill="none" stroke="#7a5c0f" strokeWidth="1" />
              <circle cx="80%" cy="30%" r="520" fill="none" stroke="#7a5c0f" strokeWidth="0.8" />
              <circle cx="10%" cy="90%" r="260" fill="none" stroke="#7a5c0f" strokeWidth="0.8" />
            </svg>
          </div>
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className={`mb-5 text-xs font-semibold uppercase tracking-[0.2em] ${EYEBROW}`}>Plataforma de gestão para igrejas</p>
              <h1 className="font-serif text-4xl font-bold leading-[1.1] text-[#1e3a5f] sm:text-5xl lg:text-6xl">
                Mais organização para sua igreja.{" "}
                <span className={EYEBROW}>Mais atenção a cada pessoa.</span>
              </h1>
              <p className={`mx-auto mt-6 max-w-xl text-lg leading-relaxed ${BODY}`}>
                O Ide Fazei reúne pessoas, cuidado pastoral, ensino, equipes, eventos e finanças em um só lugar, para você cuidar de quem Deus confiou à sua igreja e apoiar a sua missão.
              </p>
              <p className={`mt-6 inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-1.5 text-sm font-semibold ${EYEBROW}`}>
                <Gift size={16} aria-hidden="true" /> {TRIAL_DAYS} dias grátis para testar, sem cartão de crédito
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/cadastro-igreja">
                  <Button size="lg" className="group w-full touch-manipulation bg-[#1e3a5f] px-8 text-base font-semibold text-white transition-transform hover:bg-[#162d4a] active:scale-[0.97] sm:w-auto">
                    Cadastrar minha igreja
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="w-full touch-manipulation border-[#1e3a5f]/30 px-8 text-base text-[#1e3a5f] transition-transform hover:bg-[#1e3a5f]/5 active:scale-[0.97] sm:w-auto">
                    Ver demonstração
                  </Button>
                </Link>
              </div>
              <ul className={`mx-auto mt-8 flex flex-col items-center gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 ${BODY}`}>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className={EYEBROW} aria-hidden="true" /> {TRIAL_DAYS} dias grátis, sem cartão</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className={EYEBROW} aria-hidden="true" /> Cadastro analisado em até 24 horas úteis</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className={EYEBROW} aria-hidden="true" /> Use no celular e no computador</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className={EYEBROW} aria-hidden="true" /> Atendimento em português, para igrejas em qualquer país</li>
              </ul>
            </div>

            <nav aria-label="Áreas do sistema" className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {AREAS.map(area => (
                <a
                  key={area.id}
                  href={`#${area.id}`}
                  className="group flex touch-manipulation flex-col items-center rounded-2xl border border-[#1e3a5f]/10 bg-white/80 p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#c9a84c]/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] active:scale-[0.97] sm:p-5"
                >
                  <area.icon className="mb-3 h-6 w-6 text-[#1e3a5f]" aria-hidden="true" />
                  <span className="block text-sm font-semibold leading-snug text-[#1e3a5f]">{area.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* VEJA POR DENTRO */}
        <section id="telas" className="scroll-mt-20 overflow-hidden bg-white/60 px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${EYEBROW}`}>Veja por dentro</p>
              <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] md:text-4xl">O sistema que a sua equipe usa todo dia</h2>
              <p className={`mt-4 ${BODY}`}>Feito para o celular, simples para quem lidera e para quem é membro. Estas são telas reais do Ide Fazei.</p>
            </div>
            <div
              ref={screensRevealRef}
              className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [touch-action:pan-x] sm:gap-7 [&::-webkit-scrollbar]:hidden"
            >
              {SCREENS.map(screen => (
                <figure key={screen.src} className="reveal-on-scroll w-[min(68vw,232px)] shrink-0 snap-center">
                  <PhoneFrame src={screen.src} alt={`Tela ${screen.label} do Ide Fazei`} />
                  <figcaption className={`mt-4 text-center text-sm font-medium ${BODY}`}>{screen.label}</figcaption>
                </figure>
              ))}
            </div>
            <p className={`mt-8 text-center text-xs ${BODY}`}>Arraste para o lado para ver mais telas.</p>
          </div>
        </section>

        {/* ÁREAS */}
        <section id="areas" className="bg-white/60 px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${EYEBROW}`}>O que o sistema faz</p>
              <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] md:text-4xl">Tudo o que a rotina da igreja pede, em seis áreas</h2>
              <p className={`mt-4 ${BODY}`}>Comece pelo que a sua igreja já faz hoje. Os recursos se complementam, mas você não precisa usar todos.</p>
            </div>

            <div ref={areasRevealRef} className="grid gap-6 md:grid-cols-2">
              {AREAS.map(area => (
                <article key={area.id} id={area.id} className="reveal-on-scroll scroll-mt-24 rounded-2xl border border-[#1e3a5f]/10 bg-[#f5f0e8]/60 p-6 sm:p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]">
                      <area.icon className="h-5 w-5 text-[#c9a84c]" aria-hidden="true" />
                    </div>
                    <h3 className="font-serif text-xl font-bold leading-snug text-[#1e3a5f]">{area.title}</h3>
                  </div>
                  <p className={`mb-5 ${BODY}`}>{area.summary}</p>
                  <ul className="space-y-2.5">
                    {area.items.map(item => (
                      <li key={item} className={`flex items-start gap-2.5 text-sm leading-relaxed ${BODY}`}>
                        <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${EYEBROW}`} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PARA A REALIDADE DE CADA IGREJA */}
        <section className="px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${EYEBROW}`}>Para a realidade da sua igreja</p>
              <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] md:text-4xl">Igrejas diferentes, a mesma necessidade de cuidar bem</h2>
              <p className={`mt-4 ${BODY}`}>Pensado para igrejas de diferentes denominações, tamanhos e formas de organização, com segurança e controle de acesso.</p>
            </div>
            <div ref={fitRevealRef} className="grid gap-6 md:grid-cols-3">
              {FIT.map(item => (
                <div key={item.title} className="reveal-on-scroll rounded-2xl border border-[#1e3a5f]/10 bg-white/70 p-6">
                  <item.icon className="mb-4 h-6 w-6 text-[#1e3a5f]" aria-hidden="true" />
                  <h3 className="mb-2 font-semibold text-[#1e3a5f]">{item.title}</h3>
                  <p className={`text-sm leading-relaxed ${BODY}`}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="bg-[#1e3a5f] px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a84c]">Como funciona</p>
              <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">Do cadastro ao uso no dia a dia</h2>
            </div>
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c9a84c] text-sm font-bold text-[#1e3a5f]" aria-hidden="true">{index + 1}</span>
                    <step.icon className="h-5 w-5 text-[#c9a84c]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 font-semibold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/75">{step.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <Link href="/demo">
                <Button size="lg" className="touch-manipulation bg-[#c9a84c] px-8 font-bold text-[#1e3a5f] transition-transform hover:bg-[#b8943e] active:scale-[0.97]">
                  Ver demonstração interativa
                </Button>
              </Link>
              <p className="mt-3 text-xs text-white/60">A demonstração usa dados de exemplo.</p>
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${EYEBROW}`}>Planos</p>
              <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] md:text-4xl">Planos simples, para igrejas de diferentes tamanhos</h2>
              <p className={`mt-4 ${BODY}`}>Valores mensais, cobrados em reais (R$). Se tiver dúvida sobre qual plano combina com a sua igreja, fale com a nossa equipe.</p>
              <p className={`mt-3 inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-1.5 text-sm font-semibold ${EYEBROW}`}>
                <Gift size={16} aria-hidden="true" /> Todo plano começa com {TRIAL_DAYS} dias grátis, sem cartão de crédito
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              {PLANS.map(plan => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-7 sm:p-8 ${
                    plan.highlight ? "bg-[#1e3a5f] text-white shadow-xl ring-2 ring-[#c9a84c]" : "border border-[#1e3a5f]/10 bg-white/80"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#c9a84c] px-4 py-1 text-xs font-bold text-[#1e3a5f]">Mais escolhido</span>
                  )}
                  <h3 className={`text-xl font-bold ${plan.highlight ? "text-white" : "text-[#1e3a5f]"}`}>{plan.name}</h3>
                  <p className={`mt-1 text-sm ${plan.highlight ? "text-white/75" : BODY}`}>{plan.description}</p>
                  <p className="mt-5 flex items-baseline gap-1">
                    <span className={`font-serif text-4xl font-bold ${plan.highlight ? "text-[#c9a84c]" : "text-[#1e3a5f]"}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? "text-white/70" : BODY}`}>{plan.period}</span>
                  </p>
                  <ul className="my-7 flex-1 space-y-3">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? "text-[#c9a84c]" : EYEBROW}`} aria-hidden="true" />
                        <span className={plan.highlight ? "text-white/85" : BODY}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {planButton(plan)}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PERGUNTAS FREQUENTES */}
        <section id="perguntas" className="bg-white/60 px-4 py-20 sm:px-6 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${EYEBROW}`}>Perguntas frequentes</p>
              <h2 className="font-serif text-3xl font-bold text-[#1e3a5f] md:text-4xl">Tire as suas dúvidas</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map(item => (
                <details key={item.q} className="group rounded-xl border border-[#1e3a5f]/10 bg-[#f5f0e8]/70 p-5 open:bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#1e3a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className={`mt-3 text-sm leading-relaxed ${BODY}`}>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FECHAMENTO */}
        <section className="relative overflow-hidden bg-[#1e3a5f] px-4 py-20 sm:px-6 md:py-24">
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">Pronto para dar mais atenção a cada pessoa?</h2>
            <p className="mt-4 text-lg text-white/75">Cadastre a sua igreja e organize o cuidado, o ensino, as equipes e as finanças em um só lugar. {TRIAL_DAYS} dias grátis, sem cartão.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cadastro-igreja">
                <Button size="lg" className="w-full touch-manipulation bg-[#c9a84c] px-10 text-base font-bold text-[#1e3a5f] transition-transform hover:bg-[#b8943e] active:scale-[0.97] sm:w-auto">
                  Cadastrar minha igreja <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contato">
                <Button size="lg" variant="outline" className="w-full touch-manipulation border-white/40 bg-transparent px-10 text-base text-white transition-transform hover:bg-white/10 hover:text-white active:scale-[0.97] sm:w-auto">
                  Falar com a equipe
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CONTATO */}
        <section id="contato" className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-serif text-2xl font-bold text-[#1e3a5f] md:text-3xl">Fale conosco</h2>
            <p className={`mb-8 mt-3 ${BODY}`}>Tem dúvidas? Nossa equipe está pronta para ajudar.</p>
            <div className={`flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm ${BODY}`}>
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#1e3a5f]">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp {formatBrazilianPhone(contact.whatsapp)}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:+55${contact.phone}`} className="flex items-center gap-2 hover:text-[#1e3a5f]">
                  <Phone size={16} aria-hidden="true" /> {formatBrazilianPhone(contact.phone)}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-[#1e3a5f]">
                  <Mail size={16} aria-hidden="true" /> {contact.email}
                </a>
              )}
              {contact.address && (
                <span className="flex items-center gap-2"><MapPin size={16} aria-hidden="true" /> {contact.address}</span>
              )}
              <Link href="/contato" className="flex items-center gap-2 hover:text-[#1e3a5f]">
                <Send size={16} aria-hidden="true" /> Enviar mensagem
              </Link>
            </div>
            {contact.businessHours && <p className="mt-6 whitespace-pre-line text-xs text-[#1e3a5f]/70">{contact.businessHours}</p>}
          </div>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer className="bg-[#14283f] px-4 py-10 text-white/70 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#c9a84c]" aria-hidden="true">
              <span className="text-xs font-bold text-[#1e3a5f]">✦</span>
            </div>
            <span className="font-semibold text-white">Ide Fazei</span>
          </div>
          <div className="text-center text-sm">
            <p>© {new Date().getFullYear()} {contact.legalName || "Ide Fazei"}. Todos os direitos reservados.</p>
            {contact.cnpj && <p className="mt-1 text-xs">CNPJ {formatCnpj(contact.cnpj)}</p>}
            <p className="mt-1 text-xs">Já é cliente? Acesse o endereço da sua igreja: <span className="text-white/90">nomedasuaigreja.idefazei.com.br</span></p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {socialLinks.map(key => (
              <a key={key} href={contact.social[key]} target="_blank" rel="noopener noreferrer" className="hover:text-white">{SOCIAL_LABELS[key]}</a>
            ))}
            <Link href="/termos" className="hover:text-white">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link href="/contato" className="hover:text-white">Fale conosco</Link>
          </div>
        </div>
      </footer>

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com a equipe pelo WhatsApp"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-50 flex touch-manipulation select-none items-center gap-2 rounded-full bg-[#1f8f4e] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#177a41] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f8f4e]"
        >
          <MessageCircle size={20} aria-hidden="true" />
          <span className="hidden sm:inline">Falar no WhatsApp</span>
        </a>
      )}
    </div>
  );
}
