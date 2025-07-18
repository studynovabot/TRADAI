/**
 * Enhanced Market Data Manager - Multi-Source Data Fusion
 * 
 * This module implements the multi-provider API fusion strategy for maximum
 * data quality, depth, and reliability using Twelve Data, Finnhub, Alpha Vantage, and Polygon.io
 */

const axios = require('axios');
const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');

class EnhancedMarketDataManager {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Multi-source API configuration
    this.apiProviders = {
      twelveData: {
        apiKey: config.finnhubApiKey || config.twelveDataApiKey,
        baseUrl: 'https://api.twelvedata.com',
        rateLimit: 800, // requests per day
        priority: 1,
        active: true
      },
      finnhub: {
        apiKey: config.finnhubApiKey,
        baseUrl: 'https://finnhub.io/api/v1',
        rateLimit: 60, // requests per minute
        priority: 2,
        active: !!config.finnhubApiKey
      },
      alphaVantage: {
        apiKey: config.alphaVantageApiKey,
        baseUrl: 'https://www.alphavantage.co/query',
        rateLimit: 5, // requests per minute
        priority: 3,
        active: !!config.alphaVantageApiKey
      },
      polygon: {
        apiKey: config.polygonApiKey,
        baseUrl: 'https://api.polygon.io',
        rateLimit: 5, // requests per minute
        priority: 4,
        active: !!config.polygonApiKey
      }
    };
    
    // Currency pair configuration
    this.currencyPair = config.currencyPair || 'USD/EUR';
    this.symbol = this.formatSymbolForProviders(this.currencyPair);
    
    // Multi-timeframe configuration
    this.timeframes = (config.timeframes || '1m,3m,5m,15m,30m,1h,4h').split(',');
    this.maxCandlesPerTimeframe = config.historicalLookback || 1000;
    
    // Data fusion configuration
    this.fusionConfig = {
      enableDataFusion: config.enableDataFusion !== false,
      minDataSources: parseInt(config.minDataSources) || 2,
      crossVerifyCandles: config.crossVerifyCandles !== false,
      fillMissingData: config.fillMissingData !== false,
      autoFallback: config.autoFallback !== false,
      maxDataAge: 5 * 60 * 1000, // 5 minutes
      anomalyThreshold: 0.05 // 5% price difference threshold
    };
    
    // Data storage
    this.marketData = {};
    this.dataQuality = {};
    this.providerHealth = {};
    
    // Initialize data structures
    this.initializeDataStructures();
    
    // Rate limiting
    this.requestCounts = {};
    this.lastRequestTimes = {};
    
    // Update intervals
    this.updateInterval = null;
    this.fetchInterval = 2 * 60 * 1000; // 2 minutes
    
    // Health monitoring
    this.consecutiveErrors = {};
    this.maxConsecutiveErrors = 5;
    this.isHealthy = true;
    
    this.logger.info('📊 Enhanced Multi-Source Market Data Manager initialized');
    this.logger.info(`🔗 Active providers: ${this.getActiveProviders().join(', ')}`);
    this.logger.info(`📈 Timeframes: ${this.timeframes.join(', ')}`);
    this.logger.info(`💱 Trading pair: ${this.currencyPair}`);
  }

  /**
   * Initialize data structures for all timeframes
   */
  initializeDataStructures() {
    this.timeframes.forEach(timeframe => {
      this.marketData[timeframe] = {
        candles: [],
        lastUpdate: 0,
        sources: {},
        quality: {
          completeness: 0,
          consistency: 0,
          freshness: 0,
          overall: 0
        }
      };
      
      // Initialize provider-specific data
      Object.keys(this.apiProviders).forEach(provider => {
        if (this.apiProviders[provider].active) {
          this.marketData[timeframe].sources[provider] = {
            candles: [],
            lastUpdate: 0,
            errors: 0,
            quality: 0
          };
        }
      });
    });
    
    // Initialize provider health tracking
    Object.keys(this.apiProviders).forEach(provider => {
      this.consecutiveErrors[provider] = 0;
      this.requestCounts[provider] = 0;
      this.lastRequestTimes[provider] = 0;
      this.providerHealth[provider] = {
        healthy: true,
        lastError: null,
        successRate: 100,
        avgResponseTime: 0,
        totalRequests: 0,
        failedRequests: 0
      };
    });
  }

  /**
   * Start real-time multi-source data updates
   */
  async startRealTimeUpdates() {
    if (this.updateInterval) {
      this.logger.warn('⚠️ Real-time updates already running');
      return;
    }

    this.logger.info('🚀 Starting enhanced multi-source real-time updates...');
    
    // Initial data fetch
    await this.fetchAllTimeframesFromAllSources();
    
    // Set up regular updates
    this.updateInterval = setInterval(async () => {
      try {
        await this.fetchAllTimeframesFromAllSources();
        this.updateSystemHealth();
      } catch (error) {
        this.logger.error('❌ Real-time update cycle failed:', error);
      }
    }, this.fetchInterval);
    
    this.logger.info(`✅ Multi-source updates started (${this.fetchInterval/1000}s interval)`);
    return { started: true, interval: this.fetchInterval, providers: this.getActiveProviders() };
  }

  /**
   * Stop real-time data updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.logger.info('⏹️ Multi-source real-time updates stopped');
    }
  }

  /**
   * Fetch data from all sources for all timeframes
   */
  async fetchAllTimeframesFromAllSources() {
    const startTime = Date.now();
    const results = {
      successful: 0,
      failed: 0,
      providers: {},
      timeframes: {}
    };

    this.logger.info('📡 Fetching data from all sources...');

    // Fetch data for each timeframe
    for (const timeframe of this.timeframes) {
      try {
        const timeframeResult = await this.fetchTimeframeFromAllSources(timeframe);
        results.timeframes[timeframe] = timeframeResult;
        
        if (timeframeResult.success) {
          results.successful++;
        } else {
          results.failed++;
        }
      } catch (error) {
        this.logger.error(`❌ Failed to fetch ${timeframe} data:`, error);
        results.failed++;
        results.timeframes[timeframe] = { success: false, error: error.message };
      }
    }

    // Perform data fusion if enabled
    if (this.fusionConfig.enableDataFusion) {
      await this.performDataFusion();
    }

    const totalTime = Date.now() - startTime;
    this.logger.info(`✅ Multi-source fetch completed in ${totalTime}ms (${results.successful}/${results.successful + results.failed} successful)`);

    return results;
  }

  /**
   * Fetch data for a specific timeframe from all sources
   */
  async fetchTimeframeFromAllSources(timeframe) {
    const providers = this.getActiveProviders();
    const results = {
      success: false,
      sources: {},
      fusedData: null,
      quality: 0
    };

    // Fetch from each provider in parallel
    const fetchPromises = providers.map(async (provider) => {
      try {
        const data = await this.fetchFromProvider(provider, timeframe);
        results.sources[provider] = { success: true, data, quality: this.assessDataQuality(data) };
        return { provider, success: true, data };
      } catch (error) {
        this.logger.warn(`⚠️ ${provider} failed for ${timeframe}:`, error.message);
        results.sources[provider] = { success: false, error: error.message, quality: 0 };
        this.handleProviderError(provider, error);
        return { provider, success: false, error };
      }
    });

    const fetchResults = await Promise.allSettled(fetchPromises);
    
    // Process results
    const successfulSources = fetchResults
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);

    if (successfulSources.length >= this.fusionConfig.minDataSources) {
      // Store individual source data
      successfulSources.forEach(({ provider, data }) => {
        this.marketData[timeframe].sources[provider].candles = data;
        this.marketData[timeframe].sources[provider].lastUpdate = Date.now();
      });

      results.success = true;
      results.quality = this.calculateOverallQuality(results.sources);
    }

    return results;
  }

  /**
   * Fetch data from a specific provider
   */
  async fetchFromProvider(provider, timeframe) {
    if (!this.canMakeRequest(provider)) {
      throw new Error(`Rate limit exceeded for ${provider}`);
    }

    const startTime = Date.now();
    let data;

    try {
      switch (provider) {
        case 'twelveData':
          data = await this.fetchFromTwelveData(timeframe);
          break;
        case 'finnhub':
          data = await this.fetchFromFinnhub(timeframe);
          break;
        case 'alphaVantage':
          data = await this.fetchFromAlphaVantage(timeframe);
          break;
        case 'polygon':
          data = await this.fetchFromPolygon(timeframe);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Update provider health
      const responseTime = Date.now() - startTime;
      this.updateProviderHealth(provider, true, responseTime);
      
      return data;

    } catch (error) {
      this.updateProviderHealth(provider, false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Fetch data from Twelve Data API
   */
  async fetchFromTwelveData(timeframe) {
    const interval = this.convertTimeframeToTwelveData(timeframe);
    const url = `${this.apiProviders.twelveData.baseUrl}/time_series`;
    
    const params = {
      symbol: this.symbol.twelveData,
      interval: interval,
      outputsize: this.maxCandlesPerTimeframe,
      apikey: this.apiProviders.twelveData.apiKey
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    
    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    return this.normalizeDataFromTwelveData(response.data);
  }

  /**
   * Fetch data from Finnhub API
   */
  async fetchFromFinnhub(timeframe) {
    const resolution = this.convertTimeframeToFinnhub(timeframe);
    const url = `${this.apiProviders.finnhub.baseUrl}/forex/candle`;
    
    const to = Math.floor(Date.now() / 1000);
    const from = to - (this.maxCandlesPerTimeframe * this.getTimeframeInSeconds(timeframe));
    
    const params = {
      symbol: this.symbol.finnhub,
      resolution: resolution,
      from: from,
      to: to,
      token: this.apiProviders.finnhub.apiKey
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    
    if (response.data.s !== 'ok') {
      throw new Error('No data available from Finnhub');
    }

    return this.normalizeDataFromFinnhub(response.data);
  }

  /**
   * Fetch data from Alpha Vantage API
   */
  async fetchFromAlphaVantage(timeframe) {
    const interval = this.convertTimeframeToAlphaVantage(timeframe);
    const url = this.apiProviders.alphaVantage.baseUrl;
    
    const params = {
      function: 'FX_INTRADAY',
      from_symbol: this.symbol.alphaVantage.from,
      to_symbol: this.symbol.alphaVantage.to,
      interval: interval,
      outputsize: 'full',
      apikey: this.apiProviders.alphaVantage.apiKey
    };

    const response = await axios.get(url, { params, timeout: 15000 });
    
    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    return this.normalizeDataFromAlphaVantage(response.data, interval);
  }

  /**
   * Fetch data from Polygon.io API
   */
  async fetchFromPolygon(timeframe) {
    const multiplier = this.convertTimeframeToPolygon(timeframe);
    const timespan = multiplier.timespan;
    const mult = multiplier.multiplier;
    
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    const url = `${this.apiProviders.polygon.baseUrl}/v2/aggs/ticker/C:${this.symbol.polygon}/range/${mult}/${timespan}/${from}/${to}`;
    
    const response = await axios.get(url, {
      params: { apikey: this.apiProviders.polygon.apiKey },
      timeout: 10000
    });
    
    if (response.data.status !== 'OK') {
      throw new Error('No data available from Polygon');
    }

    return this.normalizeDataFromPolygon(response.data);
  }

  /**
   * Perform data fusion across all sources
   */
  async performDataFusion() {
    this.logger.info('🔄 Performing data fusion...');
    
    for (const timeframe of this.timeframes) {
      try {
        const fusedData = await this.fuseTimeframeData(timeframe);
        if (fusedData && fusedData.length > 0) {
          this.marketData[timeframe].candles = fusedData;
          this.marketData[timeframe].lastUpdate = Date.now();
          this.marketData[timeframe].quality = this.assessFusedDataQuality(timeframe);
        }
      } catch (error) {
        this.logger.error(`❌ Data fusion failed for ${timeframe}:`, error);
      }
    }
  }

  /**
   * Fuse data for a specific timeframe
   */
  async fuseTimeframeData(timeframe) {
    const sources = this.marketData[timeframe].sources;
    const availableSources = Object.keys(sources).filter(
      provider => sources[provider].candles && sources[provider].candles.length > 0
    );

    if (availableSources.length === 0) {
      return [];
    }

    if (availableSources.length === 1) {
      return sources[availableSources[0]].candles;
    }

    // Multi-source fusion logic
    const fusedCandles = [];
    const primarySource = availableSources[0];
    const primaryCandles = sources[primarySource].candles;

    for (let i = 0; i < primaryCandles.length; i++) {
      const primaryCandle = primaryCandles[i];
      const fusedCandle = { ...primaryCandle };
      
      // Cross-verify with other sources
      if (this.fusionConfig.crossVerifyCandles) {
        const verificationResults = this.crossVerifyCandle(primaryCandle, availableSources, sources, i);
        
        if (verificationResults.anomaly) {
          this.logger.warn(`⚠️ Anomaly detected in ${timeframe} candle at ${primaryCandle.timestamp}`);
          
          // Use consensus values if available
          if (verificationResults.consensus) {
            Object.assign(fusedCandle, verificationResults.consensus);
          }
        }
      }
      
      // Add data quality metadata
      fusedCandle.quality = {
        sources: availableSources.length,
        verified: !verificationResults?.anomaly,
        confidence: this.calculateCandleConfidence(fusedCandle, availableSources, sources, i)
      };
      
      fusedCandles.push(fusedCandle);
    }

    // Fill missing data if enabled
    if (this.fusionConfig.fillMissingData) {
      this.fillMissingCandles(fusedCandles, timeframe);
    }

    return fusedCandles;
  }

  /**
   * Cross-verify a candle across multiple sources
   */
  crossVerifyCandle(primaryCandle, availableSources, sources, index) {
    const verificationData = [];
    
    // Collect data from all sources for this candle
    availableSources.forEach(provider => {
      const providerCandles = sources[provider].candles;
      if (providerCandles && providerCandles[index]) {
        verificationData.push({
          provider,
          candle: providerCandles[index]
        });
      }
    });

    if (verificationData.length < 2) {
      return { anomaly: false };
    }

    // Check for price anomalies
    const prices = verificationData.map(d => d.candle.close);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const maxDeviation = Math.max(...prices.map(price => Math.abs(price - avgPrice) / avgPrice));

    if (maxDeviation > this.fusionConfig.anomalyThreshold) {
      // Calculate consensus values
      const consensus = {
        open: this.calculateConsensusValue(verificationData.map(d => d.candle.open)),
        high: this.calculateConsensusValue(verificationData.map(d => d.candle.high)),
        low: this.calculateConsensusValue(verificationData.map(d => d.candle.low)),
        close: this.calculateConsensusValue(verificationData.map(d => d.candle.close)),
        volume: this.calculateConsensusValue(verificationData.map(d => d.candle.volume))
      };

      return { anomaly: true, consensus, deviation: maxDeviation };
    }

    return { anomaly: false };
  }

  /**
   * Calculate consensus value from multiple sources
   */
  calculateConsensusValue(values) {
    // Remove outliers and calculate median
    const sorted = values.filter(v => v != null).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length === 0) return null;
    if (sorted.length === 1) return sorted[0];
    
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Get the latest fused market data
   */
  getLatestData() {
    const data = {};
    const metadata = {
      lastUpdate: 0,
      quality: {},
      sources: this.getActiveProviders(),
      health: this.isHealthy
    };

    this.timeframes.forEach(timeframe => {
      const timeframeData = this.marketData[timeframe];
      if (timeframeData && timeframeData.candles.length > 0) {
        data[timeframe] = timeframeData.candles;
        metadata.quality[timeframe] = timeframeData.quality;
        metadata.lastUpdate = Math.max(metadata.lastUpdate, timeframeData.lastUpdate);
      }
    });

    return {
      data,
      metadata,
      timestamp: Date.now(),
      pair: this.currencyPair,
      fusion: this.fusionConfig.enableDataFusion
    };
  }

  /**
   * Check if market data is fresh
   */
  isDataFresh(maxAge = this.fusionConfig.maxDataAge) {
    const now = Date.now();
    return this.timeframes.every(timeframe => {
      const lastUpdate = this.marketData[timeframe].lastUpdate;
      return lastUpdate > 0 && (now - lastUpdate) < maxAge;
    });
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    const activeProviders = this.getActiveProviders();
    const healthyProviders = activeProviders.filter(provider => 
      this.providerHealth[provider].healthy
    );

    const overallHealth = {
      healthy: this.isHealthy && healthyProviders.length >= this.fusionConfig.minDataSources,
      providers: {
        total: activeProviders.length,
        healthy: healthyProviders.length,
        unhealthy: activeProviders.length - healthyProviders.length
      },
      dataQuality: {},
      lastUpdate: Math.max(...this.timeframes.map(tf => this.marketData[tf].lastUpdate))
    };

    // Add data quality for each timeframe
    this.timeframes.forEach(timeframe => {
      overallHealth.dataQuality[timeframe] = this.marketData[timeframe].quality;
    });

    return overallHealth;
  }

  // Helper methods for provider-specific formatting and normalization
  formatSymbolForProviders(currencyPair) {
    const [base, quote] = currencyPair.split('/');
    return {
      twelveData: `${base}${quote}`,
      finnhub: `OANDA:${base}_${quote}`,
      alphaVantage: { from: base, to: quote },
      polygon: `${base}${quote}`
    };
  }

  getActiveProviders() {
    return Object.keys(this.apiProviders).filter(provider => 
      this.apiProviders[provider].active
    );
  }

  canMakeRequest(provider) {
    const now = Date.now();
    const providerConfig = this.apiProviders[provider];
    const lastRequest = this.lastRequestTimes[provider];
    
    // Check rate limits
    if (provider === 'twelveData') {
      // Daily limit
      return this.requestCounts[provider] < providerConfig.rateLimit;
    } else {
      // Per-minute limits
      const timeSinceLastRequest = now - lastRequest;
      return timeSinceLastRequest >= (60000 / providerConfig.rateLimit);
    }
  }

  updateProviderHealth(provider, success, responseTime) {
    const health = this.providerHealth[provider];
    health.totalRequests++;
    
    if (success) {
      this.consecutiveErrors[provider] = 0;
      health.avgResponseTime = (health.avgResponseTime + responseTime) / 2;
    } else {
      this.consecutiveErrors[provider]++;
      health.failedRequests++;
      health.lastError = new Date().toISOString();
    }
    
    health.successRate = ((health.totalRequests - health.failedRequests) / health.totalRequests) * 100;
    health.healthy = this.consecutiveErrors[provider] < this.maxConsecutiveErrors;
    
    this.requestCounts[provider]++;
    this.lastRequestTimes[provider] = Date.now();
  }

  handleProviderError(provider, error) {
    this.logger.warn(`⚠️ Provider ${provider} error:`, error.message);
    
    if (this.consecutiveErrors[provider] >= this.maxConsecutiveErrors) {
      this.logger.error(`🚨 Provider ${provider} marked as unhealthy`);
      this.apiProviders[provider].active = false;
      
      // Check if we still have enough healthy providers
      const healthyProviders = this.getActiveProviders().filter(p => 
        this.providerHealth[p].healthy
      );
      
      if (healthyProviders.length < this.fusionConfig.minDataSources) {
        this.logger.error('🚨 Insufficient healthy data providers!');
        this.isHealthy = false;
      }
    }
  }

  updateSystemHealth() {
    const healthyProviders = this.getActiveProviders().filter(provider => 
      this.providerHealth[provider].healthy
    );
    
    this.isHealthy = healthyProviders.length >= this.fusionConfig.minDataSources;
  }

  // Data quality assessment methods
  assessDataQuality(data) {
    if (!data || data.length === 0) return 0;
    
    let score = 100;
    
    // Check completeness
    const expectedCandles = this.maxCandlesPerTimeframe;
    const completeness = (data.length / expectedCandles) * 100;
    score *= (completeness / 100);
    
    // Check for gaps
    const gaps = this.detectDataGaps(data);
    if (gaps > 0) {
      score *= Math.max(0.5, 1 - (gaps / data.length));
    }
    
    // Check data freshness
    if (data.length > 0) {
      const latestCandle = data[data.length - 1];
      const age = Date.now() - latestCandle.timestamp;
      if (age > this.fusionConfig.maxDataAge) {
        score *= 0.7;
      }
    }
    
    return Math.round(score);
  }

  assessFusedDataQuality(timeframe) {
    const data = this.marketData[timeframe];
    const sources = Object.keys(data.sources).filter(provider => 
      data.sources[provider].candles && data.sources[provider].candles.length > 0
    );
    
    const completeness = data.candles.length > 0 ? 100 : 0;
    const consistency = this.calculateDataConsistency(timeframe);
    const freshness = this.isDataFresh() ? 100 : 50;
    const sourceReliability = (sources.length / this.getActiveProviders().length) * 100;
    
    const overall = (completeness + consistency + freshness + sourceReliability) / 4;
    
    return {
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      freshness: Math.round(freshness),
      sourceReliability: Math.round(sourceReliability),
      overall: Math.round(overall)
    };
  }

  calculateDataConsistency(timeframe) {
    const sources = this.marketData[timeframe].sources;
    const providers = Object.keys(sources).filter(p => sources[p].candles.length > 0);
    
    if (providers.length < 2) return 100;
    
    let consistencyScore = 100;
    const sampleSize = Math.min(10, sources[providers[0]].candles.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const prices = providers.map(p => sources[p].candles[i]?.close).filter(p => p != null);
      if (prices.length > 1) {
        const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const maxDeviation = Math.max(...prices.map(price => Math.abs(price - avg) / avg));
        
        if (maxDeviation > this.fusionConfig.anomalyThreshold) {
          consistencyScore -= 10;
        }
      }
    }
    
    return Math.max(0, consistencyScore);
  }

  calculateOverallQuality(sources) {
    const qualities = Object.values(sources)
      .filter(source => source.success)
      .map(source => source.quality);
    
    if (qualities.length === 0) return 0;
    
    return qualities.reduce((sum, quality) => sum + quality, 0) / qualities.length;
  }

  calculateCandleConfidence(candle, availableSources, sources, index) {
    let confidence = 100;
    
    // Reduce confidence if fewer sources
    confidence *= (availableSources.length / this.getActiveProviders().length);
    
    // Check volume consistency
    const volumes = availableSources
      .map(provider => sources[provider].candles[index]?.volume)
      .filter(v => v != null);
    
    if (volumes.length > 1) {
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      const maxVolumeDeviation = Math.max(...volumes.map(vol => Math.abs(vol - avgVolume) / avgVolume));
      
      if (maxVolumeDeviation > 0.5) { // 50% volume deviation
        confidence *= 0.8;
      }
    }
    
    return Math.round(confidence);
  }

  detectDataGaps(data) {
    if (data.length < 2) return 0;
    
    let gaps = 0;
    for (let i = 1; i < data.length; i++) {
      const timeDiff = data[i].timestamp - data[i-1].timestamp;
      const expectedDiff = this.getTimeframeInMilliseconds('5m'); // Assuming 5m default
      
      if (timeDiff > expectedDiff * 1.5) {
        gaps++;
      }
    }
    
    return gaps;
  }

  fillMissingCandles(candles, timeframe) {
    if (candles.length < 2) return;
    
    const timeframeMs = this.getTimeframeInMilliseconds(timeframe);
    const filledCandles = [candles[0]];
    
    for (let i = 1; i < candles.length; i++) {
      const prevCandle = filledCandles[filledCandles.length - 1];
      const currentCandle = candles[i];
      const timeDiff = currentCandle.timestamp - prevCandle.timestamp;
      
      if (timeDiff > timeframeMs * 1.5) {
        // Fill gap with interpolated candles
        const gapCount = Math.floor(timeDiff / timeframeMs) - 1;
        
        for (let j = 1; j <= gapCount; j++) {
          const interpolatedCandle = {
            timestamp: prevCandle.timestamp + (j * timeframeMs),
            open: prevCandle.close,
            high: prevCandle.close,
            low: prevCandle.close,
            close: prevCandle.close,
            volume: 0,
            quality: {
              sources: 0,
              verified: false,
              confidence: 0,
              interpolated: true
            }
          };
          
          filledCandles.push(interpolatedCandle);
        }
      }
      
      filledCandles.push(currentCandle);
    }
    
    // Replace original array
    candles.splice(0, candles.length, ...filledCandles);
  }

  // Timeframe conversion utilities
  convertTimeframeToTwelveData(timeframe) {
    const mapping = {
      '1m': '1min', '3m': '3min', '5m': '5min', '15m': '15min',
      '30m': '30min', '1h': '1h', '4h': '4h'
    };
    return mapping[timeframe] || '5min';
  }

  convertTimeframeToFinnhub(timeframe) {
    const mapping = {
      '1m': '1', '3m': '3', '5m': '5', '15m': '15',
      '30m': '30', '1h': '60', '4h': '240'
    };
    return mapping[timeframe] || '5';
  }

  convertTimeframeToAlphaVantage(timeframe) {
    const mapping = {
      '1m': '1min', '3m': '5min', '5m': '5min', '15m': '15min',
      '30m': '30min', '1h': '60min', '4h': '60min'
    };
    return mapping[timeframe] || '5min';
  }

  convertTimeframeToPolygon(timeframe) {
    const mapping = {
      '1m': { multiplier: 1, timespan: 'minute' },
      '3m': { multiplier: 3, timespan: 'minute' },
      '5m': { multiplier: 5, timespan: 'minute' },
      '15m': { multiplier: 15, timespan: 'minute' },
      '30m': { multiplier: 30, timespan: 'minute' },
      '1h': { multiplier: 1, timespan: 'hour' },
      '4h': { multiplier: 4, timespan: 'hour' }
    };
    return mapping[timeframe] || { multiplier: 5, timespan: 'minute' };
  }

  getTimeframeInSeconds(timeframe) {
    const mapping = {
      '1m': 60, '3m': 180, '5m': 300, '15m': 900,
      '30m': 1800, '1h': 3600, '4h': 14400
    };
    return mapping[timeframe] || 300;
  }

  getTimeframeInMilliseconds(timeframe) {
    return this.getTimeframeInSeconds(timeframe) * 1000;
  }

  // Data normalization methods for each provider
  normalizeDataFromTwelveData(data) {
    if (!data.values) return [];
    
    return data.values.map(candle => ({
      timestamp: new Date(candle.datetime).getTime(),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume) || 0
    })).reverse(); // Twelve Data returns newest first
  }

  normalizeDataFromFinnhub(data) {
    const candles = [];
    
    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        timestamp: data.t[i] * 1000,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i] || 0
      });
    }
    
    return candles.sort((a, b) => a.timestamp - b.timestamp);
  }

  normalizeDataFromAlphaVantage(data, interval) {
    const timeSeriesKey = `Time Series FX (${interval})`;
    const timeSeries = data[timeSeriesKey];
    
    if (!timeSeries) return [];
    
    return Object.entries(timeSeries).map(([datetime, values]) => ({
      timestamp: new Date(datetime).getTime(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: 0 // Alpha Vantage doesn't provide forex volume
    })).sort((a, b) => a.timestamp - b.timestamp);
  }

  normalizeDataFromPolygon(data) {
    if (!data.results) return [];
    
    return data.results.map(candle => ({
      timestamp: candle.t,
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
      volume: candle.v || 0
    })).sort((a, b) => a.timestamp - b.timestamp);
  }
}

module.exports = { EnhancedMarketDataManager };