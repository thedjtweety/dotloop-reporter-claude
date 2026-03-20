import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FullScreenModal from "@/components/FullScreenModal";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <FullScreenModal
      isOpen={onOpenChange ? open : internalOpen}
      onClose={() => handleOpenChange(false)}
      title={title || "Login Required"}
      subtitle="Please login with Manus to continue"
      headerActions={
        <Button
          onClick={onLogin}
          className="gap-2"
        >
          Login with Manus
        </Button>
      }
    >
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-6">
        {logo ? (
          <div className="w-20 h-20 bg-muted rounded-xl border border-border flex items-center justify-center">
            <img
              src={logo}
              alt="Dialog graphic"
              className="w-12 h-12 rounded-md"
            />
          </div>
        ) : null}

        <div className="text-center space-y-2 max-w-md">
          {title ? (
            <h2 className="text-2xl font-semibold text-foreground">
              {title}
            </h2>
          ) : null}
          <p className="text-muted-foreground">
            Please login with Manus to continue
          </p>
        </div>

        <Button
          onClick={onLogin}
          size="lg"
          className="mt-6"
        >
          Login with Manus
        </Button>
      </div>
    </FullScreenModal>
  );
}
