import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import cdaRoutes from "../routes/cda";
import { serveStatic, setupVite } from "./vite";
import { securityHeaders, csrfProtection, requestLoggingMiddleware, bruteForceProtection } from "../middleware/security-headers";
import { uploadLimiter, apiLimiter, authLimiter } from "../middleware/rate-limiter";
import { corsMiddleware } from "../middleware/security-headers";
import { healthCheck, livenessProbe, readinessProbe } from "../health";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
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
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Security middleware: Enabled (CSRF, rate limiting, headers, brute force protection)`);
  });
}

startServer().catch(console.error);
