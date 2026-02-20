import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Privacy Policy</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              <strong>Effective Date:</strong> February 20, 2026<br />
              <strong>Last Updated:</strong> February 20, 2026
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
            <p className="text-foreground/90 leading-relaxed">
              Dotloop Reporter ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our real estate analytics and reporting platform (the "Service").
            </p>
            <p className="text-foreground/90 leading-relaxed">
              By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Personal Information</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              We collect personal information that you voluntarily provide to us when you register for an account, connect your Dotloop account via OAuth, upload CSV files, configure commission plans, or contact us for support.
            </p>
            <p className="text-foreground/90 leading-relaxed">Personal information may include:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, company/brokerage name, role</li>
              <li><strong>Authentication Data:</strong> OAuth tokens, session identifiers (encrypted and stored securely)</li>
              <li><strong>Profile Information:</strong> User preferences, privacy settings, notification preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Transaction Data</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              When you connect your Dotloop account or upload CSV files, we collect and process:
            </p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Real Estate Transaction Data:</strong> Loop names, statuses, property addresses, sale prices, closing dates</li>
              <li><strong>Agent Information:</strong> Agent names, team assignments, commission structures</li>
              <li><strong>Financial Data:</strong> Commission amounts, splits, payment schedules</li>
              <li><strong>Custom Fields:</strong> Any additional data fields you choose to import</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Automatically Collected Information</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              We automatically collect certain information when you use the Service:
            </p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Performance Data:</strong> Load times, errors, API response times</li>
              <li><strong>Audit Logs:</strong> User actions, data access events, security events (retained for 90-365 days)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              We use collected information for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Service Delivery:</strong> Provide, operate, and maintain the Service; process and display your transaction data and analytics</li>
              <li><strong>Personalization:</strong> Customize your dashboard and user experience; remember your preferences and settings</li>
              <li><strong>Communication:</strong> Send service-related notifications; respond to inquiries and support requests</li>
              <li><strong>Security and Compliance:</strong> Monitor for suspicious activity; enforce our Terms of Service; maintain audit logs</li>
              <li><strong>Analytics and Improvement:</strong> Analyze usage patterns to improve the Service; develop new features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Sharing and Disclosure</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              <strong>We do not sell your personal information.</strong> We may share your information in the following circumstances:
            </p>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Within Your Organization</h3>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Team Members:</strong> Users within your brokerage may view shared transaction data based on role-based permissions</li>
              <li><strong>Administrators:</strong> Brokerage admins can view team data, manage users, and access audit logs</li>
              <li><strong>Privacy Controls:</strong> You can configure commission visibility settings to control what data others can see</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Service Providers</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              We may share information with third-party service providers who perform services on our behalf (cloud hosting, authentication, analytics). All service providers are contractually obligated to protect your information.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Legal Requirements</h3>
            <p className="text-foreground/90 leading-relaxed">
              We may disclose your information if required by law, court orders, legal processes, or to protect our rights, property, or safety.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Security</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Encryption:</strong> Data encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li><strong>Access Controls:</strong> Role-based access control (RBAC) with granular permissions</li>
              <li><strong>Authentication:</strong> Secure OAuth 2.0 authentication with session management</li>
              <li><strong>Rate Limiting:</strong> Protection against brute force and denial-of-service attacks</li>
              <li><strong>Audit Logging:</strong> Comprehensive logging of all data access and security events</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-3">
              Despite our efforts, no security system is impenetrable. We cannot guarantee absolute security of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Your Privacy Rights</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Access and Portability:</strong> Request a copy of your personal information; download your transaction data</li>
              <li><strong>Control and Correction:</strong> Update or correct inaccurate information; configure privacy settings</li>
              <li><strong>Deletion and Restriction:</strong> Request deletion of your personal information; limit how we process your data</li>
              <li><strong>Objection and Withdrawal:</strong> Object to certain data processing activities; revoke consent</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-3">
              To exercise these rights, contact us at <a href="mailto:privacy@dotloop.com" className="text-primary hover:underline">privacy@dotloop.com</a> or use the in-app privacy settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">California Privacy Rights (CCPA)</h2>
            <p className="text-foreground/90 leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act, including the right to know what personal information we collect, the right to delete your personal information, and the right to opt-out of the sale of personal information (we do not sell personal information).
            </p>
            <p className="text-foreground/90 leading-relaxed mt-3">
              To submit a CCPA request, email <a href="mailto:privacy@dotloop.com" className="text-primary hover:underline">privacy@dotloop.com</a> with "CCPA Request" in the subject line.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">European Privacy Rights (GDPR)</h2>
            <p className="text-foreground/90 leading-relaxed">
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation, including the right to access, rectify, erase, restrict processing, data portability, and object to processing. You also have the right to lodge a complaint with your local data protection authority.
            </p>
            <p className="text-foreground/90 leading-relaxed mt-3">
              Contact our Data Protection Officer at <a href="mailto:dpo@dotloop.com" className="text-primary hover:underline">dpo@dotloop.com</a> for privacy inquiries.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Children's Privacy</h2>
            <p className="text-foreground/90 leading-relaxed">
              The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to This Privacy Policy</h2>
            <p className="text-foreground/90 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website, sending an email notification, or displaying a prominent notice in the Service. Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-foreground/90 leading-relaxed">
              If you have questions or concerns about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none pl-0 text-foreground/90 space-y-2 mt-3">
              <li><strong>Email:</strong> <a href="mailto:privacy@dotloop.com" className="text-primary hover:underline">privacy@dotloop.com</a></li>
              <li><strong>Data Protection Officer:</strong> <a href="mailto:dpo@dotloop.com" className="text-primary hover:underline">dpo@dotloop.com</a></li>
              <li><strong>Support:</strong> Available through the in-app help center</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground italic">
              This Privacy Policy is designed to comply with GDPR, CCPA, and other applicable privacy laws. It should be reviewed by legal counsel before deployment.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
