import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  BusPage,
  HomePage,
  NotFoundPage,
  OperatorBusPage,
  OperatorPage,
  RoutePage,
  SecurityPage,
  SecurityInvestigationPage,
  SimulatorPage,
  StopsPage,
} from '@/pages/all';
import { BusMapsPage } from '@/pages/busmaps-page';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/transit-planner" component={BusMapsPage} />
        <Route path="/busmaps" component={BusMapsPage} />
        <Route path="/bus/:busId" component={BusPage} />
        <Route path="/routes" component={RoutePage} />
        <Route path="/routes/:routeId" component={RoutePage} />
        <Route path="/stops" component={StopsPage} />
        <Route path="/operator" component={OperatorPage} />
        <Route path="/operator/bus/:busId" component={OperatorBusPage} />
        <Route path="/operator/security" component={SecurityPage} />
        <Route path="/operator/security/investigation" component={SecurityInvestigationPage} />
        <Route path="/operator/simulator" component={SimulatorPage} />
        <Route path="/simulator" component={SimulatorPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
