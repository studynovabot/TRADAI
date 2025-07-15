/**
 * AI Learning System for Enhanced TRADAI
 * Stores successful patterns and adapts AI analysis based on trade outcomes
 */

const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class AILearningSystem {
    constructor(config = {}) {
        this.config = {
            dbPath: config.dbPath || path.join(process.cwd(), 'data', 'ai_learning.db'),
            minPatternOccurrences: config.minPatternOccurrences || 5,
            learningRate: config.learningRate || 0.1,
            maxPatternAge: config.maxPatternAge || 30 * 24 * 60 * 60 * 1000, // 30 days
            ...config
        };
        
        this.db = null;
        this.patternCache = new Map();
        this.performanceMetrics = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            avgWinRate: 0,
            bestPatterns: [],
            worstPatterns: []
        };
        
        this.logger = config.logger || console;
    }

    async initialize() {
        try {
            // Ensure data directory exists
            await fs.ensureDir(path.dirname(this.config.dbPath));
            
            // Initialize SQLite database
            this.db = new sqlite3.Database(this.config.dbPath);
            
            await this.createTables();
            await this.loadPatternCache();
            await this.calculatePerformanceMetrics();
            
            this.logger.info('🧠 AI Learning System initialized successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize AI Learning System:', error);
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Trade outcomes table
                `CREATE TABLE IF NOT EXISTS trade_outcomes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    signal_id TEXT UNIQUE,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    currency_pair TEXT,
                    timeframe TEXT,
                    decision TEXT,
                    confidence INTEGER,
                    groq_decision TEXT,
                    groq_confidence INTEGER,
                    together_decision TEXT,
                    together_confidence INTEGER,
                    consensus_reached BOOLEAN,
                    technical_indicators TEXT,
                    patterns_detected TEXT,
                    market_regime TEXT,
                    entry_price REAL,
                    exit_price REAL,
                    outcome TEXT,
                    profit_loss REAL,
                    win_loss BOOLEAN,
                    execution_time DATETIME,
                    notes TEXT
                )`,
                
                // Successful patterns table
                `CREATE TABLE IF NOT EXISTS successful_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_hash TEXT UNIQUE,
                    pattern_name TEXT,
                    pattern_data TEXT,
                    currency_pair TEXT,
                    timeframe TEXT,
                    occurrences INTEGER DEFAULT 1,
                    wins INTEGER DEFAULT 0,
                    losses INTEGER DEFAULT 0,
                    win_rate REAL DEFAULT 0,
                    avg_profit REAL DEFAULT 0,
                    confidence_boost REAL DEFAULT 0,
                    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                
                // AI model performance table
                `CREATE TABLE IF NOT EXISTS ai_model_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT,
                    date DATE,
                    total_predictions INTEGER DEFAULT 0,
                    correct_predictions INTEGER DEFAULT 0,
                    accuracy REAL DEFAULT 0,
                    avg_confidence REAL DEFAULT 0,
                    consensus_rate REAL DEFAULT 0,
                    profit_factor REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ];
            
            let completed = 0;
            queries.forEach(query => {
                this.db.run(query, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === queries.length) {
                        resolve();
                    }
                });
            });
        });
    }

    async storeTradeOutcome(tradeData) {
        try {
            const {
                signalId, currencyPair, timeframe, decision, confidence,
                groqDecision, groqConfidence, togetherDecision, togetherConfidence,
                consensusReached, technicalIndicators, patternsDetected, marketRegime,
                entryPrice, exitPrice, outcome, profitLoss, winLoss, executionTime, notes
            } = tradeData;

            return new Promise((resolve, reject) => {
                const query = `
                    INSERT OR REPLACE INTO trade_outcomes (
                        signal_id, currency_pair, timeframe, decision, confidence,
                        groq_decision, groq_confidence, together_decision, together_confidence,
                        consensus_reached, technical_indicators, patterns_detected, market_regime,
                        entry_price, exit_price, outcome, profit_loss, win_loss, execution_time, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                this.db.run(query, [
                    signalId, currencyPair, timeframe, decision, confidence,
                    groqDecision, groqConfidence, togetherDecision, togetherConfidence,
                    consensusReached, JSON.stringify(technicalIndicators), 
                    JSON.stringify(patternsDetected), marketRegime,
                    entryPrice, exitPrice, outcome, profitLoss, winLoss, executionTime, notes
                ], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.lastID);
                });
            });
            
        } catch (error) {
            this.logger.error('❌ Error storing trade outcome:', error);
            throw error;
        }
    }

    async updateSuccessfulPatterns(tradeData) {
        try {
            if (!tradeData.winLoss || !tradeData.patternsDetected) return;

            const patterns = JSON.parse(tradeData.patternsDetected);
            
            for (const pattern of patterns) {
                const patternHash = this.generatePatternHash(pattern, tradeData.currencyPair, tradeData.timeframe);
                
                await this.updatePatternPerformance(patternHash, pattern, tradeData);
            }
            
            await this.loadPatternCache();
            
        } catch (error) {
            this.logger.error('❌ Error updating successful patterns:', error);
        }
    }

    async updatePatternPerformance(patternHash, pattern, tradeData) {
        return new Promise((resolve, reject) => {
            // First, try to get existing pattern
            this.db.get(
                'SELECT * FROM successful_patterns WHERE pattern_hash = ?',
                [patternHash],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (row) {
                        // Update existing pattern
                        const newOccurrences = row.occurrences + 1;
                        const newWins = row.wins + (tradeData.winLoss ? 1 : 0);
                        const newLosses = row.losses + (tradeData.winLoss ? 0 : 1);
                        const newWinRate = newWins / newOccurrences;
                        const newAvgProfit = (row.avg_profit * row.occurrences + tradeData.profitLoss) / newOccurrences;
                        const confidenceBoost = this.calculateConfidenceBoost(newWinRate, newOccurrences);
                        
                        const updateQuery = `
                            UPDATE successful_patterns SET
                                occurrences = ?, wins = ?, losses = ?, win_rate = ?,
                                avg_profit = ?, confidence_boost = ?, last_seen = CURRENT_TIMESTAMP,
                                last_updated = CURRENT_TIMESTAMP
                            WHERE pattern_hash = ?
                        `;
                        
                        this.db.run(updateQuery, [
                            newOccurrences, newWins, newLosses, newWinRate,
                            newAvgProfit, confidenceBoost, patternHash
                        ], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                        
                    } else {
                        // Insert new pattern
                        const winRate = tradeData.winLoss ? 1.0 : 0.0;
                        const confidenceBoost = this.calculateConfidenceBoost(winRate, 1);
                        
                        const insertQuery = `
                            INSERT INTO successful_patterns (
                                pattern_hash, pattern_name, pattern_data, currency_pair, timeframe,
                                occurrences, wins, losses, win_rate, avg_profit, confidence_boost
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        this.db.run(insertQuery, [
                            patternHash, pattern.name, JSON.stringify(pattern),
                            tradeData.currencyPair, tradeData.timeframe,
                            1, tradeData.winLoss ? 1 : 0, tradeData.winLoss ? 0 : 1,
                            winRate, tradeData.profitLoss, confidenceBoost
                        ], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    }
                }
            );
        });
    }

    generatePatternHash(pattern, currencyPair, timeframe) {
        const crypto = require('crypto');
        const data = `${pattern.name}_${currencyPair}_${timeframe}_${JSON.stringify(pattern.parameters || {})}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    calculateConfidenceBoost(winRate, occurrences) {
        // Calculate confidence boost based on win rate and statistical significance
        if (occurrences < this.config.minPatternOccurrences) return 0;
        
        const baseBoost = (winRate - 0.5) * 20; // Max 10% boost for 100% win rate
        const significanceMultiplier = Math.min(occurrences / 20, 1); // Full boost after 20 occurrences
        
        return Math.max(0, Math.min(15, baseBoost * significanceMultiplier));
    }

    async loadPatternCache() {
        try {
            this.patternCache.clear();
            
            return new Promise((resolve, reject) => {
                this.db.all(
                    `SELECT * FROM successful_patterns 
                     WHERE occurrences >= ? AND last_seen > datetime('now', '-${this.config.maxPatternAge / (24*60*60*1000)} days')
                     ORDER BY win_rate DESC, occurrences DESC`,
                    [this.config.minPatternOccurrences],
                    (err, rows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        rows.forEach(row => {
                            this.patternCache.set(row.pattern_hash, {
                                name: row.pattern_name,
                                data: JSON.parse(row.pattern_data),
                                winRate: row.win_rate,
                                occurrences: row.occurrences,
                                confidenceBoost: row.confidence_boost,
                                avgProfit: row.avg_profit
                            });
                        });
                        
                        this.logger.info(`🧠 Loaded ${this.patternCache.size} successful patterns into cache`);
                        resolve();
                    }
                );
            });
            
        } catch (error) {
            this.logger.error('❌ Error loading pattern cache:', error);
        }
    }

    async getPatternConfidenceBoost(patterns, currencyPair, timeframe) {
        let totalBoost = 0;
        let matchedPatterns = 0;
        
        for (const pattern of patterns) {
            const patternHash = this.generatePatternHash(pattern, currencyPair, timeframe);
            const cachedPattern = this.patternCache.get(patternHash);
            
            if (cachedPattern) {
                totalBoost += cachedPattern.confidenceBoost;
                matchedPatterns++;
            }
        }
        
        return matchedPatterns > 0 ? totalBoost / matchedPatterns : 0;
    }

    async calculatePerformanceMetrics() {
        try {
            return new Promise((resolve, reject) => {
                const query = `
                    SELECT 
                        COUNT(*) as total_trades,
                        SUM(CASE WHEN win_loss = 1 THEN 1 ELSE 0 END) as winning_trades,
                        SUM(CASE WHEN win_loss = 0 THEN 1 ELSE 0 END) as losing_trades,
                        AVG(CASE WHEN win_loss = 1 THEN 1.0 ELSE 0.0 END) as win_rate,
                        AVG(profit_loss) as avg_profit_loss
                    FROM trade_outcomes 
                    WHERE timestamp > datetime('now', '-30 days')
                `;
                
                this.db.get(query, (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    this.performanceMetrics = {
                        totalTrades: row.total_trades || 0,
                        winningTrades: row.winning_trades || 0,
                        losingTrades: row.losing_trades || 0,
                        avgWinRate: row.win_rate || 0,
                        avgProfitLoss: row.avg_profit_loss || 0
                    };
                    
                    resolve(this.performanceMetrics);
                });
            });
            
        } catch (error) {
            this.logger.error('❌ Error calculating performance metrics:', error);
            return this.performanceMetrics;
        }
    }

    async getBestPatterns(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT pattern_name, win_rate, occurrences, avg_profit, confidence_boost
                 FROM successful_patterns 
                 WHERE occurrences >= ?
                 ORDER BY win_rate DESC, occurrences DESC
                 LIMIT ?`,
                [this.config.minPatternOccurrences, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getWorstPatterns(limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT pattern_name, win_rate, occurrences, avg_profit
                 FROM successful_patterns 
                 WHERE occurrences >= ?
                 ORDER BY win_rate ASC, occurrences DESC
                 LIMIT ?`,
                [this.config.minPatternOccurrences, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async updateAIModelPerformance(modelName, predictions) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const totalPredictions = predictions.length;
            const correctPredictions = predictions.filter(p => p.correct).length;
            const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
            const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / totalPredictions;
            
            return new Promise((resolve, reject) => {
                const query = `
                    INSERT OR REPLACE INTO ai_model_performance (
                        model_name, date, total_predictions, correct_predictions,
                        accuracy, avg_confidence
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                this.db.run(query, [
                    modelName, today, totalPredictions, correctPredictions,
                    accuracy, avgConfidence
                ], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
            
        } catch (error) {
            this.logger.error('❌ Error updating AI model performance:', error);
        }
    }

    async getPerformanceReport() {
        const metrics = await this.calculatePerformanceMetrics();
        const bestPatterns = await this.getBestPatterns(5);
        const worstPatterns = await this.getWorstPatterns(5);
        
        return {
            ...metrics,
            bestPatterns,
            worstPatterns,
            totalPatternsLearned: this.patternCache.size
        };
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        this.logger.error('❌ Error closing AI Learning System database:', err);
                    } else {
                        this.logger.info('🧠 AI Learning System database closed');
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = { AILearningSystem };
