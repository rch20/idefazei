import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Search, User, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STAGES_LABELS: Record<string, string> = {
  nova_alma: "Nova Alma",
  consolidacao: "Consolidação",
  fundamentos: "Fundamentos",
  celula: "Célula",
  batismo: "Batismo",
  encontro_com_deus: "Encontro com Deus",
  escola_de_lideres: "Escola de Líderes",
  lideranca: "Liderança",
  multiplicador: "Multiplicador",
};

const STAGE_BADGE: Record<string, string> = {
  nova_alma: "badge-nova-alma",
  consolidacao: "badge-consolidacao",
  fundamentos: "badge-fundamentos",
  celula: "badge-celula",
  batismo: "badge-batismo",
  encontro_com_deus: "badge-encontro",
  escola_de_lideres: "badge-escola",
  lideranca: "badge-lideranca",
  multiplicador: "badge-multiplicador",
};

const defaultForm = {
  fullName: "",
  cpf: "",
  rg: "",
  birthDate: "",
  gender: "" as any,
  maritalStatus: "" as any,
  profession: "",
  education: "",
  phone: "",
  whatsapp: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  conversionDate: "",
  baptismDate: "",
  previousChurch: "",
  pastoralNotes: "",
  discipleshipStage: "nova_alma" as any,
};

export default function Pessoas() {
  const { churchId } = useChurch();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);

  const { data: people, isLoading, refetch } = trpc.people.list.useQuery({ churchId, search: search || undefined });
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Pessoa cadastrada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: () => toast.error("Erro ao cadastrar pessoa"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = { churchId, ...form };
    Object.keys(data).forEach((k) => {
      if (data[k] === "") data[k] = undefined;
    });
    createPerson.mutate(data);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Pessoas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastro completo de membros e visitantes
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Nova Pessoa
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {Object.entries(STAGES_LABELS).slice(0, 5).map(([key, label]) => {
          const count = (people ?? []).filter((p) => p.discipleshipStage === key).length;
          return (
            <div key={key} className="card-sacred p-3 text-center">
              <p className="text-xl font-bold font-display text-navy">{count}</p>
              <p className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-1 ${STAGE_BADGE[key]}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (people ?? []).length === 0 ? (
        <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-navy/10 flex items-center justify-center">
            <Users className="w-7 h-7 text-navy" />
          </div>
          <p className="font-semibold text-navy">Nenhuma pessoa cadastrada</p>
          <p className="text-sm text-muted-foreground">Cadastre a primeira pessoa da sua igreja</p>
        </div>
      ) : (
        <div className="space-y-2 animate-stagger">
          {(people ?? []).map((person) => (
            <div key={person.id} className="card-sacred p-4 flex items-center gap-4 hover:border-gold/30 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.fullName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-navy">{person.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy">{person.fullName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {person.phone && <span className="text-xs text-muted-foreground">{person.phone}</span>}
                  {person.email && <span className="text-xs text-muted-foreground hidden sm:block">{person.email}</span>}
                  {person.city && <span className="text-xs text-muted-foreground hidden md:block">{person.city}/{person.state}</span>}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STAGE_BADGE[person.discipleshipStage ?? "nova_alma"]}`}>
                {STAGES_LABELS[person.discipleshipStage ?? "nova_alma"]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <User className="w-5 h-5" />
              Cadastrar Pessoa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
                <TabsTrigger value="contato">Contato</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="espiritual">Espiritual</TabsTrigger>
              </TabsList>

              <TabsContent value="pessoal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>RG</Label>
                    <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado Civil</Label>
                    <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                        <SelectItem value="uniao_estavel">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Profissão</Label>
                    <Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                  </div>
                  <div>
                    <Label>Escolaridade</Label>
                    <Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="col-span-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CEP</Label>
                    <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="00000-000" />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Rua</Label>
                    <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="SP" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="espiritual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Conversão</Label>
                    <Input type="date" value={form.conversionDate} onChange={(e) => setForm({ ...form, conversionDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data do Batismo</Label>
                    <Input type="date" value={form.baptismDate} onChange={(e) => setForm({ ...form, baptismDate: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Igreja Anterior</Label>
                    <Input value={form.previousChurch} onChange={(e) => setForm({ ...form, previousChurch: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Etapa no Funil</Label>
                    <Select value={form.discipleshipStage} onValueChange={(v) => setForm({ ...form, discipleshipStage: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGES_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Observações Pastorais</Label>
                    <Textarea value={form.pastoralNotes} onChange={(e) => setForm({ ...form, pastoralNotes: e.target.value })} rows={3} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createPerson.isPending}>
                {createPerson.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
