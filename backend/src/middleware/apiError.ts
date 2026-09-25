import { Response } from "express";
import { env } from "../config/env";

export function httpError(res: Response, status: number, err: any, code?: string): Response {
  if (status >= 500) {
    console.error(err);
  }

  const dev = env.NODE_ENV !== "production";
  const message = dev ? (err?.message ?? String(err)) : "Internal server error";

  return res.status(status).json({ error: code ?? "SERVER_ERROR", message });
}
