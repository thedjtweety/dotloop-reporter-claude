import { users } from "../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import * as db from "../db";

type User = InferSelectModel<typeof users>;

export type TrpcContext = {
  req: Request;
  res: Response;
  user: User | null;
};

/**
 * Extract Dotloop session from cookie
 * The session cookie is set during the OAuth callback
 */
function extractDotloopSession(req: Request): string | null {
  try {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    return cookies.session || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get user from database by session
 * For now, we store the user during OAuth callback
 */
async function getUserFromSession(session: string | null): Promise<User | null> {
  if (!session) return null;

  try {
    // In a real implementation, you'd decode the session token and get the user ID
    // For now, we'll just get the first user (assuming single-user app)
    const dbInstance = await db.getDb();
    if (!dbInstance) return null;

    const userList = await dbInstance.select().from(users).limit(1);
    return userList[0] || null;
  } catch (error) {
    console.warn("[Context] Failed to get user from session:", error);
    return null;
  }
}

export async function createContext(opts: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Extract session cookie
    const session = extractDotloopSession(opts.req);
    if (session) {
      // Session exists, get user from database
      user = await getUserFromSession(session);
    }
  } catch (error) {
    // Authentication is optional for public procedures
    console.warn("[Context] Authentication failed:", error instanceof Error ? error.message : String(error));
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
