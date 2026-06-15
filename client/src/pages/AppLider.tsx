import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Heart, Star, CheckCircle2, Clock, AlertCircle,
  Phone, MapPin, TrendingUp, UserPlus, BookOpen
} from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  "Nova Alma": "bg-orange-100 text-orange-700",
  "Consolidação": "bg-yellow-100 text-yellow-700",
  "Fundamentos": "bg-blue-100 text-blue-700",
  "Célula": "bg-green-100 text-green-700",
  "Batismo": "bg-purple-100 text-purple-700",
  "Encontro com Deus": "bg-pink-100 text-pink-700",
  "Escola de Líderes": "bg-indigo-100 text-indigo-700",
  "Liderança": "bg-teal-100 text-teal-700",
  "Multiplicador": "bg-[#c9a84c]/10 text-[#c9a84c]",
};

export default function AppLider() {
  const { churchId } = useChurch();
  const [activeTab, setActiveTab] = useState("celula");

  const { data: cells, isLoading: loadingCells } = trpc.cells.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const { data: souls, isLoading: loadingSouls } = trpc.souls.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const { data: consolidations, isLoading: loadingConsolidations } = trpc.consolidation.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const { data: people, isLoading: loadingPeople } = trpc.people.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });

  // Estatísticas rápidas do líder
  const myCell = cells?.[0];
  const pendingConsolidations = consolidations?.filter((c: { status?: string | null }) => c.status !== "completed") ?? [];
  const recentSouls = souls?.slice(0, 5) ?? [];

  const updateConsolidation = trpc.consolidation.updateChecklist.useMutation({
    onSuccess: () => toast.success("Consolidação atualizada!"),
    onError: () => toast.error("Erro ao atualizar."),
  });

  return (
    <div className="space-y-6">
      {/* Header do Líder */}
      <div className="bg-gradient-to-br from-[#1e3a5f] via-[#2a4f7a] to-[#1e3a5f] rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Decoração */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#c9a84c]/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold">App do Líder</h1>
              <p className="text-white/50 text-xs">Visão simplificada para líderes de célula</p>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Membros na Célula", value: loadingCells ? "—" : (myCell ? "—" : "0"), icon: Users },
              { label: "Consolidações Pendentes", value: loadingConsolidations ? "—" : pendingConsolidations.length, icon: Clock },
              { label: "Novas Almas", value: loadingSouls ? "—" : recentSouls.length, icon: Heart },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                <Icon className="w-5 h-5 text-[#c9a84c] mx-auto mb-1" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-white/40 text-[10px] leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#1e3a5f]/10 p-1 rounded-xl w-full">
          {[
            { id: "celula", label: "Minha Célula", icon: Users },
            { id: "consolidacoes", label: "Consolidações", icon: CheckCircle2 },
            { id: "novas-almas", label: "Novas Almas", icon: Heart },
            { id: "membros", label: "Membros", icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex-1 flex items-center justify-center gap-1.5 data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white rounded-lg py-2 text-xs"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Minha Célula */}
        <TabsContent value="celula" className="mt-4">
          {loadingCells ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : myCell ? (
            <Card className="border-[#1e3a5f]/10">
              <CardHeader>
                <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#c9a84c]" />
                  {(myCell as { name: string }).name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: MapPin, label: "Endereço", value: (myCell as { address?: string | null }).address ?? "—" },
                  { icon: Clock, label: "Horário", value: (myCell as { meetingDay?: string | null; meetingTime?: string | null }).meetingDay ? `${(myCell as { meetingDay?: string | null }).meetingDay} às ${(myCell as { meetingTime?: string | null }).meetingTime ?? "—"}` : "—" },
                  { icon: TrendingUp, label: "Capacidade", value: `${(myCell as { currentMembers?: number | null }).currentMembers ?? 0} / ${(myCell as { maxCapacity?: number | null }).maxCapacity ?? "—"} membros` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f0e8]/50">
                    <Icon className="w-4 h-4 text-[#c9a84c] shrink-0" />
                    <div>
                      <p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider">{label}</p>
                      <p className="text-[#1e3a5f] text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
                <Button className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white mt-2">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Registrar Presença
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-[#1e3a5f]/20 mx-auto mb-3" />
              <p className="text-[#1e3a5f]/40 text-sm">Nenhuma célula atribuída</p>
              <p className="text-[#1e3a5f]/30 text-xs mt-1">Solicite ao pastor que atribua uma célula ao seu perfil</p>
            </div>
          )}
        </TabsContent>

        {/* Consolidações */}
        <TabsContent value="consolidacoes" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#c9a84c]" />
                Consolidações Pendentes
                {pendingConsolidations.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 ml-auto">
                    {pendingConsolidations.length} pendentes
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConsolidations ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3" />)
              ) : pendingConsolidations.length > 0 ? (
                <div className="space-y-3">
                  {pendingConsolidations.map((c: { id: number; personId?: number | null; phoneCalled?: boolean | null; visited?: boolean | null; bibleGiven?: boolean | null; cellInvited?: boolean | null; status?: string | null }) => (
                    <div key={c.id} className="p-4 rounded-xl border border-[#1e3a5f]/10 bg-[#f5f0e8]/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#1e3a5f] font-semibold text-sm">Consolidação #{c.id}</p>
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Pendente</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { key: "phoneCalled", label: "Ligação", done: c.phoneCalled },
                          { key: "visited", label: "Visita", done: c.visited },
                          { key: "bibleGiven", label: "Bíblia", done: c.bibleGiven },
                          { key: "cellInvited", label: "Célula", done: c.cellInvited },
                        ].map(({ key, label, done }) => (
                          <button
                            key={key}
                            onClick={() => updateConsolidation.mutate({ id: c.id, churchId: churchId!, [key === "phoneCalled" ? "callMade" : key === "visited" ? "visitMade" : key === "bibleGiven" ? "bibleDelivered" : "addedToCell"]: !done })}
                            className={`p-2 rounded-lg text-center text-xs font-medium transition-all ${
                              done
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-white border border-[#1e3a5f]/10 text-[#1e3a5f]/50 hover:bg-[#1e3a5f]/5"
                            }`}
                          >
                            {done ? <CheckCircle2 className="w-4 h-4 mx-auto mb-0.5" /> : <AlertCircle className="w-4 h-4 mx-auto mb-0.5 opacity-40" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/60 text-sm font-medium">Tudo em dia!</p>
                  <p className="text-[#1e3a5f]/30 text-xs mt-1">Nenhuma consolidação pendente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Novas Almas */}
        <TabsContent value="novas-almas" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#c9a84c]" />
                Novas Almas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSouls ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-3" />)
              ) : recentSouls.length > 0 ? (
                <div className="space-y-3">
                  {recentSouls.map((soul: { id: number; personId?: number | null; origin?: string | null; conversionDate?: Date | null; status?: string | null }) => (
                    <div key={soul.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#1e3a5f]/10">
                      <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 text-[#c9a84c]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#1e3a5f] font-semibold text-sm">Alma #{soul.id}</p>
                        <p className="text-[#1e3a5f]/40 text-xs">
                          {soul.origin ?? "Origem não informada"} •{" "}
                          {soul.conversionDate ? new Date(soul.conversionDate).toLocaleDateString("pt-BR") : "Data não informada"}
                        </p>
                      </div>
                      <Badge className={`text-xs ${soul.status === "consolidado" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {soul.status ?? "Nova"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhuma nova alma registrada</p>
                  <Button size="sm" className="mt-4 bg-[#c9a84c] hover:bg-[#b8963e] text-white">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Registrar Nova Alma
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Membros */}
        <TabsContent value="membros" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#c9a84c]" />
                Membros sob Cuidado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPeople ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full mb-2" />)
              ) : people && people.length > 0 ? (
                <div className="space-y-2">
                  {people.slice(0, 10).map((person: { id: number; fullName: string; phone?: string | null; discipleshipStage?: string | null }) => (
                    <div key={person.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f5f0e8]/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#1e3a5f] font-bold text-xs">
                          {person.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1e3a5f] font-medium text-sm truncate">{person.fullName}</p>
                        {person.phone && (
                          <p className="text-[#1e3a5f]/40 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {person.phone}
                          </p>
                        )}
                      </div>
                      {person.discipleshipStage && (
                        <Badge className={`text-[10px] shrink-0 ${STAGE_COLORS[person.discipleshipStage] ?? "bg-gray-100 text-gray-600"}`}>
                          {person.discipleshipStage}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum membro cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
