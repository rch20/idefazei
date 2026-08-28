import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Heart, BookOpen, MapPin, Calendar, Bell, Star,
  Phone, Mail, Home, Church, CheckCircle2, Clock, AlertCircle
} from "lucide-react";

const DISCIPLESHIP_STAGES = [
  "Nova Alma", "Consolidação", "Fundamentos", "Célula",
  "Batismo", "Encontro com Deus", "Escola de Líderes", "Liderança", "Multiplicador"
];

export default function AreaMembro() {
  const { churchId, accessSummary } = useChurch();
  const [activeTab, setActiveTab] = useState("perfil");

  const { data: member, isLoading: loadingPeople } = trpc.people.getById.useQuery(
    { churchId: churchId!, id: accessSummary?.actorPersonId ?? 0 },
    { enabled: Boolean(churchId && accessSummary?.actorPersonId) },
  );
  const { data: events, isLoading: loadingEvents } = trpc.events.list.useQuery({ churchId: churchId! }, { enabled: !!churchId });
  const { data: publicSite, isLoading: loadingAnnouncements } = trpc.tenantPublic.current.useQuery(undefined, { enabled: !!churchId, staleTime: 60_000 });
  const announcements = publicSite?.publicAnnouncements ?? [];
  const { data: prayers, isLoading: loadingPrayers } = trpc.prayer.mine.useQuery({ churchId: churchId! }, { enabled: !!churchId });

  const currentStageIndex = member?.discipleshipStage
    ? DISCIPLESHIP_STAGES.indexOf(member.discipleshipStage)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header do membro */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4f7a] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#c9a84c]/20 border-2 border-[#c9a84c]/50 flex items-center justify-center">
            <User className="w-8 h-8 text-[#c9a84c]" />
          </div>
          <div className="flex-1">
            {loadingPeople ? (
              <Skeleton className="h-6 w-40 bg-white/20 mb-2" />
            ) : (
              <>
                <h1 className="font-serif text-2xl font-bold">{member?.fullName ?? "Membro"}</h1>
                <p className="text-white/60 text-sm">{member?.email ?? "Sem email cadastrado"}</p>
              </>
            )}
          </div>
          {member?.discipleshipStage && (
            <Badge className="bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/30 text-xs">
              {member.discipleshipStage}
            </Badge>
          )}
        </div>

        {/* Progresso no funil */}
        {member?.discipleshipStage && (
          <div className="mt-5">
            <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Jornada de Discipulado</p>
            <div className="flex gap-1">
              {DISCIPLESHIP_STAGES.map((stage, i) => (
                <div
                  key={stage}
                  title={stage}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    i <= currentStageIndex ? "bg-[#c9a84c]" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-white/30 text-[10px]">Nova Alma</span>
              <span className="text-[#c9a84c] text-[10px] font-medium">{member.discipleshipStage}</span>
              <span className="text-white/30 text-[10px]">Multiplicador</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#1e3a5f]/10 p-1 rounded-xl">
          {[
            { id: "perfil", label: "Meu Perfil", icon: User },
            { id: "eventos", label: "Eventos", icon: Calendar },
            { id: "avisos", label: "Avisos", icon: Bell },
            { id: "oracao", label: "Oração", icon: Heart },
          ].map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex items-center gap-2 data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white rounded-lg px-4 py-2 text-sm"
            >
              <Icon className="w-4 h-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-[#1e3a5f]/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-[#c9a84c]" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPeople ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                ) : member ? (
                  <>
                    {[
                      { icon: User, label: "Nome", value: member.fullName },
                      { icon: Mail, label: "Email", value: member.email ?? "—" },
                      { icon: Phone, label: "Telefone", value: member.phone ?? "—" },
                      { icon: Home, label: "Bairro", value: member.neighborhood ?? "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/5 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#1e3a5f]/50" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider">{label}</p>
                          <p className="text-[#1e3a5f] text-sm font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-[#1e3a5f]/40 text-sm text-center py-4">Nenhum dado encontrado</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#1e3a5f]/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#1e3a5f] font-serif text-base flex items-center gap-2">
                  <Church className="w-4 h-4 text-[#c9a84c]" />
                  Dados Espirituais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPeople ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                ) : member ? (
                  <>
                    {[
                      { icon: Star, label: "Etapa no Funil", value: member.discipleshipStage ?? "Nova Alma" },
                      { icon: CheckCircle2, label: "Batizado", value: member.baptismDate ? `Sim — ${new Date(member.baptismDate).toLocaleDateString("pt-BR")}` : "Não" },
                      { icon: Heart, label: "Data de Conversão", value: member.conversionDate ? new Date(member.conversionDate).toLocaleDateString("pt-BR") : "—" },
                      { icon: MapPin, label: "Igreja Anterior", value: member.previousChurch ?? "—" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#c9a84c]" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider">{label}</p>
                          <p className="text-[#1e3a5f] text-sm font-medium">{value}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-[#1e3a5f]/40 text-sm text-center py-4">Nenhum dado espiritual cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Eventos */}
        <TabsContent value="eventos" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#c9a84c]" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-3" />)
              ) : events && events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event: { id: number; name: string; description?: string | null; eventDate?: Date | null; location?: string | null; maxAttendees?: number | null }) => (
                    <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#1e3a5f]/10 hover:bg-[#1e3a5f]/5 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-[#1e3a5f]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1e3a5f] text-sm">{event.name}</h3>
                        {event.eventDate && (
                          <p className="text-[#1e3a5f]/50 text-xs mt-0.5">
                            {new Date(event.eventDate).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-[#1e3a5f]/40 text-xs flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                      </div>
                      <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs">
                        Inscrever-se
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum evento programado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avisos */}
        <TabsContent value="avisos" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#c9a84c]" />
                Mural de Avisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnnouncements ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3" />)
              ) : announcements && announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className={`p-4 rounded-xl border ${ann.pinned ? "border-amber-200 bg-amber-50" : "border-[#1e3a5f]/10 bg-[#f5f0e8]/30"}`}>
                      <div className="flex items-start gap-3">
                        {ann.pinned ? (
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="w-5 h-5 text-[#c9a84c] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h3 className="font-semibold text-[#1e3a5f] text-sm">{ann.title}</h3>
                          <p className="text-[#1e3a5f]/60 text-xs mt-1 leading-relaxed">{ann.content}</p>
                          <p className="text-[#1e3a5f]/30 text-[10px] mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ann.publishedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum aviso publicado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oração */}
        <TabsContent value="oracao" className="mt-4">
          <Card className="border-[#1e3a5f]/10">
            <CardHeader>
              <CardTitle className="text-[#1e3a5f] font-serif flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#c9a84c]" />
                Meus Pedidos de Oração
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrayers ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-3" />)
              ) : prayers && prayers.length > 0 ? (
                <div className="space-y-3">
                  {prayers.map((prayer: { id: number; content: string; type: string; answered: boolean | null; visitorName?: string | null; createdAt: Date }) => (
                    <div key={prayer.id} className="p-4 rounded-xl border border-[#1e3a5f]/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1e3a5f] text-sm">{prayer.type === "testemunho" ? "Testemunho" : "Pedido de Oração"}</h3>
                          <p className="text-[#1e3a5f]/50 text-xs mt-1 leading-relaxed">{prayer.content}</p>
                          <p className="text-[#1e3a5f]/30 text-[10px] mt-2">
                            {new Date(prayer.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Badge className={`text-xs shrink-0 ${prayer.answered ? "bg-green-100 text-green-700" : "bg-[#c9a84c]/10 text-[#c9a84c]"}`}>
                          {prayer.answered ? "Respondida" : "Em oração"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-10 h-10 text-[#1e3a5f]/20 mx-auto mb-3" />
                  <p className="text-[#1e3a5f]/40 text-sm">Nenhum pedido de oração registrado</p>
                  <Button size="sm" className="mt-4 bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
                    Enviar pedido de oração
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
