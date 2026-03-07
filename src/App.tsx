import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientPortalProvider } from "@/contexts/ClientPortalContext";
import { SyncProvider } from "@/offline/SyncContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/client/ClientProtectedRoute";
import { RequireRole } from "@/components/auth/RequireRole";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";

const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Projects = lazy(() => import("./pages/Projects"));
const NewProject = lazy(() => import("./pages/NewProject"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentView = lazy(() => import("./pages/DocumentView"));
const SiteAccess = lazy(() => import("./pages/SiteAccess"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const Team = lazy(() => import("./pages/Team"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const Settings = lazy(() => import("./pages/Settings"));
const Activity = lazy(() => import("./pages/Activity"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ToolboxTalks = lazy(() => import("./pages/ToolboxTalks"));
const DeliverTalk = lazy(() => import("./pages/DeliverTalk"));
const TalkDetail = lazy(() => import("./pages/TalkDetail"));
const ToolboxAttendance = lazy(() => import("./pages/ToolboxAttendance"));
const Inductions = lazy(() => import("./pages/Inductions"));
const Reports = lazy(() => import("./pages/Reports"));
const Permits = lazy(() => import("./pages/Permits"));
const Inspections = lazy(() => import("./pages/Inspections"));
const InspectionDetail = lazy(() => import("./pages/InspectionDetail"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Actions = lazy(() => import("./pages/Actions"));
const NewAction = lazy(() => import("./pages/NewAction"));
const ActionDetail = lazy(() => import("./pages/ActionDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Install = lazy(() => import("./pages/Install"));
const RamsList = lazy(() => import("./pages/RamsList"));
const RamsBuilder = lazy(() => import("./pages/RamsBuilder"));
const RamsDetail = lazy(() => import("./pages/RamsDetail"));
const SiteDiary = lazy(() => import("./pages/SiteDiary"));
const DiaryEntry = lazy(() => import("./pages/DiaryEntry"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientProjectView = lazy(() => import("./pages/ClientProjectView"));
const Contractors = lazy(() => import("./pages/Contractors"));
const NewContractor = lazy(() => import("./pages/NewContractor"));
const ContractorDetail = lazy(() => import("./pages/ContractorDetail"));
const ContractorUpload = lazy(() => import("./pages/ContractorUpload"));
const ComplianceCalendar = lazy(() => import("./pages/ComplianceCalendar"));
const ContractorDashboardPage = lazy(() => import("./pages/ContractorDashboard"));
const ContractorCompliance = lazy(() => import("./pages/ContractorCompliance"));
const Help = lazy(() => import("./pages/Help"));
const Documentation = lazy(() => import("./pages/Documentation"));
const TrainingGuide = lazy(() => import("./pages/TrainingGuide"));
const CDMGuide = lazy(() => import("./pages/CDMGuide"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Templates = lazy(() => import("./pages/Templates"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const SiteMode = lazy(() => import("./pages/site-mode/SiteMode"));
const PhotoCapture = lazy(() => import("./pages/site-mode/PhotoCapture"));
const NoteCapture = lazy(() => import("./pages/site-mode/NoteCapture"));
const HazardCapture = lazy(() => import("./pages/site-mode/HazardCapture"));
const ActionCapture = lazy(() => import("./pages/site-mode/ActionCapture"));
const IncidentCapture = lazy(() => import("./pages/site-mode/IncidentCapture"));
const SignatureCapture = lazy(() => import("./pages/site-mode/SignatureCapture"));
const QueueManager = lazy(() => import("./pages/site-mode/QueueManager"));

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
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
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
              <Route path="/training-guide" element={<TrainingGuide />} />
              <Route path="/cdm-guide" element={<CDMGuide />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/install" element={<Install />} />
              <Route path="/check-in/:code" element={<CheckIn />} />
              <Route path="/toolbox-attendance/:token" element={<ToolboxAttendance />} />
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
              <Route path="/contractors/compliance" element={<ProtectedRoute><ContractorCompliance /></ProtectedRoute>} />
              <Route path="/contractors/new" element={<ProtectedRoute><NewContractor /></ProtectedRoute>} />
              <Route path="/contractors/:id" element={<ProtectedRoute><ContractorDetail /></ProtectedRoute>} />
              <Route path="/contractor-portal" element={<ProtectedRoute><ContractorDashboardPage /></ProtectedRoute>} />
              <Route path="/compliance-calendar" element={<ProtectedRoute><ComplianceCalendar /></ProtectedRoute>} />
              <Route path="/site-mode" element={<ProtectedRoute><SyncProvider><SiteMode /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/photo" element={<ProtectedRoute><SyncProvider><PhotoCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/note" element={<ProtectedRoute><SyncProvider><NoteCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/hazard" element={<ProtectedRoute><SyncProvider><HazardCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/action" element={<ProtectedRoute><SyncProvider><ActionCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/incident" element={<ProtectedRoute><SyncProvider><IncidentCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/signature" element={<ProtectedRoute><SyncProvider><SignatureCapture /></SyncProvider></ProtectedRoute>} />
              <Route path="/site-mode/queue" element={<ProtectedRoute><SyncProvider><QueueManager /></SyncProvider></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
              <Route path="/audit-log" element={<ProtectedRoute><RequireRole role="admin" fallback={<AccessDenied />}><AuditLog /></RequireRole></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><RequireRole role="owner" fallback={<AccessDenied />}><AdminPanel /></RequireRole></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
            </Suspense>
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
