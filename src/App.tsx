import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import ProjectDetail from "./pages/ProjectDetail";
import Documents from "./pages/Documents";
import DocumentView from "./pages/DocumentView";
import SiteAccess from "./pages/SiteAccess";
import CheckIn from "./pages/CheckIn";
import Team from "./pages/Team";
import AcceptInvite from "./pages/AcceptInvite";
import Settings from "./pages/Settings";
import Activity from "./pages/Activity";
import Analytics from "./pages/Analytics";
import ToolboxTalks from "./pages/ToolboxTalks";
import DeliverTalk from "./pages/DeliverTalk";
import TalkDetail from "./pages/TalkDetail";
import Inductions from "./pages/Inductions";
import Reports from "./pages/Reports";
import Permits from "./pages/Permits";
import Inspections from "./pages/Inspections";
import Incidents from "./pages/Incidents";
import Actions from "./pages/Actions";
import NewAction from "./pages/NewAction";
import ActionDetail from "./pages/ActionDetail";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Install from "./pages/Install";
import RamsList from "./pages/RamsList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/install" element={<Install />} />
            <Route path="/check-in/:code" element={<CheckIn />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/projects/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/documents/:id" element={<ProtectedRoute><DocumentView /></ProtectedRoute>} />
            <Route path="/rams" element={<ProtectedRoute><RamsList /></ProtectedRoute>} />
            <Route path="/site-access" element={<ProtectedRoute><SiteAccess /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/toolbox-talks" element={<ProtectedRoute><ToolboxTalks /></ProtectedRoute>} />
            <Route path="/toolbox-talks/deliver/:templateId" element={<ProtectedRoute><DeliverTalk /></ProtectedRoute>} />
            <Route path="/toolbox-talks/:id" element={<ProtectedRoute><TalkDetail /></ProtectedRoute>} />
            <Route path="/inductions" element={<ProtectedRoute><Inductions /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/permits" element={<ProtectedRoute><Permits /></ProtectedRoute>} />
            <Route path="/inspections" element={<ProtectedRoute><Inspections /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
            <Route path="/actions" element={<ProtectedRoute><Actions /></ProtectedRoute>} />
            <Route path="/actions/new" element={<ProtectedRoute><NewAction /></ProtectedRoute>} />
            <Route path="/actions/:id" element={<ProtectedRoute><ActionDetail /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
