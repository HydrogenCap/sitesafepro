import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Download, BookOpen, HelpCircle, Mail, Phone } from "lucide-react";

const faqData = [
  {
    category: "General",
    questions: [
      {
        q: "What is SiteSafe Pro?",
        a: "SiteSafe Pro is a cloud-based health and safety management platform built specifically for UK construction companies. It replaces paper-based systems, spreadsheets, and shared drives with a single digital platform covering document management, RAMS, permits to work, site access, inspections, incidents, toolbox talks, contractor compliance, and more."
      },
      {
        q: "Who is SiteSafe Pro designed for?",
        a: "SiteSafe Pro is designed for UK construction SMEs — from sole traders running one project to mid-size contractors managing multiple sites. The typical users are site managers, project managers, H&S managers, and company directors."
      },
      {
        q: "Is SiteSafe Pro compliant with UK legislation?",
        a: "Yes. SiteSafe Pro is built around UK construction health and safety legislation including CDM 2015, the Health and Safety at Work Act 1974, the Work at Height Regulations 2005, COSHH Regulations 2002, and RIDDOR 2013."
      },
      {
        q: "Can I use SiteSafe Pro on my phone?",
        a: "Yes. SiteSafe Pro is fully responsive and works in any modern web browser on mobile. You can also install it as a Progressive Web App (PWA) by visiting the Install page or tapping the install prompt in your browser."
      },
      {
        q: "Is my data secure?",
        a: "Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and our infrastructure is hosted on secure, EU-based cloud servers compliant with GDPR."
      }
    ]
  },
  {
    category: "Pricing & Plans",
    questions: [
      {
        q: "What plans are available?",
        a: "There are three plans: Starter (£49/month) — 1 active project, 5GB storage; Professional (£99/month) — up to 5 projects, 25GB storage, plus permits, toolbox talks, inspections; Enterprise (£199/month) — unlimited projects, 100GB storage, client portal, AI document analysis."
      },
      {
        q: "Is there a free trial?",
        a: "Yes. All new accounts start with a free trial period so you can explore the platform before committing. You can upgrade, downgrade, or cancel at any time from the Settings page."
      },
      {
        q: "Can I change my plan later?",
        a: "Yes. You can upgrade or downgrade at any time from Settings > Subscription. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period."
      },
      {
        q: "How does billing work?",
        a: "Billing is monthly via Stripe. You can manage your payment method, view invoices, and cancel your subscription from the Stripe customer portal, accessible via Settings > Subscription > Manage Billing."
      }
    ]
  },
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I create an account?",
        a: "Visit the SiteSafe Pro website and click Sign Up. Enter your name, email, phone number, and create a password. After signing up, you will be guided through an onboarding flow where you create your organisation and configure your first project."
      },
      {
        q: "What happens during onboarding?",
        a: "The onboarding wizard guides you through four steps: creating your organisation (company name, logo), inviting team members, creating your first project (name, address, client, dates), and selecting your subscription plan."
      },
      {
        q: "How do I create a project?",
        a: "Go to Projects > New Project. Enter the project name, address, client name, start and end dates, and a description. The project is created in 'setup' status. Before it can go live, you must complete the pre-construction compliance checklist."
      },
      {
        q: "What is the pre-construction compliance checklist?",
        a: "Every project starts in setup mode. Before work begins, you must confirm five compliance requirements: F10 Notification, Asbestos Survey, Pre-Construction Information, Construction Phase Plan, and Principal Contractor Appointment. Each item can be marked as complete, exempt (with reason), or pending."
      }
    ]
  },
  {
    category: "Projects & Documents",
    questions: [
      {
        q: "How do I take a project 'Live'?",
        a: "Once all five pre-construction compliance items are marked as complete or exempt, the 'Go Live' button becomes available on the project page. Click it to confirm and the project status changes from 'setup' to 'active'. This unlocks all features for the project."
      },
      {
        q: "How do I upload documents?",
        a: "Go to Documents and click Upload Document. Select a file (PDF, Word, image, etc.), choose the project and category, add a description, and click Upload. Documents are stored securely and can be shared, versioned, and acknowledged."
      },
      {
        q: "What is AI document classification?",
        a: "When you upload a document, SiteSafe Pro uses AI to suggest the correct category (e.g., RAMS, Insurance Certificate, Training Record). You can accept or change the suggestion before saving."
      },
      {
        q: "How do document acknowledgements work?",
        a: "Certain documents can be flagged as 'requires acknowledgement'. When enabled, site personnel must digitally sign to confirm they have read and understood the document. The acknowledgement log shows who signed and when."
      }
    ]
  },
  {
    category: "RAMS & Permits",
    questions: [
      {
        q: "What is the RAMS Builder?",
        a: "The RAMS Builder is a guided wizard for creating Risk Assessments and Method Statements. It walks you through selecting activities, adding hazards and controls, writing method steps, and generating a formatted PDF with signature sections."
      },
      {
        q: "How do I create a Permit to Work?",
        a: "Go to Permits and click New Permit. Select the permit type (Hot Works, Confined Space, etc.), complete the required fields including hazard controls and PPE, and submit. The permit goes through an approval workflow before work can begin."
      },
      {
        q: "How do permit approvals work?",
        a: "When a permit is created, it goes to the site manager or nominated approver. They review the controls, add conditions if needed, and approve or reject. Approved permits have a validity period and must be closed out after work is complete."
      }
    ]
  },
  {
    category: "Site Access & Inductions",
    questions: [
      {
        q: "How does QR code site access work?",
        a: "Each project has a unique QR code. Workers scan it on arrival using their phone camera. They enter their name, company, trade, and confirm they are inducted. On departure, they scan again to sign out. You can view who is on site in real time."
      },
      {
        q: "Can I set up site inductions?",
        a: "Yes. You can configure a site induction with slides or documents that workers must review before they can sign in. Inductions can include acknowledgements, and completion is logged for compliance records."
      },
      {
        q: "How do I view who is currently on site?",
        a: "Go to Site Access. The dashboard shows a live headcount, list of personnel currently signed in, and the ability to filter by company or trade. You can also export the sign-in log."
      }
    ]
  },
  {
    category: "Inspections & Incidents",
    questions: [
      {
        q: "How do I record an inspection?",
        a: "Go to Inspections and click New Inspection. Select the inspection type (scaffold, excavation, etc.), complete the checklist items, add photos and notes, and submit. Failed items automatically create corrective actions."
      },
      {
        q: "How do I report an incident?",
        a: "Go to Incidents and click Report Incident. Enter the date, time, location, description, and any injured parties. Attach photos and witness statements. The incident enters an investigation workflow with RIDDOR reporting guidance if applicable."
      },
      {
        q: "What is RIDDOR reporting?",
        a: "RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences Regulations) requires certain incidents to be reported to the HSE. SiteSafe Pro flags incidents that may be RIDDOR-reportable and provides guidance on the reporting process."
      }
    ]
  },
  {
    category: "Contractors & Compliance",
    questions: [
      {
        q: "How do I add a contractor?",
        a: "Go to Contractors and click Add Contractor. Enter the company name, trade, contact details, and assign them to projects. You can then request compliance documents (insurance, RAMS, training records) via email."
      },
      {
        q: "How does contractor compliance tracking work?",
        a: "Each contractor has a compliance score based on the documents they have uploaded. Documents have expiry dates (e.g., insurance). The system alerts you when documents are expiring or missing, and you can send reminder requests."
      },
      {
        q: "Can contractors upload their own documents?",
        a: "Yes. When you request documents from a contractor, they receive an email with a secure upload link. They can upload the requested files without needing an account. The documents appear in your dashboard for review."
      }
    ]
  },
  {
    category: "Client Portal",
    questions: [
      {
        q: "What is the Client Portal?",
        a: "The Client Portal gives your clients (e.g., the property developer or main contractor) read-only access to project documents, compliance status, and reports. They can view but not edit, and you control exactly what they see."
      },
      {
        q: "How do I invite a client?",
        a: "Go to Settings > Client Portal and click Invite Client. Enter their email, select which projects they can access, and choose their permissions (view documents, view actions, download reports). They receive an email invitation to create their portal account."
      }
    ]
  }
];

export default function Help() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and access training resources
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Training Guide</CardTitle>
                <CardDescription>Complete platform walkthrough</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                A comprehensive guide covering every feature of SiteSafe Pro, from account setup to advanced reporting.
              </p>
              <Button asChild className="w-full">
                <a href="/docs/SiteSafePro_Training_Guide.docx" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Training Guide
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="rounded-lg bg-secondary/50 p-2">
                <HelpCircle className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">FAQ Guide</CardTitle>
                <CardDescription>Quick answers to common questions</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Frequently asked questions about features, pricing, compliance, and troubleshooting.
              </p>
              <Button asChild variant="secondary" className="w-full">
                <a href="/docs/SiteSafePro_FAQ_Guide.docx" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download FAQ Guide
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="rounded-lg bg-accent p-2">
                <Mail className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Contact Support</CardTitle>
                <CardDescription>Get help from our team</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full">
                  <a href="mailto:support@sitesafepro.co.uk">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Support
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Browse answers organized by topic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {faqData.map((category) => (
                <div key={category.category}>
                  <h3 className="text-lg font-semibold mb-3 text-primary">{category.category}</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.category}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
