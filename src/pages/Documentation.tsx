import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Download, BookOpen, FileText, Users, Shield, ClipboardCheck, QrCode, AlertTriangle, HardHat } from "lucide-react";

const documentationSections = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Account creation, onboarding, and first login",
    content: [
      {
        q: "Creating Your Account",
        a: "Visit sitesafe.cloud and click Sign Up in the top right corner. Enter your full name, email address, phone number, and choose a password. Click Create Account. You will be logged in automatically and taken to the Onboarding wizard."
      },
      {
        q: "Onboarding Wizard",
        a: "The onboarding wizard walks you through four steps: 1) Create Organisation — Enter your company name. 2) Invite Team Members — Add colleagues by email with roles (Admin, Site Manager, or Contractor). 3) Create Your First Project — Enter project details. 4) Choose Your Plan — Select Starter, Professional, or Enterprise."
      },
      {
        q: "Dashboard Overview",
        a: "The Dashboard is your home screen showing project summary cards, actions widget, recent activity feed, site diary reminders, and quick stats. The left sidebar contains links to all 17 sections of Site Safe."
      }
    ]
  },
  {
    icon: FileText,
    title: "Projects",
    description: "Creating, configuring, and going live",
    content: [
      {
        q: "Creating a New Project",
        a: "Go to Projects from the sidebar and click New Project. Enter the project name, site address (with postcode for emergency services lookup), client name, principal designer and contractor details, estimated start and end dates, and a description."
      },
      {
        q: "Pre-Construction Compliance Checklist",
        a: "Every new project starts in 'setup' mode. Before going live, complete the five requirements: F10 Notification to HSE, Asbestos Survey or Refurbishment/Demolition Survey, Pre-Construction Information (PCI), Construction Phase Plan (CPP), and Principal Contractor Appointment letter."
      },
      {
        q: "Going Live",
        a: "Once all five items are marked complete or exempt, click 'Go Live'. This confirms compliance, changes project status from 'setup' to 'active', generates pre-configured documents (induction register, permits, etc.), and enables QR code site access."
      }
    ]
  },
  {
    icon: Shield,
    title: "Documents & RAMS",
    description: "Uploading, classifying, and building RAMS",
    content: [
      {
        q: "Uploading Documents",
        a: "Go to Documents and click Upload Document. Select a file (PDF, Word, image), choose project and category, add description, and click Upload. AI will suggest the correct category which you can accept or change."
      },
      {
        q: "Document Acknowledgements",
        a: "Enable 'requires acknowledgement' for documents that need sign-off. Site personnel must digitally sign to confirm they have read and understood the document. The acknowledgement log shows who signed and when."
      },
      {
        q: "RAMS Builder",
        a: "The RAMS Builder is a five-step wizard: 1) Project Details — select project and version. 2) Activity Selector — choose from 80+ construction activities. 3) Risk Assessments — add hazards, likelihood, severity, and controls. 4) Method Statements — write sequenced steps. 5) Review & Sign — add signatures and export as PDF."
      }
    ]
  },
  {
    icon: ClipboardCheck,
    title: "Actions & Permits",
    description: "Raising actions and managing permits",
    content: [
      {
        q: "Corrective Actions",
        a: "Actions can be raised from inspections, incidents, audits, or manually. Each action has a title, description, priority (low/medium/high/critical), due date, and assignee. Track status through open → in progress → completed → verified → closed."
      },
      {
        q: "Permits to Work",
        a: "Create permits for high-risk activities: Hot Works, Confined Space Entry, Excavation, Electrical Isolation, Working at Height, and Roof Work. Each permit type has specific fields, requires approval, and has a validity period."
      },
      {
        q: "Permit Workflow",
        a: "When created, permits go to the site manager for review. They can approve, reject, or request changes. Approved permits show validity period and must be closed out after work completion."
      }
    ]
  },
  {
    icon: QrCode,
    title: "Site Access",
    description: "QR codes, headcounts, and inductions",
    content: [
      {
        q: "QR Code Sign-In",
        a: "Each project has a unique QR code. Workers scan with their phone camera, enter their name, company, and trade. On departure, they scan again to sign out. View live headcount in Site Access dashboard."
      },
      {
        q: "Site Inductions",
        a: "Configure induction content with slides and documents. New workers complete the induction on first sign-in. Completion is logged for compliance records. You can require acknowledgement of specific documents."
      },
      {
        q: "Emergency Headcount",
        a: "In an emergency, use the headcount feature to see exactly who is on site. Export the list if needed for fire marshals or emergency services."
      }
    ]
  },
  {
    icon: AlertTriangle,
    title: "Inspections & Incidents",
    description: "Recording inspections and reporting incidents",
    content: [
      {
        q: "Recording Inspections",
        a: "Create inspections for: Scaffold, Excavation, Lifting Equipment, Electrical, Fire Safety, Housekeeping, PPE Compliance, and Welfare. Complete checklist items with pass/fail/N/A, add photos and notes."
      },
      {
        q: "Incident Reporting",
        a: "Report incidents with date, time, location, description, injured parties, photos, and witness statements. The system guides you through investigation and flags potentially RIDDOR-reportable incidents."
      },
      {
        q: "RIDDOR Guidance",
        a: "Site Safe flags incidents that may require reporting under RIDDOR 2013 — fatal injuries, specified injuries, over-7-day incapacitation, dangerous occurrences, and occupational diseases."
      }
    ]
  },
  {
    icon: HardHat,
    title: "Contractors",
    description: "Compliance tracking and document requests",
    content: [
      {
        q: "Adding Contractors",
        a: "Go to Contractors and click Add Contractor. Enter company name, trade, contact details, and assign to projects. Track compliance documents including insurance, RAMS, training records, and certifications."
      },
      {
        q: "Document Requests",
        a: "Request specific documents from contractors via email. They receive a secure upload link — no account needed. Documents appear in your dashboard for review and verification."
      },
      {
        q: "Compliance Scoring",
        a: "Each contractor has a compliance score based on document status. The system alerts you when documents are expiring or missing. Send reminder requests with one click."
      }
    ]
  },
  {
    icon: Users,
    title: "Team & Client Portal",
    description: "Managing team members and client access",
    content: [
      {
        q: "Team Roles",
        a: "Four role levels: Owner (full access, billing), Admin (full access except billing), Site Manager (manage assigned projects), Contractor (view and upload only). Invite members via Settings > Team."
      },
      {
        q: "Client Portal",
        a: "Give clients read-only access to selected projects. They can view documents, compliance status, and download reports. Configure permissions per client from Settings > Client Portal."
      },
      {
        q: "Activity Logs",
        a: "Track all platform activity including uploads, sign-ins, status changes, and approvals. Filter by project, user, date range, or activity type. Export logs for auditing purposes."
      }
    ]
  }
];

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-lg text-muted-foreground">
            Complete guide to using every feature of Site Safe
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Training Guide
              </CardTitle>
              <CardDescription>
                Comprehensive PDF guide with step-by-step instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild className="flex-1">
                <Link to="/training-guide">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Online
                </Link>
              </Button>
              <Button asChild variant="outline" size="icon">
                <a href="/docs/SiteSafePro_Training_Guide.docx" download title="Download DOCX">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                FAQ Guide
              </CardTitle>
              <CardDescription>
                Quick answers to frequently asked questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <a href="/docs/SiteSafePro_FAQ_Guide.docx" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download FAQ Guide
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Sections */}
        <div className="space-y-6">
          {documentationSections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {section.content.map((item, index) => (
                    <AccordionItem key={index} value={`${section.title}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
