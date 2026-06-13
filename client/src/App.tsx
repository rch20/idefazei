import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChurchLayout from "./components/ChurchLayout";

// Pages
import Home from "./pages/Home";
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
import {
  TreePine,
} from "lucide-react";

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
      {/* Public */}
      <Route path="/" component={Home} />

      {/* App routes */}
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

      <Route path="/app/pessoas">
        <AppPage title="Pessoas">
          <Pessoas />
        </AppPage>
      </Route>

      <Route path="/app/familias">
        <Familias />
      </Route>

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

      <Route path="/app/eventos">
        <AppPage title="Eventos">
          <Eventos />
        </AppPage>
      </Route>

      <Route path="/app/ministerios">
        <Ministerios />
      </Route>

      <Route path="/app/escalas">
        <Escalas />
      </Route>

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

      <Route path="/app/biblioteca">
        <Biblioteca />
      </Route>

      <Route path="/app/configuracoes">
        <Configuracoes />
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
