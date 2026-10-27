import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

function client(): SupabaseClient {
  if (!supabase) throw { message: 'Sign-in is not available: Supabase is not configured.' } as AuthError;
  return supabase;
}

export interface AuthError {
  message: string;
  code?: string;
}

export const auth = {
  /**
   * Sign up a new user with email and password.
   * Supabase automatically handles the profile creation via PostgreSQL trigger.
   */
  async signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) throw this.formatError(error);
    return data;
  },

  /**
   * Sign in an existing user with email and password.
   */
  async signIn(email: string, password: string) {
    const { data, error } = await client().auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw this.formatError(error);
    return data;
  },

  /**
   * Sign out the current user.
   */
  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw this.formatError(error);
  },

  /**
   * Get the current authenticated user session securely.
   */
  async getCurrentUser() {
    if (!supabase) return null;
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw this.formatError(error);
    return user;
  },

  /**
   * Listen for authentication state changes (login, logout, session expiration).
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Formats raw Supabase errors into user-friendly messages.
   */
  formatError(error: any): AuthError {
    // Unrecognised errors keep Supabase's own message rather than a generic one.
    let message = error?.message || 'An unexpected error occurred. Please try again.';
    const code = error.code || error.status?.toString();

    if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
      message = 'Too many attempts. Please wait a minute and try again.';
    } else if (error.message?.toLowerCase().includes('email not confirmed')) {
      message = 'Please confirm your email address first — check your inbox for the link.';
    } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
      message = 'Invalid email or password. Please try again.';
    } else if (error.message?.toLowerCase().includes('already registered')) {
      message = 'An account with this email already exists.';
    } else if (error.message?.toLowerCase().includes('password should be at least')) {
      message = 'Your password is too weak. Please use at least 6 characters.';
    } else if (error.message?.toLowerCase().includes('valid email')) {
      message = 'Please provide a valid email address.';
    } else if (error.message?.toLowerCase().includes('network')) {
      message = 'Network error. Please check your connection and try again.';
    }

    return { message, code };
  },
};
