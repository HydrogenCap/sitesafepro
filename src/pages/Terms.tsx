import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using Site Safe ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p>
              Site Safe is a construction site safety management platform that provides:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Document management and e-signatures</li>
              <li>Site access control via QR codes</li>
              <li>Visitor and contractor check-in/check-out</li>
              <li>Safety compliance tracking</li>
              <li>Incident reporting</li>
              <li>Health & safety documentation management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Account Registration</h2>
            <p>
              To use certain features, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Subscription and Payment</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">Pricing</h3>
            <p>
              Our subscription plans are billed monthly or annually in British Pounds (GBP). Prices are subject to change with 30 days' notice.
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Free Trial</h3>
            <p>
              New accounts receive a 14-day free trial. No credit card is required to start your trial.
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Access continues until the end of your billing period. No refunds are provided for partial months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to systems</li>
              <li>Interfere with the proper working of the Service</li>
              <li>Upload malicious code or content</li>
              <li>Impersonate others or provide false information</li>
              <li>Share your account credentials with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data and Content</h2>
            <p>
              You retain ownership of all content you upload to the Service. By uploading content, you grant us a licence to store, display, and process it as necessary to provide the Service.
            </p>
            <p className="mt-4">
              You are responsible for ensuring you have the right to upload any content and that it complies with applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
            </p>
            <p className="mt-4">
              Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Health & Safety Disclaimer</h2>
            <p>
              While Site Safe assists with health and safety management, it does not replace professional health and safety advice or your legal obligations. You remain responsible for compliance with all applicable health and safety laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will provide notice of material changes via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
               <strong>Email:</strong> legal@sitesafe.cloud<br />
               <strong>Address:</strong> Site Safe Ltd, London, United Kingdom
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
