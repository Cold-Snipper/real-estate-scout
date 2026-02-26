import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RunBotProvider } from "@/contexts/RunBotContext";
import RunPage from "@/pages/RunPage";
import WebsiteBotPage from "@/pages/WebsiteBotPage";
import FacebookBotPage from "@/pages/FacebookBotPage";
import PipelinePage from "@/pages/PipelinePage";
import TestBuildPage from "@/pages/TestBuildPage";
import DataPage from "@/pages/DataPage";
import CRMPage from "@/pages/CRMPage";
import OperatorOnboardingPage from "@/pages/OperatorOnboardingPage";
import AgentsApisPage from "@/pages/AgentsApisPage";
import NotFound from "@/pages/NotFound";
import B2CLanding from "@/pages/b2c/B2CLanding";
import B2COnboarding from "@/pages/b2c/B2COnboarding";
import B2CDiscover from "@/pages/b2c/B2CDiscover";
import B2CSaved from "@/pages/b2c/B2CSaved";
import B2CAlerts from "@/pages/b2c/B2CAlerts";
import B2CProfile from "@/pages/b2c/B2CProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RunBotProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<RunPage />} />
              <Route path="/website-bot" element={<WebsiteBotPage />} />
              <Route path="/facebook-bot" element={<FacebookBotPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/test-build" element={<TestBuildPage />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/crm" element={<ErrorBoundary><CRMPage /></ErrorBoundary>} />
              <Route path="/operator-onboarding" element={<ErrorBoundary><OperatorOnboardingPage /></ErrorBoundary>} />
              <Route path="/agents-apis" element={<AgentsApisPage />} />
            </Route>
            {/* B2C Consumer Routes (no sidebar layout) */}
            <Route path="/b2c" element={<B2CLanding />} />
            <Route path="/b2c/onboarding" element={<B2COnboarding />} />
            <Route path="/b2c/discover" element={<B2CDiscover />} />
            <Route path="/b2c/saved" element={<B2CSaved />} />
            <Route path="/b2c/alerts" element={<B2CAlerts />} />
            <Route path="/b2c/profile" element={<B2CProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RunBotProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
