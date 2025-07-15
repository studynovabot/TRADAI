/**
 * SessionContextAnalyzer - Forex Session Detection and Temporal Context
 * 
 * Implements forex session detection (Asian/London/New York) and day-of-week effects
 * Provides temporal context to AI for session-specific pattern recognition
 */

const { Logger } = require('../utils/Logger');

class SessionContextAnalyzer {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Session configuration
    this.enableSessionAnalysis = config.enableSessionAnalysis !== false; // Default to true
    this.timezone = config.timezone || 'UTC';
    
    // Forex session definitions (UTC times)
    this.sessions = {
      ASIAN: {
        name: 'Asian Session',
        start: 22, // 22:00 UTC (Sydney open)
        end: 8,    // 08:00 UTC (Tokyo close)
        major_pairs: ['USD/JPY', 'AUD/USD', 'NZD/USD', 'USD/SGD'],
        characteristics: {
          volatility: 'LOW_TO_MEDIUM',
          volume: 'MEDIUM',
          trends: 'RANGE_BOUND',
          breakouts: 'RARE'
        }
      },
      LONDON: {
        name: 'London Session',
        start: 8,  // 08:00 UTC (London open)
        end: 16,   // 16:00 UTC (London close)
        major_pairs: ['EUR/USD', 'GBP/USD', 'USD/CHF', 'EUR/GBP'],
        characteristics: {
          volatility: 'HIGH',
          volume: 'HIGH',
          trends: 'STRONG_TRENDS',
          breakouts: 'COMMON'
        }
      },
      NEW_YORK: {
        name: 'New York Session',
        start: 13, // 13:00 UTC (New York open)
        end: 22,   // 22:00 UTC (New York close)
        major_pairs: ['USD/CAD', 'USD/MXN', 'EUR/USD', 'GBP/USD'],
        characteristics: {
          volatility: 'HIGH',
          volume: 'HIGH',
          trends: 'STRONG_TRENDS',
          breakouts: 'COMMON'
        }
      }
    };
    
    // Session overlaps (highest activity periods)
    this.overlaps = {
      LONDON_NEW_YORK: {
        name: 'London-New York Overlap',
        start: 13, // 13:00 UTC
        end: 16,   // 16:00 UTC
        characteristics: {
          volatility: 'VERY_HIGH',
          volume: 'VERY_HIGH',
          trends: 'EXPLOSIVE_MOVES',
          breakouts: 'VERY_COMMON'
        }
      },
      ASIAN_LONDON: {
        name: 'Asian-London Overlap',
        start: 8,  // 08:00 UTC
        end: 9,    // 09:00 UTC
        characteristics: {
          volatility: 'MEDIUM',
          volume: 'MEDIUM',
          trends: 'TRANSITION',
          breakouts: 'POSSIBLE'
        }
      }
    };
    
    // Day-of-week effects
    this.dayEffects = {
      MONDAY: {
        characteristics: 'Market opening, gap analysis, trend continuation from weekend news',
        volatility: 'MEDIUM',
        reliability: 'MEDIUM',
        notes: 'Watch for weekend gap fills, slower start'
      },
      TUESDAY: {
        characteristics: 'Strong trending day, institutional activity increases',
        volatility: 'HIGH',
        reliability: 'HIGH',
        notes: 'Best day for trend following strategies'
      },
      WEDNESDAY: {
        characteristics: 'Mid-week momentum, economic data releases',
        volatility: 'HIGH',
        reliability: 'HIGH',
        notes: 'Often continuation of Tuesday trends'
      },
      THURSDAY: {
        characteristics: 'Late week positioning, profit taking begins',
        volatility: 'MEDIUM_HIGH',
        reliability: 'MEDIUM',
        notes: 'Watch for reversal signals'
      },
      FRIDAY: {
        characteristics: 'Profit taking, position squaring, lower volume',
        volatility: 'MEDIUM',
        reliability: 'LOW',
        notes: 'Avoid late Friday trades, early close recommended'
      },
      SATURDAY: {
        characteristics: 'Market closed',
        volatility: 'NONE',
        reliability: 'NONE',
        notes: 'No trading'
      },
      SUNDAY: {
        characteristics: 'Market opening gaps, weekend news impact',
        volatility: 'LOW',
        reliability: 'LOW',
        notes: 'Gap trading opportunities, limited liquidity'
      }
    };
    
    // Current session context
    this.currentContext = {
      session: null,
      overlap: null,
      dayOfWeek: null,
      timeContext: null,
      lastUpdate: null
    };
    
    this.logger.info('🕐 SessionContextAnalyzer initialized');
  }

  /**
   * Get current session context
   */
  getCurrentSessionContext() {
    if (!this.enableSessionAnalysis) {
      return {
        enabled: false,
        message: 'Session analysis disabled'
      };
    }
    
    const now = new Date();
    const utcHour = now.getUTCHours();
    const dayOfWeek = this.getDayOfWeek(now);
    
    // Determine current session
    const currentSession = this.determineCurrentSession(utcHour);
    const currentOverlap = this.determineCurrentOverlap(utcHour);
    
    // Update current context
    this.currentContext = {
      session: currentSession,
      overlap: currentOverlap,
      dayOfWeek: dayOfWeek,
      timeContext: this.getTimeContext(now),
      lastUpdate: now
    };
    
    return {
      enabled: true,
      session: currentSession,
      overlap: currentOverlap,
      dayOfWeek: dayOfWeek,
      timeContext: this.currentContext.timeContext,
      timestamp: now
    };
  }

  /**
   * Determine current forex session
   */
  determineCurrentSession(utcHour) {
    // Check each session
    for (const [sessionName, session] of Object.entries(this.sessions)) {
      if (this.isTimeInSession(utcHour, session.start, session.end)) {
        return {
          name: sessionName,
          displayName: session.name,
          characteristics: session.characteristics,
          majorPairs: session.major_pairs,
          isActive: true
        };
      }
    }
    
    return {
      name: 'OFF_HOURS',
      displayName: 'Off Hours',
      characteristics: {
        volatility: 'VERY_LOW',
        volume: 'VERY_LOW',
        trends: 'MINIMAL',
        breakouts: 'VERY_RARE'
      },
      majorPairs: [],
      isActive: false
    };
  }

  /**
   * Determine current session overlap
   */
  determineCurrentOverlap(utcHour) {
    for (const [overlapName, overlap] of Object.entries(this.overlaps)) {
      if (this.isTimeInSession(utcHour, overlap.start, overlap.end)) {
        return {
          name: overlapName,
          displayName: overlap.name,
          characteristics: overlap.characteristics,
          isActive: true
        };
      }
    }
    
    return null;
  }

  /**
   * Check if time is within session hours
   */
  isTimeInSession(currentHour, startHour, endHour) {
    if (startHour <= endHour) {
      // Same day session (e.g., London: 8-16)
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Cross-midnight session (e.g., Asian: 22-8)
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  /**
   * Get day of week with trading context
   */
  getDayOfWeek(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = days[date.getUTCDay()];
    
    return {
      name: dayName,
      characteristics: this.dayEffects[dayName].characteristics,
      volatility: this.dayEffects[dayName].volatility,
      reliability: this.dayEffects[dayName].reliability,
      notes: this.dayEffects[dayName].notes
    };
  }

  /**
   * Get detailed time context
   */
  getTimeContext(date) {
    const utcHour = date.getUTCHours();
    const utcMinute = date.getUTCMinutes();
    
    return {
      utcTime: `${utcHour.toString().padStart(2, '0')}:${utcMinute.toString().padStart(2, '0')}`,
      localTime: date.toLocaleTimeString(),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      isMarketOpen: this.isMarketOpen(date),
      timeToNextSession: this.getTimeToNextSession(utcHour)
    };
  }

  /**
   * Check if forex market is open
   */
  isMarketOpen(date) {
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    
    // Market closed on Saturday and most of Sunday
    if (day === 6) return false; // Saturday
    if (day === 0 && hour < 22) return false; // Sunday before 22:00 UTC
    
    return true;
  }

  /**
   * Get time until next major session
   */
  getTimeToNextSession(currentHour) {
    const sessionStarts = [22, 8, 13]; // Asian, London, New York
    const sessionNames = ['ASIAN', 'LONDON', 'NEW_YORK'];
    
    for (let i = 0; i < sessionStarts.length; i++) {
      const startHour = sessionStarts[i];
      let hoursUntil;
      
      if (startHour > currentHour) {
        hoursUntil = startHour - currentHour;
      } else {
        hoursUntil = (24 - currentHour) + startHour;
      }
      
      if (hoursUntil <= 12) { // Only show if within 12 hours
        return {
          session: sessionNames[i],
          hours: hoursUntil,
          minutes: 0 // Simplified for now
        };
      }
    }
    
    return null;
  }

  /**
   * Get session context for specific currency pair
   */
  getSessionContextForPair(currencyPair) {
    const context = this.getCurrentSessionContext();
    
    if (!context.enabled) {
      return context;
    }
    
    // Check if current session favors this currency pair
    const isPairFavored = context.session.majorPairs.includes(currencyPair);
    
    // Calculate session strength for this pair
    let sessionStrength = 'NEUTRAL';
    if (isPairFavored) {
      if (context.overlap) {
        sessionStrength = 'VERY_HIGH';
      } else {
        sessionStrength = 'HIGH';
      }
    } else {
      sessionStrength = 'LOW';
    }
    
    return {
      ...context,
      pairSpecific: {
        isPairFavored: isPairFavored,
        sessionStrength: sessionStrength,
        recommendation: this.getSessionRecommendation(context, isPairFavored)
      }
    };
  }

  /**
   * Get trading recommendation based on session
   */
  getSessionRecommendation(context, isPairFavored) {
    if (!context.session.isActive) {
      return 'AVOID - Market closed or off hours';
    }
    
    if (context.dayOfWeek.name === 'FRIDAY' && new Date().getUTCHours() > 20) {
      return 'CAUTION - Late Friday trading, consider early close';
    }
    
    if (context.overlap) {
      return isPairFavored ? 
        'EXCELLENT - High volatility overlap period for this pair' :
        'GOOD - High volatility period, but pair not session-specific';
    }
    
    if (isPairFavored) {
      return `GOOD - ${context.session.displayName} favors this pair`;
    }
    
    return 'FAIR - Session active but pair not session-specific';
  }

  /**
   * Format session context for AI prompt
   */
  formatSessionContextForAI(currencyPair) {
    const context = this.getSessionContextForPair(currencyPair);
    
    if (!context.enabled) {
      return context.message;
    }
    
    return `FOREX SESSION & TEMPORAL CONTEXT:
Current Session: ${context.session.displayName} (${context.session.name})
Session Characteristics: ${JSON.stringify(context.session.characteristics)}
${context.overlap ? `Active Overlap: ${context.overlap.displayName}` : 'No Session Overlap'}
${context.overlap ? `Overlap Characteristics: ${JSON.stringify(context.overlap.characteristics)}` : ''}

Day of Week: ${context.dayOfWeek.name}
Day Characteristics: ${context.dayOfWeek.characteristics}
Day Volatility: ${context.dayOfWeek.volatility}
Day Reliability: ${context.dayOfWeek.reliability}
Day Notes: ${context.dayOfWeek.notes}

Time Context:
UTC Time: ${context.timeContext.utcTime}
Market Status: ${context.timeContext.isMarketOpen ? 'OPEN' : 'CLOSED'}
Weekend: ${context.timeContext.isWeekend ? 'YES' : 'NO'}

Pair-Specific Analysis (${currencyPair}):
Session Favors Pair: ${context.pairSpecific.isPairFavored ? 'YES' : 'NO'}
Session Strength: ${context.pairSpecific.sessionStrength}
Recommendation: ${context.pairSpecific.recommendation}

TRADING IMPLICATIONS:
- Session volatility affects signal reliability
- Overlap periods increase breakout probability
- Day-of-week effects influence trend strength
- Consider session-specific pair behavior`;
  }

  /**
   * Get session summary for display
   */
  getSessionSummary() {
    if (!this.enableSessionAnalysis) {
      return 'Session analysis disabled';
    }
    
    const context = this.getCurrentSessionContext();
    
    return `🕐 Session Context:
Current: ${context.session.displayName}
${context.overlap ? `Overlap: ${context.overlap.displayName}` : 'No Overlap'}
Day: ${context.dayOfWeek.name} (${context.dayOfWeek.volatility} volatility)
Time: ${context.timeContext.utcTime} UTC
Market: ${context.timeContext.isMarketOpen ? 'OPEN' : 'CLOSED'}`;
  }

  /**
   * Check if session supports trading decision
   */
  doesSessionSupport(decision, currencyPair) {
    const context = this.getSessionContextForPair(currencyPair);
    
    if (!context.enabled || !context.session.isActive) {
      return { 
        supported: false, 
        reason: 'Market closed or session analysis disabled' 
      };
    }
    
    // Friday late trading caution
    if (context.dayOfWeek.name === 'FRIDAY' && new Date().getUTCHours() > 20) {
      return { 
        supported: false, 
        reason: 'Late Friday trading - high risk of weekend gaps' 
      };
    }
    
    // Weekend trading
    if (context.timeContext.isWeekend) {
      return { 
        supported: false, 
        reason: 'Weekend trading - limited liquidity and high spreads' 
      };
    }
    
    // Support based on session strength
    if (context.pairSpecific.sessionStrength === 'VERY_HIGH' || context.pairSpecific.sessionStrength === 'HIGH') {
      return { 
        supported: true, 
        reason: `${context.session.displayName} strongly supports ${currencyPair} trading`,
        strength: context.pairSpecific.sessionStrength
      };
    }
    
    if (decision === 'NO_TRADE' && context.pairSpecific.sessionStrength === 'LOW') {
      return { 
        supported: true, 
        reason: 'Low session activity supports conservative NO_TRADE approach',
        strength: 'CONSERVATIVE'
      };
    }
    
    return { 
      supported: true, 
      reason: `Session allows trading but with ${context.pairSpecific.sessionStrength} strength`,
      strength: context.pairSpecific.sessionStrength
    };
  }
}

module.exports = SessionContextAnalyzer;
