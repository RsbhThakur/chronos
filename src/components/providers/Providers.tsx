'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { DemoProvider } from '@/lib/demo/demo-context';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SessionProvider>
      <DemoProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </DemoProvider>
    </SessionProvider>
  );
};
export default Providers;
