import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are stored on your computer or mobile device when you visit a website. 
              They are widely used to make websites work more efficiently and provide information to the site owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Cookies</h2>
            <p>SiteSafe Pro uses cookies for the following purposes:</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Essential Cookies</h3>
            <p>
              These cookies are necessary for the website to function properly. They enable core functionality such as:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>User authentication and session management</li>
              <li>Security features and fraud prevention</li>
              <li>Remembering your preferences and settings</li>
              <li>Load balancing and site performance</li>
            </ul>
            <p className="mt-2">
              <strong>You cannot opt out of essential cookies</strong> as the site cannot function properly without them.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">Analytics Cookies</h3>
            <p>
              We use analytics cookies to understand how visitors interact with our website. This helps us improve 
              our service. These cookies collect information such as:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pages visited and time spent on each page</li>
              <li>How you arrived at our site (referral source)</li>
              <li>General location (country/region level only)</li>
              <li>Device type and browser used</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">Functional Cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalisation, such as:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Remembering your display preferences (dark/light mode)</li>
              <li>Storing recent search queries and filters</li>
              <li>Customising the interface based on your role</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-border rounded-lg">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                    <th className="px-4 py-2 text-left font-semibold">Duration</th>
                    <th className="px-4 py-2 text-left font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">sb-access-token</td>
                    <td className="px-4 py-2">Authentication session</td>
                    <td className="px-4 py-2">1 hour</td>
                    <td className="px-4 py-2">Essential</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">sb-refresh-token</td>
                    <td className="px-4 py-2">Session refresh</td>
                    <td className="px-4 py-2">7 days</td>
                    <td className="px-4 py-2">Essential</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">theme</td>
                    <td className="px-4 py-2">Dark/light mode preference</td>
                    <td className="px-4 py-2">1 year</td>
                    <td className="px-4 py-2">Functional</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2">sidebar-collapsed</td>
                    <td className="px-4 py-2">Navigation preference</td>
                    <td className="px-4 py-2">1 year</td>
                    <td className="px-4 py-2">Functional</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Cookies</h2>
            <p>
              We use the following third-party services that may set cookies:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> For payment processing and fraud detection</li>
              <li><strong>Intercom:</strong> For customer support chat (if enabled)</li>
            </ul>
            <p className="mt-2">
              Each third party has its own cookie policy. We recommend reviewing their policies for more information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Managing Cookies</h2>
            <p>
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>View and delete cookies stored on your device</li>
              <li>Block all cookies or just third-party cookies</li>
              <li>Configure settings per website</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Blocking essential cookies will prevent you from using SiteSafe Pro. 
              Some features may not work correctly if you block functional or analytics cookies.
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Browser-Specific Instructions</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-gb/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Any changes will be posted on this page 
              with an updated revision date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> privacy@sitesafepro.co.uk<br />
              <strong>Address:</strong> SiteSafe Pro Ltd, London, United Kingdom
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
