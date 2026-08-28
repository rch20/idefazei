import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChurchLayout from "./components/ChurchLayout";

// Carregamento sob demanda reduz o JavaScript inicial no Safari iOS e mantém
// um retorno visual claro enquanto a página solicitada é baixada.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const TenantPublicPage = lazy(() => import("./pages/TenantPublicPage"));
const LoginIgreja = lazy(() => import("./pages/LoginIgreja"));
const CadastroIgreja = lazy(() => import("./pages/CadastroIgreja"));
const CadastroDiscipulo = lazy(() => import("./pages/CadastroDiscipulo"));
const PortalVisitante = lazy(() => import("./pages/PortalVisitante"));
const VisiteNos = lazy(() => import("./pages/VisiteNos"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Planos = lazy(() => import("./pages/Planos"));
const Recursos = lazy(() => import("./pages/Recursos"));
const Contato = lazy(() => import("./pages/Contato"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GanharAlmas = lazy(() => import("./pages/GanharAlmas"));
const Consolidacao = lazy(() => import("./pages/Consolidacao"));
const FunilDiscipulado = lazy(() => import("./pages/FunilDiscipulado"));
const Pessoas = lazy(() => import("./pages/Pessoas"));
const Celulas = lazy(() => import("./pages/Celulas"));
const Eventos = lazy(() => import("./pages/Eventos"));
const Oracao = lazy(() => import("./pages/Oracao"));
const Mural = lazy(() => import("./pages/Mural"));
const Placeholder = lazy(() => import("./pages/Placeholder"));
const Familias = lazy(() => import("./pages/Familias"));
const Ministerios = lazy(() => import("./pages/Ministerios"));
const EstruturaOrganizacional = lazy(() => import("./pages/EstruturaOrganizacional"));
const Escalas = lazy(() => import("./pages/Escalas"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Biblioteca = lazy(() => import("./pages/Biblioteca"));
const AreaMembro = lazy(() => import("./pages/AreaMembro"));
const AppLider = lazy(() => import("./pages/AppLider"));
const CheckinEvento = lazy(() => import("./pages/CheckinEvento"));
const Demo = lazy(() => import("./pages/Demo"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CadastroSucesso = lazy(() => import("./pages/CadastroSucesso"));
const EscolaFundamentos = lazy(() => import("./pages/EscolaFundamentos"));
const Batismo = lazy(() => import("./pages/Batismo"));
const EncontroComDeus = lazy(() => import("./pages/EncontroComDeus"));
const EncontroComDeusDetalhe = lazy(() => import("./pages/EncontroComDeusDetalhe"));
const EncontroFichaPublica = lazy(() => import("./pages/EncontroFichaPublica"));
const EscolaLideres = lazy(() => import("./pages/EscolaLideres"));
const GestaoLideranca = lazy(() => import("./pages/GestaoLideranca"));
const Aconselhamento = lazy(() => import("./pages/Aconselhamento"));
const Comunicacao = lazy(() => import("./pages/Comunicacao"));
const ConfiguracoesCertificados = lazy(() => import("./pages/ConfiguracoesCertificados"));
const Faturamento = lazy(() => import("./pages/Faturamento"));
const CentralCuidado = lazy(() => import("./pages/CentralCuidado"));
const RadarEspiritual = lazy(() => import("./pages/RadarEspiritual"));
const Tesouraria = lazy(() => import("./pages/Tesouraria"));

function PublicRoot() {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  const parts = hostname.split(".");
  // O preview técnico também possui subdomínios. A experiência pública de tenant
  // só deve ser acionada no domínio produtivo (ou em subdomínios localhost).
  const isIdeFazeiHost = hostname.endsWith(".idefazei.com.br") || hostname.endsWith(".localhost");
  const isTenantSubdomain = isIdeFazeiHost && parts.length >= 3 && !["www", "admin"].includes(parts[0]);
  return isTenantSubdomain ? <TenantPublicPage /> : <LandingPage />;
}

function RouteLoading() {
  return <div className="flex min-h-[40vh] items-center justify-center bg-background p-6"><div className="flex flex-col items-center gap-3 text-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-gold border-t-transparent" /><p className="text-sm font-medium text-muted-foreground">Carregando...</p></div></div>;
}

// ─── LAYOUT WRAPPER ───────────────────────────────────────────────────────────

function AppPage({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <ChurchLayout title={title}>
      {children}
    </ChurchLayout>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Suspense fallback={<RouteLoading />}>
    <Switch>
      {/* ── Domínio Principal ── */}
      <Route path="/" component={PublicRoot} />
      <Route path="/cadastro-igreja" component={CadastroIgreja} />
      <Route path="/planos" component={Planos} />
      <Route path="/recursos" component={Recursos} />
      <Route path="/contato" component={Contato} />

      {/* ── Super Admin ── */}
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/login" component={AdminPanel} />

      {/* ── Login e Portal da Igreja ── */}
      <Route path="/login" component={LoginIgreja} />
      <Route path="/cadastro" component={CadastroDiscipulo} />
      <Route path="/encontro/ficha/:token" component={EncontroFichaPublica} />
      <Route path="/visite-nos" component={VisiteNos} />
      <Route path="/visitante" component={PortalVisitante} />
      <Route path="/cadastro-sucesso" component={CadastroSucesso} />

      {/* ── App — Dashboard ── */}
      <Route path="/app/dashboard">
        <AppPage title="Dashboard">
          <Dashboard />
        </AppPage>
      </Route>

      <Route path="/app/cuidado">
        <AppPage title="Central de Cuidado">
          <CentralCuidado />
        </AppPage>
      </Route>

      <Route path="/app/radar">
        <AppPage title="Radar Espiritual">
          <RadarEspiritual />
        </AppPage>
      </Route>

      <Route path="/app/arvore">
        <AppPage title="Árvore de Discipulado">
          <Placeholder title="Árvore de Discipulado" description="Genealogia espiritual visual da sua igreja" />
        </AppPage>
      </Route>

      {/* ── App — Ciclo de Discipulado ── */}
      <Route path="/app/almas">
        <AppPage title="Ganhar Almas">
          <GanharAlmas />
        </AppPage>
      </Route>

      <Route path="/app/ganhar-almas">
        <AppPage title="Ganhar Almas">
          <GanharAlmas />
        </AppPage>
      </Route>

      <Route path="/app/consolidacao">
        <AppPage title="Consolidação">
          <Consolidacao />
        </AppPage>
      </Route>

      <Route path="/app/funil">
        <AppPage title="Funil de Discipulado">
          <FunilDiscipulado />
        </AppPage>
      </Route>

      {/* ── App — Membros ── */}
      <Route path="/app/pessoas">
        <AppPage title="Pessoas">
          <Pessoas />
        </AppPage>
      </Route>

      <Route path="/app/familias">
        <AppPage title="Famílias">
          <Familias />
        </AppPage>
      </Route>

      {/* ── App — Células ── */}
      <Route path="/app/celulas">
        <AppPage title="Células">
          <Celulas />
        </AppPage>
      </Route>

      <Route path="/app/mapa">
        <AppPage title="Mapa de Células">
          <Celulas />
        </AppPage>
      </Route>

      {/* ── App — Ministério ── */}
      <Route path="/app/eventos">
        <AppPage title="Eventos">
          <Eventos />
        </AppPage>
      </Route>

      <Route path="/app/ministerios">
        <AppPage title="Ministérios">
          <Ministerios />
        </AppPage>
      </Route>
      <Route path="/app/estrutura-organizacional">
        <AppPage title="Estrutura Organizacional">
          <EstruturaOrganizacional />
        </AppPage>
      </Route>

      <Route path="/app/escalas">
        <AppPage title="Escalas">
          <Escalas />
        </AppPage>
      </Route>

      {/* ── App — Comunicação ── */}
      <Route path="/app/oracao">
        <AppPage title="Pedidos de Oração">
          <Oracao />
        </AppPage>
      </Route>

      <Route path="/app/mural">
        <AppPage title="Mural de Avisos">
          <Mural />
        </AppPage>
      </Route>

      {/* ── App — Novos Módulos ── */}
      <Route path="/app/escola-fundamentos">
        <AppPage title="Escola de Fundamentos">
          <EscolaFundamentos />
        </AppPage>
      </Route>

      <Route path="/app/batismo">
        <AppPage title="Batismo nas Águas">
          <Batismo />
        </AppPage>
      </Route>

      <Route path="/app/encontro-com-deus/:eventId">
        <AppPage title="Encontro com Deus">
          <EncontroComDeusDetalhe />
        </AppPage>
      </Route>

      <Route path="/app/encontro-com-deus">
        <AppPage title="Encontro com Deus">
          <EncontroComDeus />
        </AppPage>
      </Route>

      <Route path="/app/escola-lideres">
        <AppPage title="Escola de Líderes">
          <EscolaLideres />
        </AppPage>
      </Route>

      <Route path="/app/gestao-lideranca">
        <AppPage title="Gestão de Liderança">
          <GestaoLideranca />
        </AppPage>
      </Route>

      <Route path="/app/aconselhamento">
        <AppPage title="Aconselhamento Pastoral">
          <Aconselhamento />
        </AppPage>
      </Route>

      <Route path="/app/comunicacao">
        <AppPage title="Comunicação">
          <Comunicacao />
        </AppPage>
      </Route>

      {/* ── App — Admin ── */}
      <Route path="/app/biblioteca">
        <AppPage title="Biblioteca Digital">
          <Biblioteca />
        </AppPage>
      </Route>

      <Route path="/app/configuracoes">
        <AppPage title="Configurações">
          <Configuracoes />
        </AppPage>
      </Route>

      <Route path="/app/configuracoes/certificados">
        <AppPage title="Certificados">
          <ConfiguracoesCertificados />
        </AppPage>
      </Route>

      <Route path="/app/faturamento">
        <AppPage title="Faturamento">
          <Faturamento />
        </AppPage>
      </Route>

      <Route path="/app/tesouraria">
        <AppPage title="Tesouraria">
          <Tesouraria />
        </AppPage>
      </Route>

      <Route path="/app/membro">
        <AppPage title="Área do Membro">
          <AreaMembro />
        </AppPage>
      </Route>

      <Route path="/app/lider">
        <AppPage title="App do Líder">
          <AppLider />
        </AppPage>
      </Route>

      {/* ── Demo interativa ── */}
      <Route path="/demo" component={Demo} />

      {/* ── Check-in público ── */}
      <Route path="/checkin" component={CheckinEvento} />

      {/* ── Onboarding ── */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
