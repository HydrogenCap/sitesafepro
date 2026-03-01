import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>
              Site Safe ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our construction site safety management platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and contact information (email, phone number)</li>
              <li>Company/organisation details</li>
              <li>Site access records and check-in/check-out times</li>
              <li>Emergency contact information</li>
              <li>Professional certifications and qualifications</li>
            </ul>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Log data (IP address, browser type, access times)</li>
              <li>Device information</li>
              <li>Feature usage and interaction data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Manage site access and safety compliance</li>
              <li>Generate reports and analytics for your organisation</li>
              <li>Communicate with you about your account and services</li>
              <li>Improve our platform and develop new features</li>
              <li>Comply with legal obligations and health & safety regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your organisation administrators (as part of the service)</li>
              <li>Service providers who assist in operating our platform</li>
              <li>Regulatory authorities when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption, secure data centres, and access controls to protect your information. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide services. Site access records are retained in accordance with UK health and safety record-keeping requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request erasure of your data</li>
              <li>Object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="mt-2">
               <strong>Email:</strong> privacy@sitesafe.cloud<br />
               <strong>Address:</strong> Site Safe Ltd, London, United Kingdom
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
