import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { auth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  setDemoMode: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isDemoMode: false,
  setDemoMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoModeOverride, setIsDemoModeOverride] = useState(false);

  // Demo mode bypasses all auth — the app runs on in-memory session data.
  // Without Supabase configuration nobody can sign in, so demo mode is implied.
  const isDemoMode = isDemoModeOverride || import.meta.env.VITE_DEMO_MODE === 'true' || !isSupabaseConfigured;

  useEffect(() => {
    // In demo mode: skip auth entirely, set loading to false immediately
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }

    // Initial fetch of the session
    const initSession = async () => {
      try {
        const currentUser = await auth.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth events (e.g. login, logout, token refresh)
    const { data: authListener } = auth.onAuthStateChange((_event, newSession) => {
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isDemoMode]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isDemoMode, setDemoMode: setIsDemoModeOverride }}>
      {children}
    </AuthContext.Provider>
  );
};
