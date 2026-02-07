import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, Users, Zap, Award, Target, Heart } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">About SiteSafe Pro</h1>
          <p className="text-xl text-muted-foreground">
            UK construction health & safety management, built by people who understand the industry.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground mb-4">
            We believe every construction worker deserves to go home safely at the end of each day. 
            SiteSafe Pro was created to make health and safety management simpler, more accessible, 
            and more effective for UK construction companies of all sizes.
          </p>
          <p className="text-lg text-muted-foreground">
            Too many construction SMEs struggle with paper-based systems, spreadsheets, and shared drives. 
            Compliance becomes a burden rather than a tool for keeping people safe. We're changing that 
            by providing an affordable, intuitive platform that makes good safety practice the easy choice.
          </p>
        </section>

        {/* Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Safety First</h3>
                    <p className="text-sm text-muted-foreground">
                      Everything we build is designed to protect workers. Safety is never an afterthought — 
                      it's the foundation of every feature we create.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Simplicity</h3>
                    <p className="text-sm text-muted-foreground">
                      Complexity is the enemy of compliance. We design tools that are intuitive enough 
                      to use on a busy construction site, without training manuals.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">UK-Focused</h3>
                    <p className="text-sm text-muted-foreground">
                      Built specifically for UK construction legislation — CDM 2015, RIDDOR, COSHH, 
                      and more. No generic international features that don't apply.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Support SMEs</h3>
                    <p className="text-sm text-muted-foreground">
                      Enterprise software prices lock out small businesses. We offer fair, transparent 
                      pricing so every company can afford proper safety management.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">What We Do</h2>
          <p className="text-muted-foreground mb-4">
            SiteSafe Pro is an all-in-one health and safety management platform for UK construction. 
            We replace fragmented systems with a single digital solution:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Document Management:</strong> Store, version, and share safety documents with digital signatures</li>
            <li><strong>RAMS Builder:</strong> Create professional Risk Assessments and Method Statements with our guided wizard</li>
            <li><strong>Site Access:</strong> QR code sign-in/sign-out with live headcounts and emergency muster lists</li>
            <li><strong>Permits to Work:</strong> Digital permit system with approval workflows</li>
            <li><strong>Inspections:</strong> Mobile-friendly inspection checklists with photo evidence</li>
            <li><strong>Incident Reporting:</strong> Complete incident investigation with RIDDOR guidance</li>
            <li><strong>Contractor Compliance:</strong> Track subcontractor documents, insurance, and training</li>
            <li><strong>Toolbox Talks:</strong> Deliver and record safety briefings with attendance tracking</li>
            <li><strong>Client Portal:</strong> Give clients read-only access to compliance status and documents</li>
          </ul>
        </section>

        {/* Stats */}
        <section className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">100+</p>
                <p className="text-sm text-muted-foreground">Construction Companies</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">10,000+</p>
                <p className="text-sm text-muted-foreground">Site Sign-Ins</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-primary">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-muted/50 rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Join hundreds of UK construction companies already using SiteSafe Pro to keep their sites safe and compliant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/#pricing">View Pricing</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
