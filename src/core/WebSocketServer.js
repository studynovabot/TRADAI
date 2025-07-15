/**
 * TRADAI WebSocket Server
 * Real-time signal delivery and client communication
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketServer extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.wss = null;
    this.clients = new Map();
    this.port = config.websocket?.port || 8080;
    this.isRunning = false;
    
    // Signal tracking
    this.activeSignals = new Map();
    this.signalHistory = [];
    this.maxHistorySize = 100;
    
    // Client management
    this.clientCounter = 0;
    this.heartbeatInterval = null;
  }

  /**
   * Start WebSocket server
   */
  async start() {
    try {
      this.wss = new WebSocket.Server({ 
        port: this.port,
        perMessageDeflate: false
      });

      this.setupServerEvents();
      this.startHeartbeat();
      
      this.isRunning = true;
      this.logger.info(`🌐 WebSocket server started on port ${this.port}`);
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to start WebSocket server:', error);
      return false;
    }
  }

  /**
   * Setup WebSocket server event handlers
   */
  setupServerEvents() {
    this.wss.on('connection', (ws, request) => {
      const clientId = ++this.clientCounter;
      const clientInfo = {
        id: clientId,
        ws: ws,
        ip: request.socket.remoteAddress,
        connectedAt: new Date(),
        lastPing: Date.now(),
        subscriptions: new Set(['signals', 'market-data'])
      };

      this.clients.set(clientId, clientInfo);
      this.logger.info(`📱 Client ${clientId} connected from ${clientInfo.ip}`);

      // Send welcome message with current status
      this.sendToClient(clientId, {
        type: 'WELCOME',
        data: {
          clientId: clientId,
          serverTime: new Date().toISOString(),
          activeSignals: Array.from(this.activeSignals.values()),
          recentHistory: this.signalHistory.slice(-10)
        }
      });

      // Setup client event handlers
      this.setupClientEvents(clientId, ws);
    });

    this.wss.on('error', (error) => {
      this.logger.error('❌ WebSocket server error:', error);
    });
  }

  /**
   * Setup individual client event handlers
   */
  setupClientEvents(clientId, ws) {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleClientMessage(clientId, data);
      } catch (error) {
        this.logger.error(`❌ Invalid message from client ${clientId}:`, error);
      }
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    ws.on('close', (code, reason) => {
      this.clients.delete(clientId);
      this.logger.info(`📱 Client ${clientId} disconnected (${code}: ${reason})`);
    });

    ws.on('error', (error) => {
      this.logger.error(`❌ Client ${clientId} error:`, error);
      this.clients.delete(clientId);
    });
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'SUBSCRIBE':
        this.handleSubscription(clientId, message.data);
        break;
        
      case 'UNSUBSCRIBE':
        this.handleUnsubscription(clientId, message.data);
        break;
        
      case 'GET_SIGNAL_HISTORY':
        this.sendSignalHistory(clientId, message.data);
        break;
        
      case 'TRADE_EXECUTED':
        this.handleTradeExecution(clientId, message.data);
        break;
        
      case 'TRADE_SKIPPED':
        this.handleTradeSkip(clientId, message.data);
        break;
        
      case 'PING':
        this.sendToClient(clientId, { type: 'PONG', timestamp: Date.now() });
        break;
        
      default:
        this.logger.warn(`❓ Unknown message type from client ${clientId}: ${message.type}`);
    }
  }

  /**
   * Handle client subscriptions
   */
  handleSubscription(clientId, subscriptions) {
    const client = this.clients.get(clientId);
    if (!client) return;

    subscriptions.forEach(sub => client.subscriptions.add(sub));
    
    this.sendToClient(clientId, {
      type: 'SUBSCRIPTION_CONFIRMED',
      data: { subscriptions: Array.from(client.subscriptions) }
    });
  }

  /**
   * Handle client unsubscriptions
   */
  handleUnsubscription(clientId, subscriptions) {
    const client = this.clients.get(clientId);
    if (!client) return;

    subscriptions.forEach(sub => client.subscriptions.delete(sub));
    
    this.sendToClient(clientId, {
      type: 'UNSUBSCRIPTION_CONFIRMED',
      data: { subscriptions: Array.from(client.subscriptions) }
    });
  }

  /**
   * Send signal history to client
   */
  sendSignalHistory(clientId, params = {}) {
    const limit = Math.min(params.limit || 50, 100);
    const history = this.signalHistory.slice(-limit);
    
    this.sendToClient(clientId, {
      type: 'SIGNAL_HISTORY',
      data: {
        signals: history,
        total: this.signalHistory.length,
        limit: limit
      }
    });
  }

  /**
   * Handle trade execution notification
   */
  handleTradeExecution(clientId, tradeData) {
    this.logger.info(`📈 Client ${clientId} executed trade:`, tradeData);
    
    // Store trade execution for analytics
    this.emit('trade-executed', {
      clientId: clientId,
      ...tradeData,
      timestamp: new Date()
    });
    
    // Broadcast to other clients (optional)
    this.broadcast({
      type: 'TRADE_EXECUTED_BY_CLIENT',
      data: {
        clientId: clientId,
        signalId: tradeData.signalId,
        direction: tradeData.direction,
        amount: tradeData.amount
      }
    }, [clientId]); // Exclude the sender
  }

  /**
   * Handle trade skip notification
   */
  handleTradeSkip(clientId, skipData) {
    this.logger.info(`⏭️ Client ${clientId} skipped trade:`, skipData);
    
    this.emit('trade-skipped', {
      clientId: clientId,
      ...skipData,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast new signal to all connected clients
   */
  broadcastSignal(signalData) {
    const signal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...signalData
    };

    // Store signal
    this.activeSignals.set(signal.id, signal);
    this.addToHistory(signal);

    // Broadcast to subscribed clients
    this.broadcast({
      type: 'NEW_SIGNAL',
      data: signal
    }, [], ['signals']);

    this.logger.info(`📡 Signal broadcasted to ${this.getSubscribedClientCount('signals')} clients`);
    
    return signal.id;
  }

  /**
   * Broadcast market data update
   */
  broadcastMarketData(marketData) {
    this.broadcast({
      type: 'MARKET_DATA_UPDATE',
      data: {
        timestamp: new Date().toISOString(),
        ...marketData
      }
    }, [], ['market-data']);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send message to client ${clientId}:`, error);
      this.clients.delete(clientId);
      return false;
    }
  }

  /**
   * Broadcast message to multiple clients
   */
  broadcast(message, excludeClients = [], requiredSubscriptions = []) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      // Skip excluded clients
      if (excludeClients.includes(clientId)) return;
      
      // Check subscription requirements
      if (requiredSubscriptions.length > 0) {
        const hasRequiredSub = requiredSubscriptions.some(sub => 
          client.subscriptions.has(sub)
        );
        if (!hasRequiredSub) return;
      }
      
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    });
    
    return sentCount;
  }

  /**
   * Get count of clients subscribed to specific channel
   */
  getSubscribedClientCount(subscription) {
    let count = 0;
    this.clients.forEach(client => {
      if (client.subscriptions.has(subscription)) count++;
    });
    return count;
  }

  /**
   * Add signal to history
   */
  addToHistory(signal) {
    this.signalHistory.push(signal);
    
    // Maintain history size limit
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory = this.signalHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Start heartbeat to detect disconnected clients
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds
      
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          if (now - client.lastPing > timeout) {
            this.logger.warn(`⚠️ Client ${clientId} heartbeat timeout`);
            client.ws.terminate();
            this.clients.delete(clientId);
          } else {
            client.ws.ping();
          }
        } else {
          this.clients.delete(clientId);
        }
      });
    }, 15000); // Check every 15 seconds
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      connectedClients: this.clients.size,
      activeSignals: this.activeSignals.size,
      signalHistory: this.signalHistory.length,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Stop WebSocket server
   */
  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close all client connections
    this.clients.forEach((client, clientId) => {
      client.ws.close(1000, 'Server shutting down');
    });
    this.clients.clear();
    
    // Close server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.logger.info('🌐 WebSocket server stopped');
  }
}

module.exports = { WebSocketServer };
