import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChurchLayout from "./components/ChurchLayout";

// Pages — Public / Auth
import LandingPage from "./pages/LandingPage";
import LoginIgreja from "./pages/LoginIgreja";
import CadastroIgreja from "./pages/CadastroIgreja";
import PortalVisitante from "./pages/PortalVisitante";
import AdminPanel from "./pages/AdminPanel";
import Planos from "./pages/Planos";
import Recursos from "./pages/Recursos";
import Contato from "./pages/Contato";

// Pages — App
import Dashboard from "./pages/Dashboard";
import GanharAlmas from "./pages/GanharAlmas";
import Consolidacao from "./pages/Consolidacao";
import FunilDiscipulado from "./pages/FunilDiscipulado";
import Pessoas from "./pages/Pessoas";
import Celulas from "./pages/Celulas";
import Eventos from "./pages/Eventos";
import Oracao from "./pages/Oracao";
import Mural from "./pages/Mural";
import Placeholder from "./pages/Placeholder";
import Familias from "./pages/Familias";
import Ministerios from "./pages/Ministerios";
import Escalas from "./pages/Escalas";
import Configuracoes from "./pages/Configuracoes";
import Biblioteca from "./pages/Biblioteca";
import AreaMembro from "./pages/AreaMembro";
import AppLider from "./pages/AppLider";
import { TreePine } from "lucide-react";

// ─── LAYOUT WRAPPER ───────────────────────────────────────────────────────────

function AppPage({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <ChurchLayout title={title} churchId={1}>
      {children}
    </ChurchLayout>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* ── Domínio Principal ── */}
      <Route path="/" component={LandingPage} />
      <Route path="/cadastro-igreja" component={CadastroIgreja} />
      <Route path="/planos" component={Planos} />
      <Route path="/recursos" component={Recursos} />
      <Route path="/contato" component={Contato} />

      {/* ── Super Admin ── */}
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/login" component={AdminPanel} />

      {/* ── Login e Portal da Igreja ── */}
      <Route path="/login" component={LoginIgreja} />
      <Route path="/visitante" component={PortalVisitante} />

      {/* ── App — Dashboard ── */}
      <Route path="/app/dashboard">
        <AppPage title="Dashboard">
          <Dashboard />
        </AppPage>
      </Route>

      <Route path="/app/radar">
        <AppPage title="Radar Espiritual">
          <Placeholder title="Radar Espiritual" description="Visão detalhada de pessoas em risco espiritual" icon={TreePine} />
        </AppPage>
      </Route>

      <Route path="/app/arvore">
        <AppPage title="Árvore de Discipulado">
          <Placeholder title="Árvore de Discipulado" description="Genealogia espiritual visual da sua igreja" icon={TreePine} />
        </AppPage>
      </Route>

      {/* ── App — Ciclo de Discipulado ── */}
      <Route path="/app/almas">
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

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
