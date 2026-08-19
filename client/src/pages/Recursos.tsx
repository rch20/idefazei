import { Link } from "wouter";
import { ArrowLeft, Users, Heart, BookOpen, MapPin, Calendar, Bell, BarChart3, Shield, Smartphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULES = [
  {
    category: "Ciclo de Discipulado",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    bgIcon: "bg-blue-100",
    items: [
      { icon: Heart, name: "Ganhar Almas", desc: "Registre novas conversões com origem, quem ganhou a pessoa, data e status inicial. Acompanhe cada nova alma desde o primeiro contato." },
      { icon: BookOpen, name: "Consolidação", desc: "Checklist interativo de acompanhamento: ligação, visita, Bíblia, célula, oração. Controle de datas e status de cada etapa." },
      { icon: BarChart3, name: "Funil de Discipulado", desc: "Kanban visual com 9 etapas: Nova Alma → Consolidação → Fundamentos → Célula → Batismo → Encontro com Deus → Escola de Líderes → Liderança → Multiplicador." },
    ],
  },
  {
    category: "Gestão de Pessoas",
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
    bgIcon: "bg-purple-100",
    items: [
      { icon: Users, name: "Cadastro de Pessoas", desc: "Dados completos em 4 abas: pessoal (nome, nascimento, gênero), contato (telefone, email, redes), endereço e dados espirituais (conversão, batismo, célula)." },
      { icon: Users, name: "Gestão de Famílias", desc: "Defina pai, mãe e filhos. Visualize o núcleo familiar completo e acompanhe o envolvimento espiritual de cada membro da família." },
      { icon: Shield, name: "Hierarquia de Perfis", desc: "9 perfis distintos: Pastor Presidente, Pastor Local, Supervisor, Líder, Consolidador, Diácono, Secretário, Tesoureiro e Membro." },
    ],
  },
  {
    category: "Células e Territórios",
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    bgIcon: "bg-green-100",
    items: [
      { icon: MapPin, name: "Gestão de Células", desc: "Cadastro completo com líder, supervisor, anfitrião, endereço e horário. Controle de membros, visitantes e presença por reunião." },
      { icon: Globe, name: "Mapa Geográfico", desc: "Visualize todas as células no mapa. Identifique regiões descobertas, concentração de membros e oportunidades de expansão territorial." },
    ],
  },
  {
    category: "Dashboard e Inteligência",
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    bgIcon: "bg-amber-100",
    items: [
      { icon: BarChart3, name: "Dashboard Executivo", desc: "6 KPIs em tempo real: total de membros, novas almas, células ativas, líderes, conversões do mês e taxa de consolidação." },
      { icon: Shield, name: "Radar Espiritual", desc: "Identifique automaticamente pessoas em risco: sem célula, sem consolidação, sem discipulador ou afastadas há mais de 30 dias." },
      { icon: Users, name: "Árvore de Discipulado", desc: "Visualize a cadeia de discipulado: quem discipulou quem, quantas gerações espirituais e o impacto de cada líder na multiplicação." },
    ],
  },
  {
    category: "Eventos e Ministérios",
    color: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-600",
    bgIcon: "bg-rose-100",
    items: [
      { icon: Calendar, name: "Eventos", desc: "Cadastro de eventos com inscrição online, controle de vagas e check-in por QR Code. Notificações automáticas para inscritos." },
      { icon: Users, name: "Ministérios", desc: "Gerencie todos os ministérios da igreja com membros, líder responsável e atividades. Controle de participação e histórico." },
      { icon: Calendar, name: "Escalas", desc: "Calendário visual de escalas por ministério. Defina responsáveis para cada função em cada data e envie notificações automáticas." },
    ],
  },
  {
    category: "Comunicação",
    color: "bg-sky-50 border-sky-200",
    iconColor: "text-sky-600",
    bgIcon: "bg-sky-100",
    items: [
      { icon: Bell, name: "Mural de Avisos", desc: "Publique comunicados, avisos e notícias para toda a congregação. Controle de visualizações e prioridade de exibição." },
      { icon: Heart, name: "Pedidos de Oração", desc: "Membros enviam pedidos de oração que chegam à equipe de intercessão. Registre testemunhos e respostas de oração." },
      { icon: Smartphone, name: "Portal do Visitante", desc: "Acesso público sem login. Visitantes podem solicitar oração, visita pastoral, registrar primeira visita ou demonstrar interesse em participar." },
    ],
  },
  {
    category: "Administração",
    color: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-600",
    bgIcon: "bg-slate-100",
    items: [
      { icon: BookOpen, name: "Biblioteca Digital", desc: "Repositório de materiais, estudos e recursos para a liderança. Organizado por categoria com busca e filtros." },
      { icon: Shield, name: "Configurações da Igreja", desc: "Personalize a identidade visual (logo, cores, nome), dados institucionais e configurações de cada módulo." },
      { icon: Globe, name: "Multi-Tenant", desc: "Cada igreja tem seu próprio subdomínio exclusivo com dados completamente isolados. Identidade visual personalizada por tenant." },
    ],
  },
];

export default function Recursos() {
  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Sacred geometry background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10%" cy="50%" r="400" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="90%" cy="50%" r="350" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#1e3a5f]/10 bg-[#f5f0e8]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <span className="text-[#c9a84c] text-sm font-bold">✦</span>
              </div>
              <div>
                <div className="font-serif font-bold text-[#1e3a5f] text-lg leading-none">Ide Fazei</div>
                <div className="text-[10px] tracking-[0.2em] text-[#c9a84c] uppercase">Plataforma Ministerial</div>
              </div>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[#1e3a5f]/60 hover:text-[#1e3a5f]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 mb-6">
            <span className="text-[#c9a84c] text-xs tracking-widest uppercase font-medium">Funcionalidades</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
            Tudo que sua igreja precisa<br />em uma única plataforma
          </h1>
          <p className="font-serif italic text-[#1e3a5f]/60 text-lg max-w-2xl mx-auto">
            Mais de 30 módulos integrados cobrindo todo o ciclo ministerial: Ganhar, Consolidar, Discipular, Formar, Enviar e Multiplicar.
          </p>
        </div>

        <div className="space-y-12">
          {MODULES.map((mod) => (
            <div key={mod.category}>
              <h2 className="font-serif text-2xl font-bold text-[#1e3a5f] mb-6 flex items-center gap-3">
                <span className="w-8 h-0.5 bg-[#c9a84c]" />
                {mod.category}
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {mod.items.map(({ icon: Icon, name, desc }) => (
                  <div key={name} className={`bg-white rounded-xl p-6 border ${mod.color} hover:shadow-sm transition-shadow`}>
                    <div className={`w-10 h-10 rounded-xl ${mod.bgIcon} flex items-center justify-center mb-4`}>
                      <Icon className={`w-5 h-5 ${mod.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-[#1e3a5f] mb-2">{name}</h3>
                    <p className="text-[#1e3a5f]/60 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-[#1e3a5f] rounded-2xl p-12">
          <h2 className="font-serif text-3xl font-bold text-white mb-4">Pronto para transformar sua gestão ministerial?</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Comece gratuitamente por 14 dias. Sem cartão de crédito, sem compromisso.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/cadastro-igreja">
              <Button className="bg-[#c9a84c] hover:bg-[#b8943d] text-white px-8">
                Cadastrar minha igreja
              </Button>
            </Link>
            <Link href="/planos">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent px-8">
                Ver planos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
