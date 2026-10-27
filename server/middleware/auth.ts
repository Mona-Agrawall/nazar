import { NextFunction, Request, Response } from 'express';
import { SupabaseClient, User, createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isDemoMode, isSupabaseConfigured } from '../config.js';

let supabaseAuth: SupabaseClient | null = null;

function getAuthClient(): SupabaseClient {
  if (!supabaseAuth) {
    const { url, publishableKey } = getSupabaseConfig();
    supabaseAuth = createClient(url, publishableKey);
  }
  return supabaseAuth;
}

export interface AuthenticatedRequest extends Request {
  user?: User | null;
  token?: string;
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * In demo mode (VITE_DEMO_MODE=true, or Supabase not configured), requests without a token pass through
 * and use the in-memory demo session.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ') || !isSupabaseConfigured()) {
    if (isDemoMode()) {
      req.user = null;
      req.token = undefined;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const {
    data: { user },
    error,
  } = await getAuthClient().auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  req.token = token;
  next();
}
