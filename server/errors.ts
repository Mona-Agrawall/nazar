import { NextFunction, Request, Response } from 'express';

/** An error whose message is safe to show to the user (e.g. a broken business rule). */
export class ClientError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** Sends client errors as-is; logs anything else and returns a generic message without internals. */
export function sendError(res: Response, err: unknown) {
  if (err instanceof ClientError) return res.status(err.status).json({ error: err.message });
  console.error('[API] Unexpected error:', err);
  return res.status(500).json({ error: GENERIC_MESSAGE });
}

/** Final Express error handler: JSON responses, no stack traces. */
export function errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  return sendError(res, err);
}
