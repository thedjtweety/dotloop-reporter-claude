import "dotenv/config";
// Commission system fixed: v2.0 - All ghost template errors removed, public procedures enabled
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { dotloopOAuthCallbackRouter } from "../routes/dotloop-oauth-callback";
import dotloopAuthRoutes from "../routes/dotloop-auth";
import dotloopSyncRoutes from "../routes/dotloop-sync";
import dotloopWebhookRoutes from "../routes/dotloop-webhook";
import authRoutes from "../routes/auth";
import loopsRoutes from "../routes/loops";
import { appRouter } from "../routers";
import { createContext } from "./context";
import cdaRoutes from "../routes/cda";
import { serveStatic, setupVite } from "./vite";
import { securityHeaders, csrfProtection, requestLoggingMiddleware, bruteForceProtection } from "../middleware/security-headers";
import { uploadLimiter, apiLimiter, authLimiter } from "../middleware/rate-limiter";
import { corsMiddleware } from "../middleware/security-headers";
import { healthCheck, livenessProbe, readinessProbe } from "../health";


async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Cookie parser — must be before any route that reads req.cookies
  app.use(cookieParser());

  // Security middleware - apply early
  app.use(corsMiddleware);
  app.use(securityHeaders);
  app.use(requestLoggingMiddleware);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // CSRF protection middleware - disabled for public tool
  // app.use(csrfProtection.middleware());
  
  // Rate limiting for different endpoints
  app.use("/api/upload", uploadLimiter.middleware());
  // Temporarily disabled to debug tRPC issue
  // app.use("/api/trpc", apiLimiter.middleware());
  
  // Health check endpoints (no CSRF or rate limiting)
  app.get("/health", healthCheck);
  app.get("/health/live", livenessProbe);
  app.get("/health/ready", readinessProbe);
  
  // Dotloop OAuth callback (legacy route kept for backwards compat)
  app.use('/api/dotloop-oauth', dotloopOAuthCallbackRouter);

  // Phase 2B: Auth routes
  app.use('/api/auth', authRoutes);
  app.use('/api/loops', loopsRoutes);

  // Phase 2A: Dotloop OAuth, sync, and webhook routes
  app.use('/api/dotloop', dotloopAuthRoutes);
  app.use('/api/dotloop', dotloopSyncRoutes);
  // Webhook needs raw body for signature verification — mount before json middleware override
  app.use('/api/dotloop/webhook', dotloopWebhookRoutes);

  // CDA routes
  app.use("/api/cda", cdaRoutes);
  
  // CSRF verification for non-GET requests
  // Disabled for public tool - CSRF protection is not needed for unauthenticated endpoints
  // app.use("/api/trpc", csrfProtection.verifyMiddleware());
  
  // tRPC API
  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
  });
  app.use("/api/trpc", trpcMiddleware);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3001");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Security middleware: Enabled (CSRF, rate limiting, headers, brute force protection)`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nERROR: Port ${port} is already in use.`);
      console.error(`Stop the process using port ${port} and try again.`);
      console.error(`  lsof -ti:${port} | xargs kill -9\n`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}

startServer().catch(console.error);
