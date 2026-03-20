import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ModalBreadcrumb {
  id: string;
  title: string;
  subtitle?: string;
  onNavigate: () => void;
}

interface ModalContextType {
  breadcrumbs: ModalBreadcrumb[];
  pushModal: (breadcrumb: ModalBreadcrumb) => void;
  popModal: () => void;
  clearModals: () => void;
  navigateToModal: (id: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<ModalBreadcrumb[]>([]);

  const pushModal = useCallback((breadcrumb: ModalBreadcrumb) => {
    setBreadcrumbs(prev => [...prev, breadcrumb]);
  }, []);

  const popModal = useCallback(() => {
    setBreadcrumbs(prev => prev.slice(0, -1));
  }, []);

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
    <ModalContext.Provider value={{ breadcrumbs, pushModal, popModal, clearModals, navigateToModal }}>
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
