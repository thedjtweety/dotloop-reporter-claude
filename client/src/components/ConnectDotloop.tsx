import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FullScreenModal from '@/components/FullScreenModal';
import { Link2, CheckCircle2, Shield, Zap } from 'lucide-react';

interface ConnectDotloopProps {
  variant?: 'button' | 'card';
  onConnect?: () => void;
}

export default function ConnectDotloop({ variant = 'button', onConnect }: ConnectDotloopProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleConnect = () => {
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
  };

  const modalContent = (
    <div className="max-w-2xl mx-auto py-12">
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          This feature is coming soon! In the final version, you'll be able to securely connect your Dotloop account to automatically sync your transaction data.
        </p>
        <div className="bg-muted p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-foreground">Automatic Sync</p>
              <p className="text-sm text-muted-foreground">Your data updates every night automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-foreground">Secure Connection</p>
              <p className="text-sm text-muted-foreground">Read-only access to your Dotloop data</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Zap className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-foreground">Real-time Updates</p>
              <p className="text-sm text-muted-foreground">Reports reflect your latest transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <>
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Login to Dotloop
              </h3>
              <p className="text-sm text-foreground mb-4">
                Automatically sync your transaction data in real-time. No more manual CSV uploads—your reports update automatically every night.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-foreground">Automatic sync</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-foreground">Read-only access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-foreground">Real-time updates</span>
                </div>
              </div>
              <Button onClick={handleConnect} className="w-full md:w-auto">
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Login to Dotloop
                </>
              </Button>
            </div>
          </div>
        </Card>

        <FullScreenModal
          isOpen={showDialog}
          onClose={handleClose}
          title="Dotloop Integration"
          headerActions={
            <Button onClick={handleClose}>Got it</Button>
          }
        >
          {modalContent}
        </FullScreenModal>
      </>
    );
  }

  return (
    <>
      <Button onClick={handleConnect} variant="outline" className="gap-2">
        <>
          <Link2 className="w-4 h-4" />
          Login to Dotloop
        </>
      </Button>

      <FullScreenModal
        isOpen={showDialog}
        onClose={handleClose}
        title="Dotloop Integration"
        headerActions={
          <Button onClick={handleClose}>Got it</Button>
        }
      >
        {modalContent}
      </FullScreenModal>
    </>
  );
}
