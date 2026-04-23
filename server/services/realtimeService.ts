import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

/**
 * Real-Time Updates Service
 * Handles WebSocket connections for live transaction updates
 */

interface SyncUpdate {
  type: 'sync_started' | 'sync_progress' | 'sync_completed' | 'sync_error';
  userId: number;
  tenantId: number;
  data: {
    transactionsFetched?: number;
    transactionsCreated?: number;
    transactionsUpdated?: number;
    error?: string;
    progress?: number;
  };
  timestamp: string;
}

interface TransactionUpdate {
  type: 'transaction_created' | 'transaction_updated' | 'transaction_deleted';
  userId: number;
  tenantId: number;
  transactionId: number;
  data: any;
  timestamp: string;
}

export class RealtimeService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<number, Set<string>> = new Map();

  /**
   * Initialize Socket.io server
   */
  initializeSocketIO(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);

      // Handle user joining
      socket.on('join_user', (userId: number) => {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);
        socket.join(`user_${userId}`);
        console.log(`[Socket.io] User ${userId} joined`);
      });

      // Handle user leaving
      socket.on('leave_user', (userId: number) => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        socket.leave(`user_${userId}`);
        console.log(`[Socket.io] User ${userId} left`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        // Clean up user sockets
        for (const [userId, sockets] of this.userSockets.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.userSockets.delete(userId);
            }
          }
        }
      });
    });

    return this.io;
  }

  /**
   * Broadcast sync update to user
   */
  broadcastSyncUpdate(update: SyncUpdate) {
    if (!this.io) return;

    const room = `user_${update.userId}`;
    this.io.to(room).emit('sync_update', update);
    console.log(`[Socket.io] Sync update sent to ${room}:`, update);
  }

  /**
   * Broadcast transaction update to user
   */
  broadcastTransactionUpdate(update: TransactionUpdate) {
    if (!this.io) return;

    const room = `user_${update.userId}`;
    this.io.to(room).emit('transaction_update', update);
    console.log(`[Socket.io] Transaction update sent to ${room}:`, update);
  }

  /**
   * Broadcast sync started
   */
  syncStarted(userId: number, tenantId: number) {
    this.broadcastSyncUpdate({
      type: 'sync_started',
      userId,
      tenantId,
      data: {
        progress: 0,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast sync progress
   */
  syncProgress(userId: number, tenantId: number, progress: number) {
    this.broadcastSyncUpdate({
      type: 'sync_progress',
      userId,
      tenantId,
      data: {
        progress,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast sync completed
   */
  syncCompleted(
    userId: number,
    tenantId: number,
    transactionsFetched: number,
    transactionsCreated: number,
    transactionsUpdated: number
  ) {
    this.broadcastSyncUpdate({
      type: 'sync_completed',
      userId,
      tenantId,
      data: {
        transactionsFetched,
        transactionsCreated,
        transactionsUpdated,
        progress: 100,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast sync error
   */
  syncError(userId: number, tenantId: number, error: string) {
    this.broadcastSyncUpdate({
      type: 'sync_error',
      userId,
      tenantId,
      data: {
        error,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast transaction created
   */
  transactionCreated(userId: number, tenantId: number, transactionId: number, data: any) {
    this.broadcastTransactionUpdate({
      type: 'transaction_created',
      userId,
      tenantId,
      transactionId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast transaction updated
   */
  transactionUpdated(userId: number, tenantId: number, transactionId: number, data: any) {
    this.broadcastTransactionUpdate({
      type: 'transaction_updated',
      userId,
      tenantId,
      transactionId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get Socket.io instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const realtimeService = new RealtimeService();
