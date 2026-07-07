import { Request, Response, NextFunction } from "express";

/**
 * Authentication gate (stub — currently a pass-through) so the app runs out of
 * the box while preserving the convention. Replace the body with real
 * authentication (JWT/session) when wiring auth for production.
 */
export function authRequired(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
