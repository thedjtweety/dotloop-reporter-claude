import { Link } from 'wouter';
import { Shield, FileText, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Dotloop Reporter</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Professional real estate analytics and commission reporting platform for brokerages and agents.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy">
                  <a className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Privacy Policy
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Terms of Service
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:support@dotloop.com" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  support@dotloop.com
                </a>
              </li>
              <li>
                <a 
                  href="mailto:privacy@dotloop.com" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  privacy@dotloop.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Dotloop Reporter. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy-policy">
                <a className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Privacy
                </a>
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/terms">
                <a className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Terms
                </a>
              </Link>
              <span className="text-muted-foreground">•</span>
              <a 
                href="mailto:legal@dotloop.com" 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Legal
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
