import { Response } from "express";

/** Standard JSON error: {"error": {"message", "code"?}}. */
export function errorResponse(
  res: Response,
  message: string,
  status = 400,
  code?: string
): Response {
  const error: Record<string, unknown> = { message };
  if (code) error.code = code;
  return res.status(status).json({ error });
}

/** Standard JSON success response. */
export function successResponse(res: Response, data: unknown, status = 200): Response {
  return res.status(status).json(data);
}
