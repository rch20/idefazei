// Ambiente de demonstração (demo.idefazei.com.br).
// Cria/atualiza uma igreja fictícia completa, com login funcionando e plano liberado,
// para que um possível cliente navegue pelo sistema real. Idempotente: pode ser
// re-executado (gatilho do super-admin e reset noturno) para "zerar" a demonstração.

import { and, eq, inArray } from "drizzle-orm";
import { getDb, createChurch } from "./db";
import { createChurchUser } from "./auth";
import {
  churches, people, churchUsers, ministries, ministryMembers,
  cells, cellMembers, events, announcements,
} from "../drizzle/schema";

export const DEMO_SLUG = "demo";
export const DEMO_PASSWORD = "demo1234";
const FAR_FUTURE = new Date("2099-01-01T00:00:00Z");
const DAY = 86400000;

type PersonSeed = {
  fullName: string;
  gender?: "masculino" | "feminino";
  stage?: typeof people.$inferInsert["discipleshipStage"];
  whatsapp?: string;
  baptismDate?: string | null;
  conversionDate?: string | null;
  neighborhood?: string;
};

export async function seedDemoTenant() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  const branding = {
    name: "Igreja Modelo",
    primaryColor: "#1e3a5f",
    secondaryColor: "#c9a84c",
    city: "São Paulo",
    state: "SP",
    phone: "(11) 4000-0000",
    whatsapp: "(11) 90000-0000",
    email: "contato@demo.idefazei.com.br",
    website: "https://demo.idefazei.com.br",
    logoUrl: "/demo-church-logo.png",
    vision: "Uma igreja que cuida de cada pessoa, do primeiro contato à liderança.",
    mission: "Fazer discípulos que fazem discípulos.",
    values: "Amor, excelência, discipulado e comunhão.",
    billingPlan: "enterprise" as const,
    paidUntil: FAR_FUTURE,
    active: true,
    publicRegistrationEnabled: true,
  };

  // 1) Garante a igreja demo (cria ou atualiza o branding/plano)
  const existing = (await db.select().from(churches).where(eq(churches.slug, DEMO_SLUG)).limit(1))[0];
  let churchId: number;
  if (existing) {
    churchId = existing.id;
    await db.update(churches).set(branding).where(eq(churches.id, churchId));
  } else {
    const created = await createChurch({ slug: DEMO_SLUG, ...branding });
    churchId = created.id;
  }

  // 2) Limpa os dados anteriores do demo (reset)
  const cellIds = (await db.select({ id: cells.id }).from(cells).where(eq(cells.churchId, churchId))).map((r) => r.id);
  const minIds = (await db.select({ id: ministries.id }).from(ministries).where(eq(ministries.churchId, churchId))).map((r) => r.id);
  if (cellIds.length) await db.delete(cellMembers).where(inArray(cellMembers.cellId, cellIds));
  if (minIds.length) await db.delete(ministryMembers).where(inArray(ministryMembers.ministryId, minIds));
  await db.delete(cells).where(eq(cells.churchId, churchId));
  await db.delete(ministries).where(eq(ministries.churchId, churchId));
  await db.delete(events).where(eq(events.churchId, churchId));
  await db.delete(announcements).where(eq(announcements.churchId, churchId));
  await db.delete(churchUsers).where(eq(churchUsers.churchId, churchId));
  await db.delete(people).where(eq(people.churchId, churchId));

  // 3) Pessoas
  async function addPerson(p: PersonSeed): Promise<number> {
    const res = await db!.insert(people).values({
      churchId,
      fullName: p.fullName,
      gender: p.gender ?? null,
      discipleshipStage: p.stage ?? "nova_alma",
      whatsapp: p.whatsapp ?? null,
      baptismDate: p.baptismDate ? new Date(`${p.baptismDate}T12:00:00.000Z`) : null,
      conversionDate: p.conversionDate ? new Date(`${p.conversionDate}T12:00:00.000Z`) : null,
      neighborhood: p.neighborhood ?? null,
      city: "São Paulo",
      state: "SP",
      declaredBaptized: false,
    });
    return Number((res[0] as { insertId?: number })?.insertId ?? 0);
  }

  const marcos = await addPerson({ fullName: "Marcos Lima", gender: "masculino", stage: "lideranca", whatsapp: "11990000001", baptismDate: "2012-04-08", neighborhood: "Saúde" });
  const priscila = await addPerson({ fullName: "Priscila Alves", gender: "feminino", stage: "lideranca", whatsapp: "11990000002", baptismDate: "2014-11-02", neighborhood: "Vila Mariana" });
  const rafael = await addPerson({ fullName: "Rafael Costa", gender: "masculino", stage: "lideranca", whatsapp: "11990000003", baptismDate: "2016-06-19", neighborhood: "Centro" });
  const ana = await addPerson({ fullName: "Ana Souza", gender: "feminino", stage: "lideranca", whatsapp: "11990000004", baptismDate: "2017-09-10", neighborhood: "Moema" });
  const joana = await addPerson({ fullName: "Joana Martins", gender: "feminino", stage: "lideranca", whatsapp: "11990000005", baptismDate: "2015-03-15", neighborhood: "Saúde" });

  const pedro = await addPerson({ fullName: "Pedro Reis", gender: "masculino", stage: "escola_de_lideres", whatsapp: "11990000011", baptismDate: "2019-05-05", neighborhood: "Centro" });
  const carla = await addPerson({ fullName: "Carla Dias", gender: "feminino", stage: "batismo", whatsapp: "11990000012", neighborhood: "Moema" });
  const felipe = await addPerson({ fullName: "Felipe Lima", gender: "masculino", stage: "fundamentos", whatsapp: "11990000013", neighborhood: "Saúde" });
  const tania = await addPerson({ fullName: "Tânia Melo", gender: "feminino", stage: "consolidacao", whatsapp: "11990000014", neighborhood: "Vila Mariana" });
  const gabriel = await addPerson({ fullName: "Gabriel Souza", gender: "masculino", stage: "celula", whatsapp: "11990000015", neighborhood: "Centro" });
  const lucas = await addPerson({ fullName: "Lucas Ramos", gender: "masculino", stage: "nova_alma", whatsapp: "11990000016", neighborhood: "Saúde" });
  const bianca = await addPerson({ fullName: "Bianca Rocha", gender: "feminino", stage: "nova_alma", whatsapp: "11990000017", neighborhood: "Moema" });
  const vera = await addPerson({ fullName: "Vera Pires", gender: "feminino", stage: "celula", whatsapp: "11990000018", neighborhood: "Vila Mariana" });
  const rogerio = await addPerson({ fullName: "Rogério Sá", gender: "masculino", stage: "fundamentos", whatsapp: "11990000019", neighborhood: "Centro" });
  const marta = await addPerson({ fullName: "Marta Brito", gender: "feminino", stage: "batismo", whatsapp: "11990000020", neighborhood: "Saúde" });
  const joao = await addPerson({ fullName: "João Melo", gender: "masculino", stage: "celula", whatsapp: "11990000021", neighborhood: "Moema" });

  // 4) Usuários com login (plano liberado → todas as funções)
  async function addUser(name: string, email: string, role: typeof churchUsers.$inferInsert["role"], personId: number) {
    await createChurchUser({ churchId, name, email, password: DEMO_PASSWORD, role, personId, active: true, registrationStatus: "approved", approvedAt: new Date() });
    return (await db!.select().from(churchUsers).where(and(eq(churchUsers.churchId, churchId), eq(churchUsers.email, email.toLowerCase()))).limit(1))[0];
  }
  const pastorUser = await addUser("Pr. Marcos Lima", "pastor@demo.idefazei.com.br", "pastor_presidente", marcos);
  await addUser("Priscila Alves", "supervisor@demo.idefazei.com.br", "supervisor", priscila);
  await addUser("Rafael Costa", "lider@demo.idefazei.com.br", "lider", rafael);
  await addUser("Joana Martins", "secretaria@demo.idefazei.com.br", "secretario", joana);

  // 5) Ministérios + membros
  async function addMinistry(name: string, type: typeof ministries.$inferInsert["type"], leaderId: number, iconKey: string, members: number[]) {
    const res = await db!.insert(ministries).values({ churchId, name, type, leaderId, iconKey });
    const ministryId = Number((res[0] as { insertId?: number })?.insertId ?? 0);
    if (members.length) await db!.insert(ministryMembers).values(members.map((personId) => ({ ministryId, personId })));
    return ministryId;
  }
  await addMinistry("Louvor", "louvor", ana, "music", [ana, pedro, felipe, joao, carla]);
  await addMinistry("Recepção", "recepcao", marta, "handshake", [marta, rogerio, vera]);
  await addMinistry("Mídia", "midia", pedro, "video", [pedro, gabriel]);
  await addMinistry("Infantil", "infantil", priscila, "baby", [priscila, bianca, tania]);

  // 6) Células + membros
  async function addCell(name: string, leaderId: number, day: typeof cells.$inferInsert["meetingDay"], time: string, neighborhood: string, lat: string, lng: string, members: number[]) {
    const res = await db!.insert(cells).values({
      churchId, name, leaderId, meetingDay: day, meetingTime: time,
      city: "São Paulo", state: "SP", neighborhood, latitude: lat, longitude: lng,
      publicVisible: true,
    });
    const cellId = Number((res[0] as { insertId?: number })?.insertId ?? 0);
    if (members.length) await db!.insert(cellMembers).values(members.map((personId) => ({ cellId, personId })));
    return cellId;
  }
  await addCell("Célula Zona Sul", marcos, "quinta", "20:00", "Saúde", "-23.6180000", "-46.6390000", [marcos, lucas, felipe, marta, joao]);
  await addCell("Célula Centro", rafael, "terca", "19:30", "Centro", "-23.5505000", "-46.6333000", [rafael, pedro, gabriel, rogerio]);
  await addCell("Célula Jardins", priscila, "quarta", "20:00", "Moema", "-23.6010000", "-46.6640000", [priscila, carla, bianca, vera, tania]);

  // 7) Eventos
  const now = Date.now();
  await db.insert(events).values([
    { churchId, name: "Culto de Celebração", type: "culto", description: "Nosso culto de domingo à noite.", startDate: new Date(now + 2 * DAY), startTime: "19:00", location: "Templo sede" },
    { churchId, name: "Encontro com Deus", type: "retiro", description: "Um fim de semana de consagração.", startDate: new Date(now + 12 * DAY), startTime: "08:00", location: "Chácara Betel" },
    { churchId, name: "Congresso de Jovens", type: "congresso", description: "Três dias com a juventude.", startDate: new Date(now + 25 * DAY), startTime: "19:30", location: "Templo sede" },
  ]);

  // 8) Avisos (mural)
  await db.insert(announcements).values([
    { churchId, authorId: pastorUser!.id, title: "Seja bem-vindo à Igreja Modelo!", content: "Esta é uma demonstração do Ide Fazei. Explore à vontade — todas as funções estão liberadas.", type: "comunicado", pinned: true },
    { churchId, authorId: pastorUser!.id, title: "Culto de Celebração neste domingo", content: "Venha com sua família às 19h. Teremos um tempo especial de louvor e palavra.", type: "evento" },
    { churchId, authorId: pastorUser!.id, title: "Campanha de 21 dias de oração", content: "Participe da nossa campanha. Todas as manhãs, às 6h, no templo e on-line.", type: "aviso" },
  ]);

  return { churchId, slug: DEMO_SLUG, url: `https://${DEMO_SLUG}.idefazei.com.br`, login: "pastor@demo.idefazei.com.br", password: DEMO_PASSWORD };
}
