import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';

/**
 * WebSocket Integration for Real-Time Transaction Sync
 * 
 * Features:
 * - Real-time transaction updates
 * - Commission calculation broadcasts
 * - Report generation notifications
 * - Multi-tenant isolation
 */

export function setupWebSocket(app: express.Application) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.data.user = decoded;
      socket.data.tenantId = (decoded as any).tenantId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const tenantId = socket.data.tenantId;
    const userId = socket.data.user?.id;

    console.log(`User ${userId} connected to tenant ${tenantId}`);

    // Join tenant-specific room
    socket.join(`tenant:${tenantId}`);

    // Transaction sync event
    socket.on('transaction:sync', (data) => {
      // Broadcast to all users in the tenant
      io.to(`tenant:${tenantId}`).emit('transaction:updated', {
        transactionId: data.id,
        timestamp: new Date(),
        changes: data.changes,
      });
    });

    // Commission calculation event
    socket.on('commission:calculate', (data) => {
      io.to(`tenant:${tenantId}`).emit('commission:calculated', {
        calculationId: data.id,
        result: data.result,
        timestamp: new Date(),
      });
    });

    // Report generation event
    socket.on('report:generate', (data) => {
      io.to(`tenant:${tenantId}`).emit('report:generated', {
        reportId: data.id,
        format: data.format,
        url: data.url,
        timestamp: new Date(),
      });
    });

    // Dashboard update event
    socket.on('dashboard:refresh', (data) => {
      io.to(`tenant:${tenantId}`).emit('dashboard:updated', {
        metrics: data.metrics,
        timestamp: new Date(),
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from tenant ${tenantId}`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  return { httpServer, io };
}

/**
 * Broadcast utilities for server-side events
 */
export function createBroadcaster(io: Server) {
  return {
    // Broadcast transaction update to tenant
    broadcastTransactionUpdate: (tenantId: number, transaction: any) => {
      io.to(`tenant:${tenantId}`).emit('transaction:updated', {
        transaction,
        timestamp: new Date(),
      });
    },

    // Broadcast commission calculation result
    broadcastCommissionCalculation: (tenantId: number, calculation: any) => {
      io.to(`tenant:${tenantId}`).emit('commission:calculated', {
        calculation,
        timestamp: new Date(),
      });
    },

    // Broadcast report generation completion
    broadcastReportGenerated: (tenantId: number, report: any) => {
      io.to(`tenant:${tenantId}`).emit('report:generated', {
        report,
        timestamp: new Date(),
      });
    },

    // Broadcast dashboard metrics update
    broadcastDashboardUpdate: (tenantId: number, metrics: any) => {
      io.to(`tenant:${tenantId}`).emit('dashboard:updated', {
        metrics,
        timestamp: new Date(),
      });
    },

    // Broadcast team member update
    broadcastTeamUpdate: (tenantId: number, member: any) => {
      io.to(`tenant:${tenantId}`).emit('team:updated', {
        member,
        timestamp: new Date(),
      });
    },

    // Broadcast audit log event
    broadcastAuditLog: (tenantId: number, auditLog: any) => {
      io.to(`tenant:${tenantId}`).emit('audit:logged', {
        auditLog,
        timestamp: new Date(),
      });
    },
  };
}
