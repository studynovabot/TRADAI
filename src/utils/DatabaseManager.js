/**
 * DatabaseManager - SQLite Database for Trading Data
 * 
 * Manages all data storage including market data, decisions, trades, and performance metrics
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { Logger } = require('./Logger');

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    this.db = null;
    this.dbPath = config.database.path;
    
    this.logger.info('🗄️ DatabaseManager initialized');
  }
  
  /**
   * Initialize database and create tables
   */
  async initialize() {
    try {
      // Ensure database directory exists
      await fs.ensureDir(path.dirname(this.dbPath));
      
      // Open database connection
      this.db = new sqlite3.Database(this.dbPath);
      
      // Create tables
      await this.createTables();
      
      this.logger.info('✅ Database initialized successfully');
      
    } catch (error) {
      this.logger.logError('Database Initialization', error);
      throw error;
    }
  }
  
  /**
   * Create all required tables
   */
  async createTables() {
    const tables = [
      // Market data table
      `CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency_pair TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // AI decisions table
      `CREATE TABLE IF NOT EXISTS ai_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency_pair TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        decision TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        reason TEXT NOT NULL,
        technical_data TEXT, -- JSON string
        market_data TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Trades table
      `CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency_pair TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        direction TEXT NOT NULL, -- BUY/SELL
        amount REAL NOT NULL,
        duration INTEGER NOT NULL, -- minutes
        confidence INTEGER NOT NULL,
        reason TEXT NOT NULL,
        trade_id TEXT,
        type TEXT NOT NULL, -- PAPER/REAL
        status TEXT NOT NULL, -- EXECUTED/FAILED
        result TEXT, -- WIN/LOSS (updated later)
        profit_loss REAL, -- Updated after trade closes
        execution_time INTEGER, -- milliseconds
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Performance metrics table
      `CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        currency_pair TEXT NOT NULL,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,
        total_profit_loss REAL DEFAULT 0,
        avg_confidence REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, currency_pair)
      )`,
      
      // System logs table
      `CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        error_details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const tableSQL of tables) {
      await this.runQuery(tableSQL);
    }
    
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_market_data_pair ON market_data(currency_pair)',
      'CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON ai_decisions(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(currency_pair)',
      'CREATE INDEX IF NOT EXISTS idx_performance_date ON performance_metrics(date)'
    ];
    
    for (const indexSQL of indexes) {
      await this.runQuery(indexSQL);
    }
  }
  
  /**
   * Store market candle data
   */
  async storeCandle(candle) {
    try {
      const sql = `INSERT INTO market_data 
        (currency_pair, timestamp, open, high, low, close, volume) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        candle.currencyPair,
        candle.timestamp.toISOString(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume || 0
      ];
      
      await this.runQuery(sql, params);
      
    } catch (error) {
      this.logger.logError('Store Candle', error, { candle });
    }
  }
  
  /**
   * Store AI decision
   */
  async storeDecision(decision) {
    try {
      const sql = `INSERT INTO ai_decisions 
        (currency_pair, timestamp, decision, confidence, reason, technical_data, market_data) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        decision.currencyPair,
        decision.timestamp.toISOString(),
        decision.decision,
        decision.confidence,
        decision.reason,
        JSON.stringify(decision.technicalData),
        JSON.stringify(decision.marketData)
      ];
      
      await this.runQuery(sql, params);
      
    } catch (error) {
      this.logger.logError('Store Decision', error, { decision });
    }
  }
  
  /**
   * Store trade execution
   */
  async storeTrade(trade) {
    try {
      const sql = `INSERT INTO trades 
        (currency_pair, timestamp, direction, amount, duration, confidence, reason, 
         trade_id, type, status, execution_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        trade.currencyPair,
        trade.timestamp.toISOString(),
        trade.direction,
        trade.amount,
        trade.duration,
        trade.confidence,
        trade.reason,
        trade.tradeId || null,
        trade.type,
        trade.status,
        trade.executionTime || null
      ];
      
      const result = await this.runQuery(sql, params);
      
      // Update daily performance metrics
      await this.updatePerformanceMetrics(trade);
      
      return result.lastID;
      
    } catch (error) {
      this.logger.logError('Store Trade', error, { trade });
    }
  }
  
  /**
   * Update trade result (WIN/LOSS)
   */
  async updateTradeResult(tradeId, result, profitLoss) {
    try {
      const sql = `UPDATE trades 
        SET result = ?, profit_loss = ? 
        WHERE trade_id = ?`;
      
      await this.runQuery(sql, [result, profitLoss, tradeId]);
      
      // Update performance metrics
      await this.recalculatePerformanceMetrics();
      
    } catch (error) {
      this.logger.logError('Update Trade Result', error, { tradeId, result, profitLoss });
    }
  }
  
  /**
   * Update daily performance metrics
   */
  async updatePerformanceMetrics(trade) {
    try {
      const date = trade.timestamp.toISOString().split('T')[0];
      
      const sql = `INSERT OR REPLACE INTO performance_metrics 
        (date, currency_pair, total_trades, winning_trades, losing_trades, 
         win_rate, total_profit_loss, avg_confidence) 
        SELECT 
          ? as date,
          ? as currency_pair,
          COUNT(*) as total_trades,
          SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as winning_trades,
          SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losing_trades,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              (SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
            ELSE 0 
          END as win_rate,
          COALESCE(SUM(profit_loss), 0) as total_profit_loss,
          AVG(confidence) as avg_confidence
        FROM trades 
        WHERE DATE(timestamp) = ? AND currency_pair = ?`;
      
      await this.runQuery(sql, [date, trade.currencyPair, date, trade.currencyPair]);
      
    } catch (error) {
      this.logger.logError('Update Performance Metrics', error);
    }
  }
  
  /**
   * Get trading statistics
   */
  async getTradingStats(currencyPair = null, days = 30) {
    try {
      let sql = `SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losing_trades,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
          ELSE 0 
        END as win_rate,
        COALESCE(SUM(profit_loss), 0) as total_profit_loss,
        AVG(confidence) as avg_confidence,
        MIN(timestamp) as first_trade,
        MAX(timestamp) as last_trade
        FROM trades 
        WHERE timestamp >= datetime('now', '-${days} days')`;
      
      const params = [];
      
      if (currencyPair) {
        sql += ' AND currency_pair = ?';
        params.push(currencyPair);
      }
      
      const stats = await this.getQuery(sql, params);
      
      return stats || {
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_profit_loss: 0,
        avg_confidence: 0
      };
      
    } catch (error) {
      this.logger.logError('Get Trading Stats', error);
      return null;
    }
  }
  
  /**
   * Get recent market data
   */
  async getRecentMarketData(currencyPair, limit = 20) {
    try {
      const sql = `SELECT * FROM market_data 
        WHERE currency_pair = ? 
        ORDER BY timestamp DESC 
        LIMIT ?`;
      
      const rows = await this.getAllQuery(sql, [currencyPair, limit]);
      
      return rows.map(row => ({
        currencyPair: row.currency_pair,
        timestamp: new Date(row.timestamp),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume
      })).reverse(); // Return oldest first
      
    } catch (error) {
      this.logger.logError('Get Recent Market Data', error);
      return [];
    }
  }
  
  /**
   * Get recent AI decisions
   */
  async getRecentDecisions(limit = 10) {
    try {
      const sql = `SELECT * FROM ai_decisions 
        ORDER BY timestamp DESC 
        LIMIT ?`;
      
      const rows = await this.getAllQuery(sql, [limit]);
      
      return rows.map(row => ({
        id: row.id,
        currencyPair: row.currency_pair,
        timestamp: new Date(row.timestamp),
        decision: row.decision,
        confidence: row.confidence,
        reason: row.reason,
        technicalData: JSON.parse(row.technical_data || '{}'),
        marketData: JSON.parse(row.market_data || '[]')
      }));
      
    } catch (error) {
      this.logger.logError('Get Recent Decisions', error);
      return [];
    }
  }
  
  /**
   * Run a query that doesn't return data
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  /**
   * Run a query that returns a single row
   */
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  /**
   * Run a query that returns multiple rows
   */
  getAllQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            this.logger.warn('Error closing database:', err.message);
          } else {
            this.logger.info('🗄️ Database connection closed');
          }
          resolve();
        });
      });
    }
  }
  
  /**
   * Recalculate performance metrics (for data integrity)
   */
  async recalculatePerformanceMetrics() {
    try {
      // This would be called periodically to ensure data consistency
      const sql = `DELETE FROM performance_metrics`;
      await this.runQuery(sql);
      
      // Recalculate from trades table
      const recalcSql = `INSERT INTO performance_metrics 
        (date, currency_pair, total_trades, winning_trades, losing_trades, 
         win_rate, total_profit_loss, avg_confidence) 
        SELECT 
          DATE(timestamp) as date,
          currency_pair,
          COUNT(*) as total_trades,
          SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as winning_trades,
          SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losing_trades,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              (SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
            ELSE 0 
          END as win_rate,
          COALESCE(SUM(profit_loss), 0) as total_profit_loss,
          AVG(confidence) as avg_confidence
        FROM trades 
        GROUP BY DATE(timestamp), currency_pair`;
      
      await this.runQuery(recalcSql);
      
    } catch (error) {
      this.logger.logError('Recalculate Performance Metrics', error);
    }
  }
}

module.exports = { DatabaseManager };
