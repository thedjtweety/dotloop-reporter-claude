import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ModalBreadcrumb {
  id: string;
  title: string;
  subtitle?: string;
  onNavigate: () => void;
}

interface ModalContextType {
  breadcrumbs: ModalBreadcrumb[];
  currentModal: ModalBreadcrumb | null;
  canGoBack: boolean;
  pushModal: (breadcrumb: ModalBreadcrumb) => void;
  popModal: () => void;
  goBack: () => void;
  clearModals: () => void;
  navigateToModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<ModalBreadcrumb[]>([]);

  const currentModal = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;
  const canGoBack = breadcrumbs.length > 1;

  const pushModal = useCallback((breadcrumb: ModalBreadcrumb) => {
    setBreadcrumbs(prev => [...prev, breadcrumb]);
  }, []);

  const popModal = useCallback(() => {
    setBreadcrumbs(prev => prev.slice(0, -1));
  }, []);

  const goBack = useCallback(() => {
    if (canGoBack) {
      setBreadcrumbs(prev => prev.slice(0, -1));
    }
  }, [canGoBack]);

  const clearModals = useCallback(() => {
    setBreadcrumbs([]);
  }, []);

  const navigateToModal = useCallback((id: string) => {
    setBreadcrumbs(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;
      return prev.slice(0, index + 1);
    });
  }, []);

  return (
    <ModalContext.Provider value={{ breadcrumbs, currentModal, canGoBack, pushModal, popModal, goBack, clearModals, navigateToModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider');
  }
  return context;
}
