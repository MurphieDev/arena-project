import React, { createContext, useContext, useState } from 'react';

interface DetailViewContextType {
  showDetailView: boolean;
  setShowDetailView: (show: boolean) => void;
}

const DetailViewContext = createContext<DetailViewContextType | undefined>(undefined);

export function DetailViewProvider({ children }: { children: React.ReactNode }) {
  const [showDetailView, setShowDetailView] = useState(false);

  return (
    <DetailViewContext.Provider value={{ showDetailView, setShowDetailView }}>
      {children}
    </DetailViewContext.Provider>
  );
}

export function useDetailView() {
  const context = useContext(DetailViewContext);
  if (!context) {
    throw new Error('useDetailView must be used within DetailViewProvider');
  }
  return context;
}
