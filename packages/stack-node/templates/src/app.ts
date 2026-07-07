import express, { Express, NextFunction, Request, Response } from "express";
import { readdirSync } from "fs";
import { join } from "path";

/**
 * Create the Express app, auto-registering every router under `src/routes`. Drop
 * a new `src/routes/<resource>.ts` that exports `router` (an express.Router) and
 * it is wired up automatically — no changes here required.
 */
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const routesDir = join(__dirname, "routes");
  for (const file of readdirSync(routesDir)) {
    if (!/\.(ts|js)$/.test(file) || file.endsWith(".d.ts")) continue;
    const mod = require(join(routesDir, file.replace(/\.(ts|js)$/, "")));
    if (mod.router) app.use(mod.router);
  }

  // Fallback error handler.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: { message: err.message } });
  });

  return app;
}
