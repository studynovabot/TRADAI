// 🤖 AI ANALYSIS SERVERLESS FUNCTION
// pages/api/ai/analyze.js

import { AIAnalyzer } from '../../../lib/ai/analyzer';
import { TechnicalAnalyzer } from '../../../lib/ai/technical';
import { SignalBroadcaster } from '../../../lib/realtime/broadcaster';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { pair, timeframe, data } = req.body;
    
    // 📊 Technical Analysis
    const technicalAnalysis = await TechnicalAnalyzer.analyze(data);
    
    // 🧠 AI Model Analysis
    const aiAnalysis = await AIAnalyzer.predict({
      pair,
      timeframe,
      technicalData: technicalAnalysis,
      ohlcv: data
    });
    
    // 🎯 Generate Signal
    const signal = {
      id: Date.now(),
      pair,
      timeframe,
      direction: aiAnalysis.prediction,
      confidence: aiAnalysis.confidence,
      analysis: {
        technical: technicalAnalysis,
        ai: aiAnalysis,
        patterns: aiAnalysis.patterns
      },
      timestamp: new Date().toISOString()
    };
    
    // 📡 Broadcast to clients
    if (signal.confidence > 75) {
      await SignalBroadcaster.broadcast(signal);
    }
    
    return res.status(200).json({
      success: true,
      signal,
      analysis: aiAnalysis
    });
    
  } catch (error) {
    console.error('AI Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
}

// 📊 TRADING SIGNALS FUNCTION
// pages/api/trading/signals.js

import { db } from '../../../lib/db/client';
import { auth } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await auth(req, res);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (req.method === 'GET') {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const signals = await db.query(`
        SELECT * FROM signals 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [session.user.id, limit, offset]);
      
      return res.status(200).json({ signals });
    } catch (error) {
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { signal, result } = req.body;
      
      // 💾 Save signal result
      await db.query(`
        INSERT INTO signal_results (signal_id, user_id, result, profit_loss)
        VALUES (?, ?, ?, ?)
      `, [signal.id, session.user.id, result.outcome, result.profit]);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Save failed' });
    }
  }
}