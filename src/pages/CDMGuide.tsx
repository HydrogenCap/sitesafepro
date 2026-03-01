import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Scale, Users, FileCheck, AlertTriangle, ClipboardList, Building2 } from "lucide-react";

export default function CDMGuide() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">CDM 2015 Guide</h1>
          <p className="text-lg text-muted-foreground">
            Understanding the Construction (Design and Management) Regulations 2015
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              What is CDM 2015?
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <p>
              The Construction (Design and Management) Regulations 2015 (CDM 2015) are the main set of regulations 
              for managing health, safety, and welfare on construction projects in the UK. They apply to all 
              construction work and place legal duties on clients, designers, and contractors.
            </p>
            <p>
              CDM 2015 replaced CDM 2007 and came into force on 6 April 2015. The regulations aim to improve 
              health and safety by ensuring all duty holders work together to identify, eliminate, and control 
              risks from the earliest stages of a project through to completion and beyond.
            </p>
          </CardContent>
        </Card>

        {/* Duty Holders */}
        <h2 className="text-2xl font-bold mb-4">Duty Holders</h2>
        <div className="grid gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Commercial Client
              </CardTitle>
              <CardDescription>Anyone having construction work carried out as part of a business</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Make suitable arrangements for managing the project</li>
                <li>Ensure sufficient time and resources are allocated</li>
                <li>Appoint a Principal Designer and Principal Contractor (for projects with more than one contractor)</li>
                <li>Ensure a construction phase plan is in place before work starts</li>
                <li>Notify HSE of projects lasting more than 30 working days with more than 20 workers, or exceeding 500 person days (F10 notification)</li>
                <li>Ensure the principal designer prepares a health and safety file</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Principal Designer
              </CardTitle>
              <CardDescription>Designer with control over the pre-construction phase</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Plan, manage, and coordinate the pre-construction phase</li>
                <li>Identify, eliminate, and control foreseeable risks</li>
                <li>Ensure designers comply with their duties</li>
                <li>Prepare and provide Pre-Construction Information (PCI)</li>
                <li>Prepare the Health and Safety File</li>
                <li>Liaise with the Principal Contractor during construction</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Principal Contractor
              </CardTitle>
              <CardDescription>Contractor with control over the construction phase</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Plan, manage, and coordinate the construction phase</li>
                <li>Prepare the Construction Phase Plan (CPP) before work starts</li>
                <li>Organise cooperation between contractors</li>
                <li>Ensure suitable site inductions are provided</li>
                <li>Ensure welfare facilities are provided from day one</li>
                <li>Consult and engage with workers on health and safety</li>
                <li>Ensure only authorised persons are allowed on site</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Designers & Contractors
              </CardTitle>
              <CardDescription>All designers and contractors on the project</CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">Designers must:</h4>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                <li>Eliminate, reduce, and control foreseeable risks</li>
                <li>Provide information about remaining risks</li>
                <li>Check clients are aware of their duties</li>
              </ul>
              <h4 className="font-semibold mb-2">Contractors must:</h4>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Plan, manage, and monitor their own work and that of workers</li>
                <li>Ensure workers have the skills, knowledge, and training</li>
                <li>Provide supervision, instruction, and information</li>
                <li>Cooperate with others and follow the construction phase plan</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Workers
              </CardTitle>
              <CardDescription>Everyone carrying out construction work</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Be consulted about matters affecting their health and safety</li>
                <li>Take care of their own health and safety and that of others</li>
                <li>Report anything that could endanger themselves or others</li>
                <li>Cooperate with their employer, principal contractor, and others</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Key Documents */}
        <h2 className="text-2xl font-bold mb-4">Key Documents</h2>
        <div className="grid gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>F10 Notification</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                Projects must be notified to the HSE if they will last longer than 30 working days and have 
                more than 20 workers on site at any one time, OR will exceed 500 person days of construction work. 
                The notification must be submitted before work starts and displayed on site.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pre-Construction Information (PCI)</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                The client must provide relevant project information to the principal designer and principal contractor. 
                This includes existing health and safety files, asbestos surveys, structural information, and any 
                significant hazards. The principal designer coordinates this information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Construction Phase Plan (CPP)</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                The principal contractor must prepare a written plan before work starts, setting out how health 
                and safety will be managed during construction. It must be proportionate to the project's risks 
                and include arrangements for managing key risks, site rules, and welfare facilities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health and Safety File</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                The principal designer must prepare a file containing information about the project that will be 
                useful for future maintenance, repair, or renovation. It should include as-built drawings, 
                specifications of materials used, and information about significant hazards.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How Site Safe Helps */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>How Site Safe Helps with CDM Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Site Safe is built around CDM 2015 requirements, helping you meet your legal obligations:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Pre-Construction Checklist:</strong> Ensures all five key requirements (F10, Asbestos, PCI, CPP, PC Appointment) are completed before work starts</li>
              <li><strong>Document Management:</strong> Store and track PCI, CPP, and H&S File documents with version control</li>
              <li><strong>Contractor Compliance:</strong> Verify contractor competence and insurance before they work on site</li>
              <li><strong>Site Inductions:</strong> Deliver and record site inductions as required by CDM</li>
              <li><strong>RAMS Builder:</strong> Create compliant Risk Assessments and Method Statements</li>
              <li><strong>Incident Reporting:</strong> Track and report incidents, including RIDDOR guidance</li>
              <li><strong>Audit Trail:</strong> Maintain evidence of your CDM compliance for inspections</li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            For the official guidance, visit the HSE website:
          </p>
          <Button asChild variant="outline">
            <a href="https://www.hse.gov.uk/construction/cdm/2015/index.htm" target="_blank" rel="noopener noreferrer">
              HSE CDM 2015 Guidance
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
