/**
 * Pocket Option Data Extractor
 * 
 * Specialized extractor for Pocket Option platform:
 * - Extracts real-time candle data from Pocket Option charts
 * - Identifies OTC assets and weekend trading pairs
 * - Provides normalized data format for AI analysis
 */

class PocketOptionExtractor {
  constructor(config = {}) {
    this.config = {
      debug: false,
      extractionInterval: 1000, // 1 second
      maxHistoricalCandles: 300,
      ...config
    };
    
    this.isExtracting = false;
    this.extractionTimer = null;
    this.lastExtractionTime = null;
    this.currentAsset = null;
    this.currentTimeframe = null;
    this.observers = [];
    this.chartObserver = null;
    this.candleData = {
      candles: [],
      asset: null,
      timeframe: null
    };
    
    // DOM selectors for Pocket Option
    this.selectors = {
      chart: '.chart-container, .tv-chart-container, .chart-area',
      assetName: '.asset-name, .symbol-name, .instrument-name, .chart-symbol-name',
      timeframeSelector: '.chart-timeframe-selector, .timeframe-selector',
      timeframeButtons: '.timeframe-button, .chart-timeframe-button',
      candleElements: '.chart-candle, .candle, .tv-chart__candle',
      priceDisplay: '.chart-price, .price-display, .current-price',
      otcBadge: '.otc-badge, .weekend-badge, [data-otc="true"]'
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the extractor
   */
  init() {
    if (this.config.debug) {
      console.log('Initializing Pocket Option Extractor');
    }
    
    // Check if we're on Pocket Option
    if (!this.isPocketOption()) {
      console.warn('Not on Pocket Option platform');
      return;
    }
    
    // Set up mutation observer for chart changes
    this.setupChartObserver();
    
    // Initial detection
    this.detectCurrentAsset();
    this.detectCurrentTimeframe();
  }
  
  /**
   * Check if current page is Pocket Option
   */
  isPocketOption() {
    const hostname = window.location.hostname;
    return hostname.includes('pocketoption.com') || 
           hostname.includes('po.trade') || 
           document.title.toLowerCase().includes('pocket option');
  }
  
  /**
   * Set up mutation observer for chart changes
   */
  setupChartObserver() {
    // Disconnect existing observer if any
    if (this.chartObserver) {
      this.chartObserver.disconnect();
    }
    
    // Create new observer
    this.chartObserver = new MutationObserver((mutations) => {
      // Check if asset or timeframe has changed
      const newAsset = this.detectCurrentAsset();
      const newTimeframe = this.detectCurrentTimeframe();
      
      if (newAsset !== this.currentAsset || newTimeframe !== this.currentTimeframe) {
        // Asset or timeframe changed
        this.currentAsset = newAsset;
        this.currentTimeframe = newTimeframe;
        
        // Reset candle data
        this.candleData = {
          candles: [],
          asset: newAsset,
          timeframe: newTimeframe
        };
        
        // Notify observers
        this.notifyObservers({
          type: 'asset_changed',
          asset: newAsset,
          timeframe: newTimeframe,
          isOTC: this.isOTCAsset(newAsset)
        });
      }
    });
    
    // Start observing
    const chartContainer = document.querySelector(this.selectors.chart);
    if (chartContainer) {
      this.chartObserver.observe(chartContainer, {
        childList: true,
        subtree: true,
        attributes: true
      });
      
      if (this.config.debug) {
        console.log('Chart observer set up');
      }
    } else {
      // Try again later
      setTimeout(() => this.setupChartObserver(), 2000);
      
      if (this.config.debug) {
        console.log('Chart container not found, will retry');
      }
    }
  }
  
  /**
   * Detect current asset
   */
  detectCurrentAsset() {
    try {
      // Try different selectors
      const assetElement = document.querySelector(this.selectors.assetName);
      
      if (assetElement) {
        const assetName = assetElement.textContent.trim();
        
        if (this.config.debug) {
          console.log(`Detected asset: ${assetName}`);
        }
        
        return assetName;
      }
      
      // Try to find from chart data attributes
      const chartElement = document.querySelector(this.selectors.chart);
      if (chartElement && chartElement.dataset.asset) {
        return chartElement.dataset.asset;
      }
      
      // Try to find from URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('symbol')) {
        return urlParams.get('symbol');
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting asset:', error);
      return null;
    }
  }
  
  /**
   * Detect current timeframe
   */
  detectCurrentTimeframe() {
    try {
      // Try to find active timeframe button
      const timeframeButtons = document.querySelectorAll(this.selectors.timeframeButtons);
      
      for (const button of timeframeButtons) {
        if (button.classList.contains('active') || button.getAttribute('aria-selected') === 'true') {
          const timeframe = button.textContent.trim();
          
          // Normalize timeframe
          return this.normalizeTimeframe(timeframe);
        }
      }
      
      // Try to find from chart data attributes
      const chartElement = document.querySelector(this.selectors.chart);
      if (chartElement && chartElement.dataset.timeframe) {
        return this.normalizeTimeframe(chartElement.dataset.timeframe);
      }
      
      // Default to 5M
      return '5M';
    } catch (error) {
      console.error('Error detecting timeframe:', error);
      return '5M';
    }
  }
  
  /**
   * Normalize timeframe to standard format
   */
  normalizeTimeframe(timeframe) {
    if (!timeframe) return '5M';
    
    const tf = timeframe.toString().toUpperCase();
    
    // Common Pocket Option timeframes
    if (tf === '1' || tf === '1M' || tf === '1MIN' || tf === '1 MIN' || tf === '1 MINUTE') return '1M';
    if (tf === '5' || tf === '5M' || tf === '5MIN' || tf === '5 MIN' || tf === '5 MINUTE') return '5M';
    if (tf === '15' || tf === '15M' || tf === '15MIN' || tf === '15 MIN' || tf === '15 MINUTE') return '15M';
    if (tf === '30' || tf === '30M' || tf === '30MIN' || tf === '30 MIN' || tf === '30 MINUTE') return '30M';
    if (tf === '1H' || tf === '1 HOUR' || tf === '1 HR' || tf === '60' || tf === '60M') return '1H';
    if (tf === '4H' || tf === '4 HOUR' || tf === '4 HR' || tf === '240' || tf === '240M') return '4H';
    if (tf === '1D' || tf === '1 DAY' || tf === 'D' || tf === 'DAY') return '1D';
    
    // Return original if no match
    return tf;
  }
  
  /**
   * Check if asset is OTC
   */
  isOTCAsset(asset) {
    if (!asset) return false;
    
    const assetName = asset.toString().toLowerCase();
    
    // Check for OTC indicators in name
    if (
      assetName.includes('otc') ||
      assetName.includes('(otc)') ||
      assetName.includes('-otc') ||
      assetName.includes('weekend') ||
      assetName.includes('synthetic') ||
      assetName.includes('random') ||
      assetName.includes('virtual') ||
      assetName.includes('crypto idx') ||
      assetName.includes('boom') ||
      assetName.includes('crash') ||
      assetName.includes('volatility') ||
      assetName.includes('jump') ||
      assetName.includes('demo')
    ) {
      console.log(`Detected OTC asset by name: ${asset}`);
      return true;
    }
    
    // Check for OTC badge in DOM
    const otcBadge = document.querySelector(this.selectors.otcBadge);
    if (otcBadge) {
      console.log(`Detected OTC asset by badge: ${asset}`);
      return true;
    }
    
    // Check if we're on a weekend (Saturday or Sunday)
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      // On weekends, most forex pairs are OTC in Pocket Option
      const weekendForexPairs = [
        'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad', 'eur/jpy',
        'gbp/jpy', 'eur/gbp', 'aud/jpy', 'usd/chf', 'eur/aud', 'eur/cad',
        'nzd/usd', 'usd/sgd', 'eur/nzd', 'gbp/aud', 'gbp/cad'
      ];
      
      for (const pair of weekendForexPairs) {
        if (assetName.includes(pair)) {
          console.log(`Detected weekend OTC forex pair: ${asset}`);
          return true;
        }
      }
      
      // On weekends, most indices are OTC
      const weekendIndices = [
        'dax', 'cac', 'ftse', 'dow', 'nasdaq', 's&p', 'sp500', 'nikkei', 
        'hang seng', 'asx', 'stoxx', 'ibex', 'ftse100', 'dji', 'ndx'
      ];
      
      for (const index of weekendIndices) {
        if (assetName.includes(index)) {
          console.log(`Detected weekend OTC index: ${asset}`);
          return true;
        }
      }
    }
    
    // Pocket Option specific OTC assets
    const pocketOptionOTCAssets = [
      'crypto idx', 'crypto idx 10', 'jump 10', 'jump 25', 'jump 50', 'jump 75', 'jump 100',
      'boom 500', 'boom 1000', 'crash 500', 'crash 1000', 'volatility 10', 'volatility 25',
      'volatility 50', 'volatility 75', 'volatility 100'
    ];
    
    for (const otcAsset of pocketOptionOTCAssets) {
      if (assetName.includes(otcAsset)) {
        console.log(`Detected Pocket Option specific OTC asset: ${asset}`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Start real-time data extraction
   */
  startRealtimeExtraction() {
    if (this.isExtracting) return;
    
    this.isExtracting = true;
    this.lastExtractionTime = Date.now();
    
    // Initial extraction
    this.extractData();
    
    // Set up interval
    this.extractionTimer = setInterval(() => {
      this.extractData();
    }, this.config.extractionInterval);
    
    if (this.config.debug) {
      console.log('Started real-time extraction');
    }
    
    // Notify observers
    this.notifyObservers({
      type: 'extraction_started',
      asset: this.currentAsset,
      timeframe: this.currentTimeframe,
      isOTC: this.isOTCAsset(this.currentAsset)
    });
  }
  
  /**
   * Stop real-time data extraction
   */
  stopRealtimeExtraction() {
    if (!this.isExtracting) return;
    
    this.isExtracting = false;
    
    // Clear interval
    if (this.extractionTimer) {
      clearInterval(this.extractionTimer);
      this.extractionTimer = null;
    }
    
    if (this.config.debug) {
      console.log('Stopped real-time extraction');
    }
    
    // Notify observers
    this.notifyObservers({
      type: 'extraction_stopped',
      asset: this.currentAsset,
      timeframe: this.currentTimeframe
    });
  }
  
  /**
   * Extract data from chart
   */
  extractData() {
    try {
      // Update current asset and timeframe
      this.currentAsset = this.detectCurrentAsset();
      this.currentTimeframe = this.detectCurrentTimeframe();
      
      if (!this.currentAsset || !this.currentTimeframe) {
        if (this.config.debug) {
          console.log('Asset or timeframe not detected');
        }
        return;
      }
      
      // Extract candle data
      this.extractCandleData();
      
      // Update last extraction time
      this.lastExtractionTime = Date.now();
    } catch (error) {
      console.error('Error extracting data:', error);
    }
  }
  
  /**
   * Extract candle data from chart
   */
  extractCandleData() {
    try {
      // For Pocket Option, we need to extract data from the chart DOM
      // This is a simplified approach and may need to be adjusted based on the actual DOM structure
      
      // Get current price
      const priceElement = document.querySelector(this.selectors.priceDisplay);
      let currentPrice = null;
      
      if (priceElement) {
        currentPrice = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
      }
      
      if (!currentPrice) {
        // Try to get from chart data
        const chartData = this.extractChartData();
        
        if (chartData && chartData.length > 0) {
          // Use the last candle's close price
          const lastCandle = chartData[chartData.length - 1];
          currentPrice = lastCandle.close;
          
          // Update candle data
          this.updateCandleData(chartData);
        }
      } else {
        // Create a new candle with current price
        const timestamp = Math.floor(Date.now() / 1000) * 1000;
        
        // Check if we already have a candle for this timestamp
        const existingCandle = this.candleData.candles.find(c => c.timestamp === timestamp);
        
        if (existingCandle) {
          // Update existing candle
          existingCandle.close = currentPrice;
          existingCandle.high = Math.max(existingCandle.high, currentPrice);
          existingCandle.low = Math.min(existingCandle.low, currentPrice);
        } else {
          // Create new candle
          const newCandle = {
            timestamp,
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0
          };
          
          // Add to candles
          this.candleData.candles.push(newCandle);
          
          // Limit to max candles
          if (this.candleData.candles.length > this.config.maxHistoricalCandles) {
            this.candleData.candles = this.candleData.candles.slice(-this.config.maxHistoricalCandles);
          }
        }
        
        // Update asset and timeframe
        this.candleData.asset = this.currentAsset;
        this.candleData.timeframe = this.currentTimeframe;
        
        // Notify observers
        this.notifyObservers({
          type: 'data_update',
          asset: this.currentAsset,
          timeframe: this.currentTimeframe,
          candles: this.candleData.candles,
          isOTC: this.isOTCAsset(this.currentAsset)
        });
      }
    } catch (error) {
      console.error('Error extracting candle data:', error);
    }
  }
  
  /**
   * Extract chart data from DOM
   * This is a more advanced method that tries to access the chart's internal data
   */
  extractChartData() {
    try {
      // Try to find TradingView chart instance
      if (window.tvWidget) {
        const chart = window.tvWidget.chart();
        if (chart) {
          // Get visible range
          const range = chart.getVisibleRange();
          if (range) {
            // Get series data
            const series = chart.getSeries();
            if (series) {
              const bars = series.data.bars;
              if (bars && bars.length > 0) {
                // Convert to our format
                return bars.map(bar => ({
                  timestamp: bar.time * 1000,
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume || 0
                }));
              }
            }
          }
        }
      }
      
      // Try to find chart data in window object
      for (const key in window) {
        if (key.includes('chart') || key.includes('candle') || key.includes('ohlc')) {
          const obj = window[key];
          if (obj && Array.isArray(obj.data) && obj.data.length > 0) {
            // Check if it has OHLC structure
            const sample = obj.data[0];
            if (sample && (sample.open !== undefined || sample.o !== undefined)) {
              return obj.data.map(d => ({
                timestamp: d.time || d.timestamp || d.t || Date.now(),
                open: d.open || d.o || 0,
                high: d.high || d.h || 0,
                low: d.low || d.l || 0,
                close: d.close || d.c || 0,
                volume: d.volume || d.v || 0
              }));
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting chart data:', error);
      return null;
    }
  }
  
  /**
   * Update candle data with new data
   */
  updateCandleData(newCandles) {
    if (!newCandles || newCandles.length === 0) return;
    
    // Create a map of existing candles by timestamp
    const existingCandles = new Map();
    this.candleData.candles.forEach(candle => {
      existingCandles.set(candle.timestamp, candle);
    });
    
    // Add new candles
    newCandles.forEach(candle => {
      existingCandles.set(candle.timestamp, candle);
    });
    
    // Convert back to array and sort by timestamp
    this.candleData.candles = Array.from(existingCandles.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Limit to max candles
    if (this.candleData.candles.length > this.config.maxHistoricalCandles) {
      this.candleData.candles = this.candleData.candles.slice(-this.config.maxHistoricalCandles);
    }
    
    // Update asset and timeframe
    this.candleData.asset = this.currentAsset;
    this.candleData.timeframe = this.currentTimeframe;
    
    // Notify observers
    this.notifyObservers({
      type: 'data_update',
      asset: this.currentAsset,
      timeframe: this.currentTimeframe,
      candles: this.candleData.candles,
      isOTC: this.isOTCAsset(this.currentAsset)
    });
  }
  
  /**
   * Add observer for data updates
   */
  addObserver(callback) {
    if (typeof callback === 'function') {
      this.observers.push(callback);
      return true;
    }
    return false;
  }
  
  /**
   * Remove observer
   */
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index !== -1) {
      this.observers.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Notify all observers
   */
  notifyObservers(data) {
    this.observers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in observer callback:', error);
      }
    });
  }
  
  /**
   * Get current candle data
   */
  getCandleData() {
    return {
      ...this.candleData,
      isOTC: this.isOTCAsset(this.currentAsset),
      lastUpdate: this.lastExtractionTime
    };
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      isExtracting: this.isExtracting,
      currentAsset: this.currentAsset,
      currentTimeframe: this.currentTimeframe,
      isOTC: this.isOTCAsset(this.currentAsset),
      lastExtractionTime: this.lastExtractionTime,
      candleCount: this.candleData.candles.length
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PocketOptionExtractor };
} else {
  window.PocketOptionExtractor = PocketOptionExtractor;
}