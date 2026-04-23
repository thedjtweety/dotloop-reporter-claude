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
        <Card className="p-8 border-dashed border-2 border-border bg-card/50 hover:bg-card/80 transition-colors">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-foreground">
                Connect to Dotloop
              </h3>
              <p className="text-foreground/70 text-base max-w-sm">
                Automatically sync your transaction data in real-time. No more manual CSV uploads—your reports update automatically every night.
              </p>
            </div>
            <div className="w-full space-y-3 py-4">
              <div className="flex items-center justify-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">Automatic sync every night</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Shield className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">Secure read-only access</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Zap className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">Real-time updates</span>
              </div>
            </div>
            <Button onClick={handleConnect} size="lg" className="w-full">
              <Link2 className="w-5 h-5 mr-2" />
              Login to Dotloop
            </Button>
          </div>
        </Card>

        <FullScreenModal
          isOpen={showDialog}
          onClose={handleClose}
          title="Dotloop Integration"
          headerActions={
            <Button onClick={handleClose} variant="outline">Got it</Button>
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
