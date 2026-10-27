import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { auth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

// "Skip for now" lasts for the browser tab, so a reload does not bounce the user back to sign-in.
const DEMO_OVERRIDE_KEY = 'nazar_demo_override';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  /** True when demo mode was chosen via "Skip for now" and the user can go back to sign-in. */
  canExitDemo: boolean;
  setDemoMode: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isDemoMode: false,
  canExitDemo: false,
  setDemoMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoModeOverride, setIsDemoModeOverride] = useState(
    () => sessionStorage.getItem(DEMO_OVERRIDE_KEY) === 'true',
  );

  // Demo mode bypasses all auth — the app runs on in-memory session data.
  // Without Supabase configuration nobody can sign in, so demo mode is implied.
  const isDemoForced = import.meta.env.VITE_DEMO_MODE === 'true' || !isSupabaseConfigured;
  const isDemoMode = isDemoModeOverride || isDemoForced;

  const setDemoMode = (value: boolean) => {
    if (value) sessionStorage.setItem(DEMO_OVERRIDE_KEY, 'true');
    else sessionStorage.removeItem(DEMO_OVERRIDE_KEY);
    setIsDemoModeOverride(value);
  };

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
    <AuthContext.Provider
      value={{ user, isLoading, isDemoMode, canExitDemo: isDemoModeOverride && !isDemoForced, setDemoMode }}
    >
      {children}
    </AuthContext.Provider>
  );
};
