/**
 * OTC Data Handler
 * 
 * Background script module for handling OTC data from content scripts:
 * - Receives and processes OTC data from broker platforms
 * - Stores data for analysis and signal generation
 * - Provides API for accessing OTC data
 */

// Global state for OTC data
const otcState = {
  isExtracting: false,
  currentBroker: null,
  extractionMethod: null,
  lastUpdate: null,
  activeTabs: new Map(), // Map of tabId -> { broker, method, lastUpdate }
  data: {
    // Organized by pair and timeframe
    // Format: { [pair]: { [timeframe]: { candles: [], lastUpdate: timestamp } } }
  }
};

// Initialize
function initialize() {
  console.log('OTC Data Handler initialized');
  
  // Set up message listeners
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Set up tab event listeners
  chrome.tabs.onRemoved.addListener(handleTabRemoved);
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(message, sender, sendResponse) {
  const tabId = sender.tab?.id;
  
  switch (message.action) {
    case 'otcExtractionStarted':
      handleExtractionStarted(message, tabId);
      break;
      
    case 'otcExtractionStopped':
      handleExtractionStopped(tabId);
      break;
      
    case 'otcExtractionMethodSelected':
      handleExtractionMethodSelected(message, tabId);
      break;
      
    case 'otcExtractionStatus':
      handleExtractionStatus(message.status, tabId);
      break;
      
    case 'otcDataUpdate':
      handleDataUpdate(message.data, tabId);
      break;
      
    case 'getOTCData':
      sendResponse(getOTCData(message.pair, message.timeframe));
      break;
      
    case 'getOTCStatus':
      sendResponse(getOTCStatus());
      break;
      
    case 'getAllOTCPairs':
      sendResponse(getAllOTCPairs());
      break;
  }
  
  return true; // Keep the message channel open for async responses
}

/**
 * Handle extraction started message
 */
function handleExtractionStarted(message, tabId) {
  if (!tabId) return;
  
  console.log(`OTC extraction started in tab ${tabId} for ${message.broker}`);
  
  otcState.activeTabs.set(tabId, {
    broker: message.broker,
    method: null,
    lastUpdate: Date.now(),
    isExtracting: true
  });
  
  updateGlobalState();
}

/**
 * Handle extraction stopped message
 */
function handleExtractionStopped(tabId) {
  if (!tabId) return;
  
  console.log(`OTC extraction stopped in tab ${tabId}`);
  
  if (otcState.activeTabs.has(tabId)) {
    const tabInfo = otcState.activeTabs.get(tabId);
    tabInfo.isExtracting = false;
    otcState.activeTabs.set(tabId, tabInfo);
  }
  
  updateGlobalState();
}

/**
 * Handle extraction method selected message
 */
function handleExtractionMethodSelected(message, tabId) {
  if (!tabId) return;
  
  console.log(`OTC extraction method selected in tab ${tabId}: ${message.method} for ${message.broker}`);
  
  if (otcState.activeTabs.has(tabId)) {
    const tabInfo = otcState.activeTabs.get(tabId);
    tabInfo.method = message.method;
    otcState.activeTabs.set(tabId, tabInfo);
  } else {
    otcState.activeTabs.set(tabId, {
      broker: message.broker,
      method: message.method,
      lastUpdate: Date.now(),
      isExtracting: true
    });
  }
  
  updateGlobalState();
}

/**
 * Handle extraction status update
 */
function handleExtractionStatus(status, tabId) {
  if (!tabId) return;
  
  if (otcState.activeTabs.has(tabId)) {
    const tabInfo = otcState.activeTabs.get(tabId);
    tabInfo.isExtracting = status.isExtracting;
    tabInfo.broker = status.broker;
    tabInfo.method = status.method;
    tabInfo.lastUpdate = status.lastUpdate || Date.now();
    otcState.activeTabs.set(tabId, tabInfo);
  }
  
  updateGlobalState();
}

/**
 * Handle OTC data update
 */
function handleDataUpdate(data, tabId) {
  if (!data || !data.asset || !data.timeframe || !data.candles) {
    console.warn('Invalid OTC data update received');
    return;
  }
  
  console.log(`OTC data update received for ${data.asset} ${data.timeframe} (${data.candles.length} candles)`);
  
  // Update tab info
  if (tabId && otcState.activeTabs.has(tabId)) {
    const tabInfo = otcState.activeTabs.get(tabId);
    tabInfo.lastUpdate = Date.now();
    otcState.activeTabs.set(tabId, tabInfo);
  }
  
  // Normalize pair name
  const pair = normalizePairName(data.asset);
  const timeframe = normalizeTimeframe(data.timeframe);
  
  // Initialize data structure if needed
  if (!otcState.data[pair]) {
    otcState.data[pair] = {};
  }
  
  if (!otcState.data[pair][timeframe]) {
    otcState.data[pair][timeframe] = {
      candles: [],
      lastUpdate: null,
      broker: data.broker || otcState.currentBroker,
      isOTC: data.isOTC || false
    };
  }
  
  // Update candles, avoiding duplicates
  const existingCandles = otcState.data[pair][timeframe].candles;
  const newCandles = mergeCandles(existingCandles, data.candles);
  
  // Update data
  otcState.data[pair][timeframe] = {
    candles: newCandles,
    lastUpdate: Date.now(),
    broker: data.broker || otcState.currentBroker,
    isOTC: data.isOTC || false
  };
  
  // Update global state
  otcState.lastUpdate = Date.now();
  
  // Notify any listeners
  notifyDataUpdate(pair, timeframe);
}

/**
 * Merge candles, avoiding duplicates
 */
function mergeCandles(existingCandles, newCandles) {
  if (!existingCandles || existingCandles.length === 0) {
    return [...newCandles];
  }
  
  if (!newCandles || newCandles.length === 0) {
    return [...existingCandles];
  }
  
  // Create a map of existing candles by timestamp
  const candleMap = new Map();
  existingCandles.forEach(candle => {
    candleMap.set(candle.timestamp, candle);
  });
  
  // Add new candles
  newCandles.forEach(candle => {
    candleMap.set(candle.timestamp, candle);
  });
  
  // Convert back to array and sort by timestamp
  const mergedCandles = Array.from(candleMap.values())
    .sort((a, b) => a.timestamp - b.timestamp);
  
  // Limit to 1000 most recent candles
  if (mergedCandles.length > 1000) {
    return mergedCandles.slice(-1000);
  }
  
  return mergedCandles;
}

/**
 * Update global state based on active tabs
 */
function updateGlobalState() {
  // Check if any tab is extracting
  let anyExtracting = false;
  let latestBroker = null;
  let latestMethod = null;
  let latestUpdate = null;
  
  for (const [tabId, info] of otcState.activeTabs.entries()) {
    if (info.isExtracting) {
      anyExtracting = true;
      
      // Update latest info
      if (!latestUpdate || info.lastUpdate > latestUpdate) {
        latestBroker = info.broker;
        latestMethod = info.method;
        latestUpdate = info.lastUpdate;
      }
    }
  }
  
  // Update global state
  otcState.isExtracting = anyExtracting;
  otcState.currentBroker = latestBroker;
  otcState.extractionMethod = latestMethod;
  
  if (latestUpdate) {
    otcState.lastUpdate = latestUpdate;
  }
}

/**
 * Handle tab removed event
 */
function handleTabRemoved(tabId) {
  if (otcState.activeTabs.has(tabId)) {
    console.log(`Tab ${tabId} removed, cleaning up OTC extraction state`);
    otcState.activeTabs.delete(tabId);
    updateGlobalState();
  }
}

/**
 * Get OTC data for a specific pair and timeframe
 */
function getOTCData(pair, timeframe) {
  if (!pair || !timeframe) {
    return {
      success: false,
      error: 'Pair and timeframe are required'
    };
  }
  
  const normalizedPair = normalizePairName(pair);
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  
  if (otcState.data[normalizedPair] && otcState.data[normalizedPair][normalizedTimeframe]) {
    return {
      success: true,
      pair: normalizedPair,
      timeframe: normalizedTimeframe,
      data: otcState.data[normalizedPair][normalizedTimeframe],
      isExtracting: otcState.isExtracting,
      broker: otcState.currentBroker
    };
  }
  
  return {
    success: false,
    error: 'No data available for the specified pair and timeframe',
    isExtracting: otcState.isExtracting,
    broker: otcState.currentBroker
  };
}

/**
 * Get current OTC extraction status
 */
function getOTCStatus() {
  return {
    isExtracting: otcState.isExtracting,
    broker: otcState.currentBroker,
    method: otcState.extractionMethod,
    lastUpdate: otcState.lastUpdate,
    activeTabs: Array.from(otcState.activeTabs.entries()).map(([tabId, info]) => ({
      tabId,
      ...info
    }))
  };
}

/**
 * Get all available OTC pairs and timeframes
 */
function getAllOTCPairs() {
  const pairs = Object.keys(otcState.data);
  const result = {
    pairs: [],
    timeframes: new Set(),
    pairTimeframes: {}
  };
  
  pairs.forEach(pair => {
    const timeframes = Object.keys(otcState.data[pair]);
    const isOTC = timeframes.some(tf => otcState.data[pair][tf].isOTC);
    
    // Only include OTC pairs
    if (isOTC) {
      result.pairs.push(pair);
      result.pairTimeframes[pair] = timeframes;
      
      // Add timeframes to set
      timeframes.forEach(tf => result.timeframes.add(tf));
    }
  });
  
  // Convert timeframes set to array
  result.timeframes = Array.from(result.timeframes);
  
  return {
    success: true,
    data: result,
    isExtracting: otcState.isExtracting,
    broker: otcState.currentBroker
  };
}

/**
 * Notify listeners of data update
 */
function notifyDataUpdate(pair, timeframe) {
  chrome.runtime.sendMessage({
    action: 'otcDataUpdated',
    pair,
    timeframe,
    timestamp: Date.now()
  }).catch(() => {
    // Ignore errors when no listeners
  });
}

/**
 * Normalize pair name
 */
function normalizePairName(pair) {
  if (!pair) return 'UNKNOWN';
  
  // Remove spaces and convert to uppercase
  let normalized = pair.toString().toUpperCase().replace(/\s+/g, '');
  
  // Replace / with _ for consistency
  normalized = normalized.replace(/\//g, '_');
  
  return normalized;
}

/**
 * Normalize timeframe
 */
function normalizeTimeframe(timeframe) {
  if (!timeframe) return '5M';
  
  const tf = timeframe.toString().toUpperCase();
  
  if (tf === '1M' || tf === '1MIN' || tf === '1' || tf === '1MINUTE') return '1M';
  if (tf === '3M' || tf === '3MIN' || tf === '3' || tf === '3MINUTE') return '3M';
  if (tf === '5M' || tf === '5MIN' || tf === '5' || tf === '5MINUTE') return '5M';
  if (tf === '15M' || tf === '15MIN' || tf === '15' || tf === '15MINUTE') return '15M';
  if (tf === '30M' || tf === '30MIN' || tf === '30' || tf === '30MINUTE') return '30M';
  if (tf === '1H' || tf === '1HOUR' || tf === '60M' || tf === '60MIN') return '1H';
  
  // Default to original if no match
  return tf;
}

// Initialize when loaded
initialize();