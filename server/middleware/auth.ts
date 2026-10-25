import { NextFunction, Request, Response } from 'express';
import { User, createClient } from '@supabase/supabase-js';

const supabaseAuth = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');

export interface AuthenticatedRequest extends Request {
  user?: User | null;
  token?: string;
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * When VITE_DEMO_MODE=true, requests without a token pass through and use the in-memory demo session.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.VITE_DEMO_MODE === 'true') {
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
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  req.token = token;
  next();
}
