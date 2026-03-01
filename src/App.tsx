import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientPortalProvider } from "@/contexts/ClientPortalContext";
import { SyncProvider } from "@/offline/SyncContext";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { SwUpdatePrompt } from "@/components/offline/SwUpdatePrompt";
import { OrgProvider } from "@/contexts/OrgContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/client/ClientProtectedRoute";
import { RequireRole } from "@/components/auth/RequireRole";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AccessDenied from "./pages/AccessDenied";
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
import InspectionDetail from "./pages/InspectionDetail";
import Incidents from "./pages/Incidents";
import Actions from "./pages/Actions";
import NewAction from "./pages/NewAction";
import ActionDetail from "./pages/ActionDetail";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Install from "./pages/Install";
import RamsList from "./pages/RamsList";
import RamsBuilder from "./pages/RamsBuilder";
import RamsDetail from "./pages/RamsDetail";
import SiteDiary from "./pages/SiteDiary";
import DiaryEntry from "./pages/DiaryEntry";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProjectView from "./pages/ClientProjectView";
import Contractors from "./pages/Contractors";
import NewContractor from "./pages/NewContractor";
import ContractorDetail from "./pages/ContractorDetail";
import ContractorUpload from "./pages/ContractorUpload";
import ComplianceCalendar from "./pages/ComplianceCalendar";
import Help from "./pages/Help";
import Documentation from "./pages/Documentation";
import CDMGuide from "./pages/CDMGuide";
import CookiePolicy from "./pages/CookiePolicy";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Templates from "./pages/Templates";
import AuditLog from "./pages/AuditLog";
import AdminPanel from "./pages/AdminPanel";
import IncidentCapture from "./pages/site-mode/IncidentCapture";
import SiteMode from "./pages/site-mode/SiteMode";
import PhotoCapture from "./pages/site-mode/PhotoCapture";
import NoteCapture from "./pages/site-mode/NoteCapture";
import HazardCapture from "./pages/site-mode/HazardCapture";
import ActionCapture from "./pages/site-mode/ActionCapture";
import SignatureCapture from "./pages/site-mode/SignatureCapture";
import QueueManager from "./pages/site-mode/QueueManager";
const queryClient = new QueryClient();

const App = () => {
  // Global handler for unhandled promise rejections (e.g., from browser extensions like MetaMask)
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Check if it's from a browser extension (not our app code)
      const isExtensionError = event.reason?.stack?.includes("chrome-extension://") ||
        event.reason?.message?.includes("MetaMask");
      
      if (isExtensionError) {
        console.warn("Suppressed browser extension error:", event.reason);
        event.preventDefault(); // Prevent the error from crashing the app
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClientPortalProvider>
        <OrgProvider>
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
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/cdm-guide" element={<CDMGuide />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/install" element={<Install />} />
              <Route path="/check-in/:code" element={<CheckIn />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/contractor-upload/:token" element={<ContractorUpload />} />
              
              {/* Client Portal routes */}
              <Route path="/client" element={<ClientProtectedRoute><ClientDashboard /></ClientProtectedRoute>} />
              <Route path="/client/project/:id" element={<ClientProtectedRoute><ClientProjectView /></ClientProtectedRoute>} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
              <Route path="/projects/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/documents/:id" element={<ProtectedRoute><DocumentView /></ProtectedRoute>} />
              <Route path="/rams" element={<ProtectedRoute><RamsList /></ProtectedRoute>} />
              <Route path="/rams/new" element={<ProtectedRoute><RamsBuilder /></ProtectedRoute>} />
              <Route path="/rams/:id" element={<ProtectedRoute><RamsDetail /></ProtectedRoute>} />
              <Route path="/rams/:id/edit" element={<ProtectedRoute><RamsBuilder /></ProtectedRoute>} />
              <Route path="/projects/:id/diary" element={<ProtectedRoute><SiteDiary /></ProtectedRoute>} />
              <Route path="/projects/:id/diary/:date" element={<ProtectedRoute><DiaryEntry /></ProtectedRoute>} />
              <Route path="/site-access" element={<ProtectedRoute><SiteAccess /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><RequireRole role="admin" fallback={<AccessDenied />}><Team /></RequireRole></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><RequireRole role="site_manager" fallback={<AccessDenied />}><Settings /></RequireRole></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/toolbox-talks" element={<ProtectedRoute><ToolboxTalks /></ProtectedRoute>} />
              <Route path="/toolbox-talks/deliver/:templateId" element={<ProtectedRoute><DeliverTalk /></ProtectedRoute>} />
              <Route path="/toolbox-talks/:id" element={<ProtectedRoute><TalkDetail /></ProtectedRoute>} />
              <Route path="/inductions" element={<ProtectedRoute><Inductions /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/permits" element={<ProtectedRoute><Permits /></ProtectedRoute>} />
              <Route path="/inspections" element={<ProtectedRoute><Inspections /></ProtectedRoute>} />
              <Route path="/inspections/:id" element={<ProtectedRoute><InspectionDetail /></ProtectedRoute>} />
              <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
              <Route path="/actions" element={<ProtectedRoute><Actions /></ProtectedRoute>} />
              <Route path="/actions/new" element={<ProtectedRoute><NewAction /></ProtectedRoute>} />
              <Route path="/actions/:id" element={<ProtectedRoute><ActionDetail /></ProtectedRoute>} />
              <Route path="/contractors" element={<ProtectedRoute><Contractors /></ProtectedRoute>} />
              <Route path="/contractors/new" element={<ProtectedRoute><NewContractor /></ProtectedRoute>} />
              <Route path="/contractors/:id" element={<ProtectedRoute><ContractorDetail /></ProtectedRoute>} />
              <Route path="/compliance-calendar" element={<ProtectedRoute><ComplianceCalendar /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
              <Route path="/audit-log" element={<ProtectedRoute><RequireRole role="admin" fallback={<AccessDenied />}><AuditLog /></RequireRole></ProtectedRoute>} />
              <Route path="/site-mode" element={<ProtectedRoute><SyncProvider><SiteMode /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/incident" element={<ProtectedRoute><SyncProvider><IncidentCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/photo" element={<ProtectedRoute><SyncProvider><PhotoCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/note" element={<ProtectedRoute><SyncProvider><NoteCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/hazard" element={<ProtectedRoute><SyncProvider><HazardCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/action" element={<ProtectedRoute><SyncProvider><ActionCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/signature" element={<ProtectedRoute><SyncProvider><SignatureCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/queue" element={<ProtectedRoute><SyncProvider><QueueManager /></SyncProvider></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><RequireRole role="owner" fallback={<AccessDenied />}><AdminPanel /></RequireRole></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </OrgProvider>
      </ClientPortalProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
