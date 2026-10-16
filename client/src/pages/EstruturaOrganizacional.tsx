import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Network, UserRound, Users } from "lucide-react";

export default function EstruturaOrganizacional() {
  const { churchId } = useChurch();
  const { data: ministries = [], isLoading } = trpc.ministries.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  return <div className="p-6 max-w-5xl mx-auto space-y-6">
    <div><p className="eyebrow">Estrutura da igreja</p><h1 className="font-display text-3xl text-navy">Ministérios e responsáveis</h1><p className="text-muted-foreground mt-1">Uma visão das equipes, lideranças definidas e participantes ativos.</p></div>
    {isLoading ? <div className="grid sm:grid-cols-2 gap-4">{[1,2,3,4].map((item) => <div key={item} className="card-sacred h-36 animate-pulse" />)}</div> : ministries.length === 0 ? <div className="card-sacred p-10 text-center"><Network className="w-10 h-10 text-gold mx-auto mb-3" /><p className="font-semibold text-navy">Nenhum Ministério cadastrado</p><p className="text-sm text-muted-foreground">Cadastre Ministérios para formar a estrutura organizacional.</p></div> : <div className="grid sm:grid-cols-2 gap-4">{ministries.map((ministry: any) => <div key={ministry.id} className="card-sacred p-5 space-y-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-navy">{ministry.name}</h2><p className="text-sm text-muted-foreground">{ministry.description || "Sem descrição"}</p></div><Badge variant="outline">{ministry.memberCount ?? 0} pessoas</Badge></div><div className="flex items-center gap-2 rounded-lg bg-cream-dark/50 p-3"><UserRound className="w-4 h-4 text-gold" /><div><p className="text-xs text-muted-foreground">Responsável</p><p className="text-sm font-medium text-navy">{ministry.leaderName || "A definir"}</p></div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="w-4 h-4" />Funções e participantes são geridos no detalhe do Ministério.</div></div>)}</div>}
  </div>;
}
