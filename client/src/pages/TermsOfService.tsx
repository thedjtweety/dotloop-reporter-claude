import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Terms of Service</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">
              <strong>Effective Date:</strong> February 20, 2026<br />
              <strong>Last Updated:</strong> February 20, 2026
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Agreement to Terms</h2>
            <p className="text-foreground/90 leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Dotloop Reporter ("Company," "we," "our," or "us") governing your access to and use of the Dotloop Reporter platform (the "Service").
            </p>
            <p className="text-foreground/90 leading-relaxed">
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Eligibility</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">To use the Service, you must:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Be a licensed real estate professional or authorized employee of a real estate brokerage</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-3">
              By using the Service, you represent and warrant that you meet these eligibility requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Account Registration and Security</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Account Creation</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">To access certain features, you must create an account by:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li>Providing accurate and complete registration information</li>
              <li>Connecting your Dotloop account via OAuth 2.0 authentication</li>
              <li>Accepting these Terms and our Privacy Policy</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Account Security</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">You are responsible for:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access or security breaches</li>
              <li>Using strong passwords and enabling available security features</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Account Types and Roles</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">The Service supports multiple user roles with different permissions:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li><strong>Admin:</strong> Full system access, user management, audit log viewing</li>
              <li><strong>Broker:</strong> Team data access, commission plan management, agent oversight</li>
              <li><strong>Agent:</strong> Personal and team data access, upload capabilities</li>
              <li><strong>Viewer:</strong> Read-only access to assigned data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Acceptable Use</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Permitted Uses</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">You may use the Service to:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li>Import and analyze real estate transaction data</li>
              <li>Generate commission reports and financial analytics</li>
              <li>Manage commission plans and agent assignments</li>
              <li>Export reports for business purposes</li>
              <li>Collaborate with team members within your brokerage</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Prohibited Uses</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">You may NOT:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or other users' data</li>
              <li>Scrape, crawl, or use automated tools to extract data beyond normal use</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Resell, sublicense, or redistribute the Service without authorization</li>
              <li>Impersonate another user or provide false information</li>
            </ul>
            <p className="text-foreground/90 leading-relaxed mt-3">
              Violation of these prohibitions may result in immediate account termination and legal action.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data and Content</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Your Data</h3>
            <p className="text-foreground/90 leading-relaxed">
              You retain ownership of all data you upload to the Service ("Your Data"), including transaction records, agent data, commission structures, and custom fields.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">License to Your Data</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              By uploading Your Data, you grant us a limited, non-exclusive license to store, process, display, and analyze Your Data to provide the Service. This license terminates when you delete Your Data or close your account.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Your Responsibilities</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">You are solely responsible for:</p>
            <ul className="list-disc pl-6 text-foreground/90 space-y-2">
              <li>The accuracy, legality, and quality of Your Data</li>
              <li>Ensuring you have the right to upload and share Your Data</li>
              <li>Compliance with data protection laws (GDPR, CCPA, etc.)</li>
              <li>Obtaining necessary consents from individuals whose data you process</li>
              <li>Maintaining backups of Your Data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Dotloop Integration</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">OAuth Connection</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              The Service connects to your Dotloop account using OAuth 2.0 authentication. By connecting, you authorize us to access your Dotloop transaction data and agree to Dotloop's Terms of Service and Privacy Policy.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              <strong>Important:</strong> We are not affiliated with or endorsed by Dotloop. Dotloop is a third-party service, and we are not responsible for Dotloop's availability, performance, data accuracy, or handling of your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Privacy and Data Protection</h2>
            <p className="text-foreground/90 leading-relaxed">
              Our collection and use of personal information is governed by our <Link href="/privacy"><a className="text-primary hover:underline">Privacy Policy</a></Link>, which is incorporated into these Terms by reference.
            </p>
            <p className="text-foreground/90 leading-relaxed mt-3">
              We implement industry-standard security measures, including encryption (TLS 1.2+, AES-256), role-based access control, audit logging, and regular security assessments. However, no system is completely secure. You use the Service at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Intellectual Property</h2>
            <p className="text-foreground/90 leading-relaxed">
              The Service and all related content, features, and functionality are owned by us and protected by copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>
            <p className="text-foreground/90 leading-relaxed mt-3">
              "Dotloop Reporter" and related logos are our trademarks. You may not use our trademarks without prior written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Term and Termination</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Termination by You</h3>
            <p className="text-foreground/90 leading-relaxed">
              You may terminate your account at any time by using the account deletion feature in settings or contacting our support team.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Termination by Us</h3>
            <p className="text-foreground/90 leading-relaxed mb-3">
              We may suspend or terminate your account immediately if you violate these Terms, engage in fraudulent or illegal activity, pose a security risk, or fail to pay applicable fees.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Effect of Termination</h3>
            <p className="text-foreground/90 leading-relaxed">
              Upon termination, your right to access the Service immediately ceases. We may delete Your Data after 30 days. You may export Your Data before termination using our data export features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Disclaimers and Limitations of Liability</h2>
            
            <div className="bg-muted/50 p-6 rounded-lg border border-border mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">Disclaimer of Warranties</h3>
              <p className="text-foreground/90 leading-relaxed uppercase text-sm">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR REQUIREMENTS, BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </div>

            <div className="bg-muted/50 p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-3">Limitation of Liability</h3>
              <p className="text-foreground/90 leading-relaxed uppercase text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE GREATER OF $100 USD OR THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Dispute Resolution</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              These Terms are governed by the laws of the State of Delaware, United States. Any dispute arising from these Terms or the Service shall be resolved through binding arbitration administered by the American Arbitration Association (AAA).
            </p>
            <p className="text-foreground/90 leading-relaxed">
              You agree to arbitrate disputes on an individual basis (no class actions) and waive your right to a jury trial. Before initiating arbitration, you agree to attempt informal resolution by contacting us at <a href="mailto:legal@dotloop.com" className="text-primary hover:underline">legal@dotloop.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">General Provisions</h2>
            <p className="text-foreground/90 leading-relaxed mb-3">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service.
            </p>
            <p className="text-foreground/90 leading-relaxed">
              We may modify these Terms at any time by posting updated Terms on our website and notifying you via email or in-app notification. Your continued use after changes become effective constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Information</h2>
            <p className="text-foreground/90 leading-relaxed">
              For questions about these Terms, please contact us:
            </p>
            <ul className="list-none pl-0 text-foreground/90 space-y-2 mt-3">
              <li><strong>Email:</strong> <a href="mailto:legal@dotloop.com" className="text-primary hover:underline">legal@dotloop.com</a></li>
              <li><strong>Support:</strong> Available through the in-app help center</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground italic">
              These Terms of Service should be reviewed by legal counsel before deployment to ensure compliance with applicable laws and regulations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
