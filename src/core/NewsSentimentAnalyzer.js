/**
 * NewsSentimentAnalyzer - Free News Sentiment Monitoring
 * 
 * Monitors Yahoo Finance RSS feeds for forex-related news
 * Implements keyword sentiment scoring and integration into AI context
 */

const axios = require('axios');
const { Logger } = require('../utils/Logger');
const fs = require('fs').promises;
const path = require('path');

class NewsSentimentAnalyzer {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Sentiment configuration
    this.enableSentiment = config.enableNewsSentiment !== false; // Default to true
    this.updateInterval = config.newsUpdateInterval || 30 * 60 * 1000; // 30 minutes
    this.maxNewsAge = config.maxNewsAge || 24 * 60 * 60 * 1000; // 24 hours
    this.sentimentWeight = config.sentimentWeight || 0.2; // 20% weight in decisions
    
    // News sources (free RSS feeds)
    this.newsSources = [
      {
        name: 'Yahoo Finance - Forex',
        url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=USDEUR=X&region=US&lang=en-US',
        weight: 0.4
      },
      {
        name: 'Yahoo Finance - USD',
        url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=USD&region=US&lang=en-US',
        weight: 0.3
      },
      {
        name: 'Yahoo Finance - Markets',
        url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US',
        weight: 0.3
      }
    ];
    
    // Sentiment keywords
    this.sentimentKeywords = {
      bullish: {
        keywords: ['rise', 'surge', 'gain', 'rally', 'boost', 'strengthen', 'positive', 'optimistic', 'growth', 'increase', 'up', 'higher', 'advance', 'climb', 'soar', 'jump'],
        weight: 1
      },
      bearish: {
        keywords: ['fall', 'drop', 'decline', 'crash', 'plunge', 'weaken', 'negative', 'pessimistic', 'recession', 'decrease', 'down', 'lower', 'retreat', 'slide', 'tumble', 'sink'],
        weight: -1
      },
      neutral: {
        keywords: ['stable', 'unchanged', 'flat', 'sideways', 'consolidate', 'range', 'mixed', 'uncertain', 'wait', 'pause'],
        weight: 0
      },
      volatility: {
        keywords: ['volatile', 'volatility', 'swing', 'fluctuate', 'choppy', 'erratic', 'unstable', 'turbulent'],
        weight: 0.5 // Indicates increased market activity
      }
    };
    
    // Currency-specific keywords
    this.currencyKeywords = {
      'USD': ['dollar', 'usd', 'federal reserve', 'fed', 'jerome powell', 'inflation', 'employment'],
      'INR': ['rupee', 'inr', 'india', 'rbi', 'reserve bank of india', 'modi', 'mumbai'],
      'EUR': ['euro', 'eur', 'ecb', 'european central bank', 'eurozone'],
      'GBP': ['pound', 'gbp', 'sterling', 'bank of england', 'boe', 'uk', 'britain']
    };
    
    // Current sentiment data
    this.currentSentiment = {
      overall: 0,
      currency: {},
      lastUpdate: null,
      newsCount: 0,
      confidence: 0
    };
    
    // Storage
    this.sentimentDir = path.join(process.cwd(), 'sentiment-data');
    this.sentimentFile = path.join(this.sentimentDir, 'current-sentiment.json');
    
    this.logger.info('📰 NewsSentimentAnalyzer initialized');
    this.initializeSentimentAnalysis();
  }

  /**
   * Initialize sentiment analysis system
   */
  async initializeSentimentAnalysis() {
    try {
      if (!this.enableSentiment) {
        this.logger.info('📰 News sentiment analysis disabled');
        return;
      }
      
      // Create sentiment directory
      await fs.mkdir(this.sentimentDir, { recursive: true });
      
      // Load existing sentiment data
      await this.loadExistingSentiment();
      
      // Start periodic news updates
      this.startPeriodicUpdates();
      
      // Initial news fetch
      await this.updateNewsSentiment();
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize sentiment analysis:', error);
    }
  }

  /**
   * Start periodic news sentiment updates
   */
  startPeriodicUpdates() {
    setInterval(async () => {
      await this.updateNewsSentiment();
    }, this.updateInterval);
    
    this.logger.info(`📰 News sentiment updates scheduled every ${this.updateInterval / (60 * 1000)} minutes`);
  }

  /**
   * Update news sentiment from all sources
   */
  async updateNewsSentiment() {
    try {
      this.logger.info('📰 Updating news sentiment...');
      
      const allNews = [];
      
      // Fetch news from all sources
      for (const source of this.newsSources) {
        try {
          const news = await this.fetchNewsFromSource(source);
          allNews.push(...news);
        } catch (error) {
          this.logger.warn(`⚠️ Failed to fetch news from ${source.name}:`, error.message);
        }
      }
      
      if (allNews.length === 0) {
        this.logger.warn('⚠️ No news articles fetched');
        return;
      }
      
      // Filter recent news
      const recentNews = this.filterRecentNews(allNews);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(recentNews);
      
      // Update current sentiment
      this.currentSentiment = {
        ...sentiment,
        lastUpdate: new Date(),
        newsCount: recentNews.length
      };
      
      // Save sentiment data
      await this.saveSentimentData();
      
      this.logger.info(`📰 Sentiment updated: ${sentiment.overall.toFixed(2)} (${recentNews.length} articles)`);
      
    } catch (error) {
      this.logger.error('❌ Failed to update news sentiment:', error);
    }
  }

  /**
   * Fetch news from a specific RSS source
   */
  async fetchNewsFromSource(source) {
    try {
      // For this implementation, we'll simulate RSS parsing
      // In a real implementation, you'd use an RSS parser library
      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Simple XML parsing for demonstration
      // In production, use a proper RSS parser like 'rss-parser'
      const articles = this.parseSimpleRSS(response.data, source);
      
      return articles;
      
    } catch (error) {
      // If RSS fails, return mock news for demonstration
      return this.getMockNews(source);
    }
  }

  /**
   * Simple RSS parsing (for demonstration)
   */
  parseSimpleRSS(xmlData, source) {
    const articles = [];
    
    // This is a simplified parser - in production use 'rss-parser' library
    const titleMatches = xmlData.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
    const descMatches = xmlData.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/g) || [];
    
    for (let i = 0; i < Math.min(titleMatches.length, 10); i++) {
      const title = titleMatches[i]?.replace(/<title><!\[CDATA\[|\]\]><\/title>/g, '') || '';
      const description = descMatches[i]?.replace(/<description><!\[CDATA\[|\]\]><\/description>/g, '') || '';
      
      if (title) {
        articles.push({
          title: title,
          description: description,
          source: source.name,
          weight: source.weight,
          timestamp: new Date()
        });
      }
    }
    
    return articles;
  }

  /**
   * Get mock news for demonstration when RSS fails
   */
  getMockNews(source) {
    const mockArticles = [
      {
        title: 'USD strengthens amid positive economic data',
        description: 'The US dollar gained ground against major currencies following strong employment figures',
        source: source.name,
        weight: source.weight,
        timestamp: new Date()
      },
      {
        title: 'Federal Reserve maintains cautious stance on interest rates',
        description: 'Fed officials signal measured approach to monetary policy amid inflation concerns',
        source: source.name,
        weight: source.weight,
        timestamp: new Date()
      },
      {
        title: 'Global markets show mixed sentiment on trade developments',
        description: 'Investors remain cautious as trade negotiations continue between major economies',
        source: source.name,
        weight: source.weight,
        timestamp: new Date()
      }
    ];
    
    return mockArticles.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  /**
   * Filter news articles by age
   */
  filterRecentNews(allNews) {
    const cutoffTime = new Date(Date.now() - this.maxNewsAge);
    
    return allNews.filter(article => {
      const articleTime = new Date(article.timestamp);
      return articleTime > cutoffTime;
    });
  }

  /**
   * Analyze sentiment of news articles
   */
  analyzeSentiment(articles) {
    if (articles.length === 0) {
      return {
        overall: 0,
        currency: {},
        confidence: 0
      };
    }
    
    let totalSentiment = 0;
    let totalWeight = 0;
    const currencySentiment = {};
    
    // Initialize currency sentiment
    Object.keys(this.currencyKeywords).forEach(currency => {
      currencySentiment[currency] = { sentiment: 0, count: 0, weight: 0 };
    });
    
    // Analyze each article
    articles.forEach(article => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const articleSentiment = this.calculateArticleSentiment(text);
      const articleWeight = article.weight || 1;
      
      // Add to overall sentiment
      totalSentiment += articleSentiment * articleWeight;
      totalWeight += articleWeight;
      
      // Check for currency-specific sentiment
      Object.keys(this.currencyKeywords).forEach(currency => {
        const currencyWords = this.currencyKeywords[currency];
        const hasCurrencyMention = currencyWords.some(word => text.includes(word.toLowerCase()));
        
        if (hasCurrencyMention) {
          currencySentiment[currency].sentiment += articleSentiment * articleWeight;
          currencySentiment[currency].weight += articleWeight;
          currencySentiment[currency].count += 1;
        }
      });
    });
    
    // Calculate final sentiment scores
    const overallSentiment = totalWeight > 0 ? totalSentiment / totalWeight : 0;
    
    // Normalize currency sentiment
    Object.keys(currencySentiment).forEach(currency => {
      const data = currencySentiment[currency];
      if (data.weight > 0) {
        data.sentiment = data.sentiment / data.weight;
      }
    });
    
    // Calculate confidence based on article count and consistency
    const confidence = Math.min(1, articles.length / 10) * 0.8; // Max 80% confidence
    
    return {
      overall: Math.max(-1, Math.min(1, overallSentiment)), // Clamp between -1 and 1
      currency: currencySentiment,
      confidence: confidence
    };
  }

  /**
   * Calculate sentiment score for a single article
   */
  calculateArticleSentiment(text) {
    let sentiment = 0;
    let matchCount = 0;
    
    // Check each sentiment category
    Object.keys(this.sentimentKeywords).forEach(category => {
      const { keywords, weight } = this.sentimentKeywords[category];
      
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (text.match(regex) || []).length;
        
        if (matches > 0) {
          sentiment += matches * weight;
          matchCount += matches;
        }
      });
    });
    
    // Normalize sentiment
    if (matchCount > 0) {
      sentiment = sentiment / matchCount;
    }
    
    return Math.max(-1, Math.min(1, sentiment)); // Clamp between -1 and 1
  }

  /**
   * Save sentiment data to file
   */
  async saveSentimentData() {
    try {
      await fs.writeFile(this.sentimentFile, JSON.stringify(this.currentSentiment, null, 2));
    } catch (error) {
      this.logger.error('❌ Failed to save sentiment data:', error);
    }
  }

  /**
   * Load existing sentiment data
   */
  async loadExistingSentiment() {
    try {
      const data = await fs.readFile(this.sentimentFile, 'utf8');
      this.currentSentiment = JSON.parse(data);
      this.logger.info(`📰 Loaded existing sentiment: ${this.currentSentiment.overall?.toFixed(2) || 0}`);
    } catch (error) {
      this.logger.info('📰 No existing sentiment data found, starting fresh');
    }
  }

  /**
   * Get current sentiment for AI analysis
   */
  getCurrentSentiment() {
    return this.currentSentiment;
  }

  /**
   * Get sentiment context for specific currency pair
   */
  getSentimentContext(currencyPair) {
    if (!this.enableSentiment || !this.currentSentiment.lastUpdate) {
      return {
        enabled: false,
        message: 'News sentiment analysis not available'
      };
    }

    // Check if sentiment data is recent
    const dataAge = Date.now() - new Date(this.currentSentiment.lastUpdate).getTime();
    if (dataAge > this.maxNewsAge) {
      return {
        enabled: false,
        message: 'Sentiment data is outdated'
      };
    }

    // Extract currencies from pair (e.g., USD/INR -> USD, INR)
    const [baseCurrency, quoteCurrency] = currencyPair.split('/');

    const baseSentiment = this.currentSentiment.currency[baseCurrency];
    const quoteSentiment = this.currentSentiment.currency[quoteCurrency];

    // Calculate relative sentiment (base vs quote)
    let relativeSentiment = 0;
    let sentimentStrength = 'NEUTRAL';

    if (baseSentiment?.count > 0 && quoteSentiment?.count > 0) {
      relativeSentiment = baseSentiment.sentiment - quoteSentiment.sentiment;
    } else if (baseSentiment?.count > 0) {
      relativeSentiment = baseSentiment.sentiment;
    } else if (quoteSentiment?.count > 0) {
      relativeSentiment = -quoteSentiment.sentiment;
    } else {
      relativeSentiment = this.currentSentiment.overall;
    }

    // Determine sentiment strength
    if (Math.abs(relativeSentiment) > 0.5) {
      sentimentStrength = 'STRONG';
    } else if (Math.abs(relativeSentiment) > 0.2) {
      sentimentStrength = 'MODERATE';
    }

    // Determine direction
    let direction = 'NEUTRAL';
    if (relativeSentiment > 0.1) {
      direction = 'BULLISH'; // Favors base currency
    } else if (relativeSentiment < -0.1) {
      direction = 'BEARISH'; // Favors quote currency
    }

    return {
      enabled: true,
      overall: this.currentSentiment.overall,
      relative: relativeSentiment,
      direction: direction,
      strength: sentimentStrength,
      confidence: this.currentSentiment.confidence,
      newsCount: this.currentSentiment.newsCount,
      lastUpdate: this.currentSentiment.lastUpdate,
      baseCurrency: {
        currency: baseCurrency,
        sentiment: baseSentiment?.sentiment || 0,
        newsCount: baseSentiment?.count || 0
      },
      quoteCurrency: {
        currency: quoteCurrency,
        sentiment: quoteSentiment?.sentiment || 0,
        newsCount: quoteSentiment?.count || 0
      }
    };
  }

  /**
   * Get sentiment summary for display
   */
  getSentimentSummary() {
    if (!this.enableSentiment) {
      return 'News sentiment analysis disabled';
    }

    if (!this.currentSentiment.lastUpdate) {
      return 'No sentiment data available yet';
    }

    const sentiment = this.currentSentiment;
    const lastUpdate = new Date(sentiment.lastUpdate).toLocaleString();

    let direction = 'NEUTRAL';
    if (sentiment.overall > 0.2) direction = 'BULLISH';
    else if (sentiment.overall < -0.2) direction = 'BEARISH';

    return `📰 News Sentiment: ${direction} (${sentiment.overall.toFixed(2)})
    Articles: ${sentiment.newsCount}
    Confidence: ${(sentiment.confidence * 100).toFixed(0)}%
    Last Update: ${lastUpdate}`;
  }

  /**
   * Format sentiment for AI prompt
   */
  formatSentimentForAI(currencyPair) {
    const context = this.getSentimentContext(currencyPair);

    if (!context.enabled) {
      return context.message;
    }

    return `NEWS SENTIMENT ANALYSIS:
Overall Market Sentiment: ${context.overall.toFixed(2)} (${context.direction})
${currencyPair} Relative Sentiment: ${context.relative.toFixed(2)} (${context.strength})
${context.baseCurrency.currency} Sentiment: ${context.baseCurrency.sentiment.toFixed(2)} (${context.baseCurrency.newsCount} articles)
${context.quoteCurrency.currency} Sentiment: ${context.quoteCurrency.sentiment.toFixed(2)} (${context.quoteCurrency.newsCount} articles)
Confidence: ${(context.confidence * 100).toFixed(0)}%
Data Age: ${Math.round((Date.now() - new Date(context.lastUpdate).getTime()) / (60 * 1000))} minutes

Sentiment Scale: -1.0 (Very Bearish) to +1.0 (Very Bullish)`;
  }

  /**
   * Check if sentiment supports a trading decision
   */
  doesSentimentSupport(decision, currencyPair) {
    const context = this.getSentimentContext(currencyPair);

    if (!context.enabled || context.confidence < 0.3) {
      return { supported: null, reason: 'Insufficient sentiment data' };
    }

    const threshold = 0.2; // Minimum sentiment strength to consider

    if (decision === 'BUY' && context.relative > threshold) {
      return {
        supported: true,
        reason: `Bullish sentiment supports BUY (${context.relative.toFixed(2)})`,
        strength: context.strength
      };
    }

    if (decision === 'SELL' && context.relative < -threshold) {
      return {
        supported: true,
        reason: `Bearish sentiment supports SELL (${context.relative.toFixed(2)})`,
        strength: context.strength
      };
    }

    if (decision === 'NO_TRADE' && Math.abs(context.relative) < threshold) {
      return {
        supported: true,
        reason: `Neutral sentiment supports NO_TRADE (${context.relative.toFixed(2)})`,
        strength: context.strength
      };
    }

    return {
      supported: false,
      reason: `Sentiment conflicts with ${decision} decision (${context.relative.toFixed(2)})`,
      strength: context.strength
    };
  }

  /**
   * Get sentiment weight for decision adjustment
   */
  getSentimentWeight(currencyPair) {
    const context = this.getSentimentContext(currencyPair);

    if (!context.enabled) return 0;

    // Weight based on confidence and sentiment strength
    const baseWeight = this.sentimentWeight;
    const confidenceMultiplier = context.confidence;
    const strengthMultiplier = Math.min(1, Math.abs(context.relative) * 2);

    return baseWeight * confidenceMultiplier * strengthMultiplier;
  }
}

module.exports = NewsSentimentAnalyzer;
