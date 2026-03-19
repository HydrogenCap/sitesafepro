import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, ClipboardList, Shield, Users, AlertTriangle, CheckSquare } from "lucide-react";

const templates = [
  {
    category: "Induction & Access",
    icon: Users,
    items: [
      {
        name: "Site Induction Register",
        description: "Record of all personnel who have completed site induction",
        format: "DOCX",
        href: "/templates/Site_Induction_Register.docx"
      }
    ]
  },
  {
    category: "Risk Management",
    icon: AlertTriangle,
    items: [
      {
        name: "SubContractor RAMS Register",
        description: "Register of all subcontractor Risk Assessments and Method Statements",
        format: "DOCX",
        href: "/templates/SubContractor_RAMS_Register.docx"
      },
      {
        name: "Fire Risk Assessment",
        description: "Site fire risk assessment documentation template",
        format: "DOCX",
        href: "/templates/Fire_Risk_Assessment.docx"
      }
    ]
  },
  {
    category: "Permits & Safety",
    icon: Shield,
    items: [
      {
        name: "Permit to Work Forms",
        description: "Authorisation forms for high-risk work activities",
        format: "DOCX",
        href: "/templates/Permit_to_Work_Forms.docx"
      },
      {
        name: "Accident & Incident Report",
        description: "Form for reporting accidents and incidents on site",
        format: "DOCX",
        href: "/templates/Accident_Incident_Report.docx"
      }
    ]
  },
  {
    category: "Equipment Registers",
    icon: ClipboardList,
    items: [
      {
        name: "Scaffold Inspection Register",
        description: "Register for scaffold inspections and certifications",
        format: "DOCX",
        href: "/templates/Scaffold_Inspection_Register.docx"
      },
      {
        name: "Lifting Equipment Register",
        description: "Register of all lifting equipment and inspection records",
        format: "DOCX",
        href: "/templates/Lifting_Equipment_Register.docx"
      },
      {
        name: "PAT Testing Register",
        description: "Portable Appliance Testing register",
        format: "DOCX",
        href: "/templates/PAT_Testing_Register.docx"
      }
    ]
  },
  {
    category: "COSHH & Substances",
    icon: FileText,
    items: [
      {
        name: "COSHH Register",
        description: "Control of Substances Hazardous to Health register",
        format: "DOCX",
        href: "/templates/COSHH_Register.docx"
      }
    ]
  },
  {
    category: "Compliance & Welfare",
    icon: CheckSquare,
    items: [
      {
        name: "H&S File Contributions Log",
        description: "Log of contributions to the Health & Safety file",
        format: "DOCX",
        href: "/templates/HS_File_Contributions_Log.docx"
      },
      {
        name: "Welfare Facilities Checklist",
        description: "Checklist for site welfare facilities compliance",
        format: "DOCX",
        href: "/templates/Welfare_Facilities_Checklist.docx"
      }
    ]
  }
];

export default function Templates() {
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
          <h1 className="text-4xl font-bold mb-4">Document Templates</h1>
          <p className="text-lg text-muted-foreground">
            Free downloadable templates for UK construction health & safety management. 
            All templates are CDM 2015 compliant.
          </p>
        </div>

        {/* Info Banner */}
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Using these templates</h3>
                <p className="text-sm text-muted-foreground">
                  These templates are provided free of charge for use on your construction projects. 
                  They are designed to help you meet your health and safety obligations under CDM 2015 
                  and other UK legislation. Customise them to suit your specific project requirements.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Site Safe users:</strong> These templates are automatically loaded into your 
                  organisation when you sign up, and can be generated for each project with pre-filled 
                  project details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Categories */}
        <div className="space-y-8">
          {templates.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {category.items.map((template) => (
                    <div 
                      key={template.name}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {template.format}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="ml-4">
                        <a href={template.href} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-12 text-center bg-muted/50 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Want these templates built-in?</h2>
          <p className="text-muted-foreground mb-6">
            Site Safe automatically generates these documents with your project details pre-filled. 
            No more manual data entry or version control headaches.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/#features">See All Features</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
