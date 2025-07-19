/**
 * AI Candle Sniper - OTC Mode Content Script
 * 
 * Specialized script for extracting OTC data from broker platforms during weekends
 * - Supports Pocket Option and Quotex brokers
 * - Uses DOM analysis, canvas extraction, and data injection to get real-time price data
 * - Sends data to background script for AI analysis
 * - Handles OTC trade execution
 */

console.log('AI Candle Sniper - OTC Mode Content Script Loaded');

// Global variables
let otcExtractor = null;
let isExtracting = false;
let currentData = null;
let lastUpdateTime = null;
let brokerDetected = null;
let activePair = null;
let activeTimeframe = null;

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeOTCExtractor);

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOTCExtractor);
} else {
  initializeOTCExtractor();
}

// Backup initialization after a delay
setTimeout(() => {
  if (!otcExtractor && !isExtracting) {
    console.log('[OTC Mode] Backup initialization triggered');
    initializeOTCExtractor();
  }
}, 3000);

// Set up custom event listeners for OTC data
document.addEventListener('OTC_DATA_EXTRACTED', function(event) {
  try {
    if (!event.detail) return;
    
    console.log('[OTC Mode] Received OTC data:', event.detail);
    
    // Process and send data to background
    processOTCData(event.detail);
  } catch (error) {
    console.error('[OTC Mode] Error handling OTC data event:', error);
    
    // Use error handler if available
    if (window.otcErrorHandler) {
      window.otcErrorHandler.handleError(error, 'DATA', {
        context: 'otc_data_event',
        eventDetail: event.detail
      });
    }
  }
});

// Listen for regular candle data events and check if they're OTC
document.addEventListener('CANDLE_DATA_EXTRACTED', function(event) {
  try {
    if (!event.detail) return;
    
    // Check if data is from an OTC asset
    if (event.detail.isOTC) {
      console.log('[OTC Mode] Received OTC data from regular event:', event.detail);
      
      // Process and send data to background
      processOTCData(event.detail);
    }
  } catch (error) {
    console.error('[OTC Mode] Error handling candle data event:', error);
    
    // Use error handler if available
    if (window.otcErrorHandler) {
      window.otcErrorHandler.handleError(error, 'DATA', {
        context: 'candle_data_event',
        eventDetail: event.detail
      });
    }
  }
});

// Message listener for communication with popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_OTC_EXTRACTION' || message.action === 'startOTCExtraction') {
    startOTCExtraction(message.data || {});
    sendResponse({ 
      success: true, 
      status: 'started',
      broker: brokerDetected
    });
  } else if (message.action === 'STOP_OTC_EXTRACTION' || message.action === 'stopOTCExtraction') {
    stopOTCExtraction();
    sendResponse({ 
      success: true, 
      status: 'stopped' 
    });
  } else if (message.action === 'getOTCData' || message.action === 'GET_OTC_DATA') {
    sendResponse({
      success: true,
      data: currentData,
      lastUpdate: lastUpdateTime,
      isExtracting,
      broker: brokerDetected,
      activePair,
      activeTimeframe
    });
  } else if (message.action === 'checkOTCStatus' || message.action === 'GET_OTC_STATUS') {
    sendResponse({
      success: true,
      isExtracting,
      broker: brokerDetected,
      lastUpdate: lastUpdateTime,
      activePair,
      activeTimeframe
    });
  } else if (message.action === 'PLACE_OTC_TRADE' || message.action === 'placeOTCTrade') {
    placeOTCTrade(message.data || message.signal)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message 
      }));
    return true; // Keep channel open for async response
  }
  
  return true; // Keep the message channel open for async responses
});

/**
 * Initialize OTC data extractor
 */
function initializeOTCExtractor() {
  console.log('[OTC Mode] Initializing OTC extractor...');
  
  // Load all OTC components
  loadOTCErrorHandler();
  loadOTCDataValidator();
  loadOTCStatusMonitor();
  loadOTCTestSuite();
  
  // Detect broker platform
  detectBrokerPlatform();
  
  // Set up appropriate extractor based on broker
  setupExtractor();
  
  // Check if we're on a weekend
  if (isWeekendDay()) {
    console.log('[OTC Mode] Weekend detected, automatically activating OTC mode');
    // Auto-activate OTC mode on weekends
    setTimeout(() => {
      startOTCExtraction({ auto: true });
    }, 5000); // Wait 5 seconds to ensure page is fully loaded
  }
}

/**
 * Load OTC error handler
 */
function loadOTCErrorHandler() {
  try {
    if (!window.otcErrorHandler) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('utils/otc-error-handler.js');
      script.onload = function() {
        console.log('[OTC Mode] Error handler loaded');
      };
      script.onerror = function() {
        console.error('[OTC Mode] Failed to load error handler');
      };
      document.head.appendChild(script);
    }
  } catch (error) {
    console.error('[OTC Mode] Error loading error handler:', error);
  }
}

/**
 * Load OTC data validator
 */
function loadOTCDataValidator() {
  try {
    if (!window.otcDataValidator) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('utils/otc-data-validator.js');
      script.onload = function() {
        console.log('[OTC Mode] Data validator loaded');
      };
      script.onerror = function() {
        console.error('[OTC Mode] Failed to load data validator');
      };
      document.head.appendChild(script);
    }
  } catch (error) {
    console.error('[OTC Mode] Error loading data validator:', error);
  }
}

/**
 * Load OTC status monitor
 */
function loadOTCStatusMonitor() {
  try {
    if (!window.otcStatusMonitor) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('utils/otc-status-monitor.js');
      script.onload = function() {
        console.log('[OTC Mode] Status monitor loaded');
      };
      script.onerror = function() {
        console.error('[OTC Mode] Failed to load status monitor');
      };
      document.head.appendChild(script);
    }
  } catch (error) {
    console.error('[OTC Mode] Error loading status monitor:', error);
  }
}

/**
 * Load OTC test suite
 */
function loadOTCTestSuite() {
  try {
    if (!window.otcTestSuite) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('utils/otc-test-suite.js');
      script.onload = function() {
        console.log('[OTC Mode] Test suite loaded');
      };
      script.onerror = function() {
        console.error('[OTC Mode] Failed to load test suite');
      };
      document.head.appendChild(script);
    }
  } catch (error) {
    console.error('[OTC Mode] Error loading test suite:', error);
  }
}

/**
 * Check if today is a weekend day
 * @returns {boolean} - True if weekend
 */
function isWeekendDay() {
  const day = new Date().getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Detect which broker platform we're on
 */
function detectBrokerPlatform() {
  const url = window.location.href.toLowerCase();
  
  if (url.includes('quotex') || url.includes('qxbroker')) {
    brokerDetected = 'Quotex';
    console.log('Detected Quotex broker platform');
  } else if (url.includes('pocketoption') || url.includes('pocket-option')) {
    brokerDetected = 'Pocket Option';
    console.log('Detected Pocket Option broker platform');
  } else if (url.includes('iqoption') || url.includes('iq-option')) {
    brokerDetected = 'IQ Option';
    console.log('Detected IQ Option broker platform');
  } else if (url.includes('binomo')) {
    brokerDetected = 'Binomo';
    console.log('Detected Binomo broker platform');
  } else if (url.includes('olymptrade') || url.includes('olymp-trade')) {
    brokerDetected = 'Olymp Trade';
    console.log('Detected Olymp Trade broker platform');
  } else {
    brokerDetected = 'Unknown';
    console.log('Unknown broker platform');
  }
  
  console.log(`Detected broker platform: ${brokerDetected}`);
}

/**
 * Set up appropriate extractor based on broker
 */
function setupExtractor() {
  try {
    console.log(`[OTC Mode] Setting up extractor for ${brokerDetected}`);
    
    switch (brokerDetected) {
      case 'Pocket Option':
        setupPocketOptionExtractor();
        break;
      case 'Quotex':
        setupQuotexExtractor();
        break;
      default:
        console.warn(`[OTC Mode] No specialized extractor for ${brokerDetected}, using generic extractor`);
        setupGenericExtractor();
    }
  } catch (error) {
    console.error('[OTC Mode] Error setting up extractor:', error);
  }
}

/**
 * Set up Pocket Option extractor
 */
function setupPocketOptionExtractor() {
  try {
    // Inject the extractor script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('utils/pocket-option-extractor.js');
    script.onload = function() {
      console.log('[OTC Mode] Pocket Option extractor loaded');
      
      // Initialize extractor
      const initScript = document.createElement('script');
      initScript.textContent = `
        try {
          window.pocketOptionExtractor = new PocketOptionExtractor({
            debug: true
          });
          console.log('Pocket Option extractor initialized');
        } catch (error) {
          console.error('Error initializing Pocket Option extractor:', error);
        }
      `;
      document.head.appendChild(initScript);
      document.head.removeChild(initScript);
    };
    document.head.appendChild(script);
    
    // Set up broker-specific listeners
    setupPocketOptionSpecificListeners();
  } catch (error) {
    console.error('[OTC Mode] Error setting up Pocket Option extractor:', error);
  }
}

/**
 * Set up Quotex extractor
 */
function setupQuotexExtractor() {
  try {
    // Inject the extractor script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('utils/quotex-extractor.js');
    script.onload = function() {
      console.log('[OTC Mode] Quotex extractor loaded');
      
      // Initialize extractor
      const initScript = document.createElement('script');
      initScript.textContent = `
        try {
          window.quotexExtractor = new QuotexDataExtractor();
          console.log('Quotex extractor initialized');
        } catch (error) {
          console.error('Error initializing Quotex extractor:', error);
        }
      `;
      document.head.appendChild(initScript);
      document.head.removeChild(initScript);
    };
    document.head.appendChild(script);
    
    // Set up broker-specific listeners
    setupQuotexSpecificListeners();
  } catch (error) {
    console.error('[OTC Mode] Error setting up Quotex extractor:', error);
  }
}

/**
 * Set up generic extractor for other brokers
 */
function setupGenericExtractor() {
  try {
    // Inject the generic extractor script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('utils/otc-data-extractor.js');
    script.onload = function() {
      console.log('[OTC Mode] Generic OTC extractor loaded');
      
      // Initialize extractor
      const initScript = document.createElement('script');
      initScript.textContent = `
        try {
          window.otcExtractor = new OTCDataExtractor({
            debug: true,
            broker: "${brokerDetected}"
          });
          console.log('Generic OTC extractor initialized');
        } catch (error) {
          console.error('Error initializing generic OTC extractor:', error);
        }
      `;
      document.head.appendChild(initScript);
      document.head.removeChild(initScript);
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error setting up generic extractor:', error);
  }
}

/**
 * Load Tesseract.js for OCR if needed
 */
function loadTesseractIfNeeded() {
  if (window.Tesseract) {
    console.log('Tesseract.js already loaded');
    return;
  }
  
  // Create script element to load Tesseract.js
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/tesseract.min.js';
  script.async = true;
  
  script.onload = () => {
    console.log('Tesseract.js loaded successfully');
  };
  
  script.onerror = (error) => {
    console.error('Failed to load Tesseract.js:', error);
  };
  
  document.head.appendChild(script);
}

/**
 * Process OTC data from extractors
 * @param {Object} data - OTC data
 */
function processOTCData(data) {
  try {
    // Load data validator if not already loaded
    if (!window.otcDataValidator) {
      loadOTCDataValidator();
    }
    
    // Validate OTC data using comprehensive validator
    let validationResult;
    if (window.otcDataValidator) {
      validationResult = window.otcDataValidator.validateOTCData(data);
      
      if (!validationResult.isValid) {
        console.error('[OTC Mode] OTC data validation failed:', validationResult.errors);
        
        // Use error handler if available
        if (window.otcErrorHandler) {
          window.otcErrorHandler.handleError(
            new Error(`Data validation failed: ${validationResult.errors.join(', ')}`),
            'DATA',
            {
              context: 'process_otc_data_validation',
              data: data,
              validationResult: validationResult
            }
          );
        }
        return;
      }
      
      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('[OTC Mode] OTC data validation warnings:', validationResult.warnings);
      }
      
      // Use cleaned data
      data = validationResult.cleanedData;
      
      console.log(`[OTC Mode] Processing validated OTC data: ${data.asset} ${data.timeframe} (${data.candles.length} candles)`);
      console.log('[OTC Mode] Validation stats:', validationResult.stats);
    } else {
      // Fallback to basic validation if validator not available
      console.warn('[OTC Mode] Data validator not available, using basic validation');
      
      if (!data || !data.asset || !data.timeframe || !data.candles || !Array.isArray(data.candles) || data.candles.length === 0) {
        console.warn('[OTC Mode] Invalid OTC data structure:', data);
        return;
      }
      
      console.log(`[OTC Mode] Processing OTC data (basic validation): ${data.asset} ${data.timeframe} (${data.candles.length} candles)`);
    }
    
    // Update state
    currentData = data;
    lastUpdateTime = Date.now();
    activePair = data.asset;
    activeTimeframe = data.timeframe;
    
    // Send data to background script with retry mechanism
    sendOTCDataToBackground(currentData);
    
  } catch (error) {
    console.error('[OTC Mode] Error processing OTC data:', error);
    
    // Use error handler if available
    if (window.otcErrorHandler) {
      window.otcErrorHandler.handleError(error, 'DATA', {
        context: 'process_otc_data',
        data: data
      });
    }
  }
}

/**
 * Send OTC data to background script with retry mechanism
 * @param {Object} data - OTC data
 * @param {number} retryCount - Current retry count
 */
function sendOTCDataToBackground(data, retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  try {
    chrome.runtime.sendMessage({
      type: 'OTC_DATA',
      data: {
        asset: data.asset,
        timeframe: data.timeframe,
        candles: data.candles,
        timestamp: Date.now(),
        broker: brokerDetected,
        isOTC: true
      }
    }, function(response) {
      // Check for chrome.runtime.lastError
      if (chrome.runtime.lastError) {
        console.error('[OTC Mode] Chrome runtime error:', chrome.runtime.lastError.message);
        
        // Retry if possible
        if (retryCount < maxRetries) {
          console.log(`[OTC Mode] Retrying send to background (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            sendOTCDataToBackground(data, retryCount + 1);
          }, retryDelay * (retryCount + 1));
        } else {
          console.error('[OTC Mode] Failed to send OTC data after all retries');
          
          // Use error handler if available
          if (window.otcErrorHandler) {
            window.otcErrorHandler.handleError(
              new Error(chrome.runtime.lastError.message), 
              'NETWORK', 
              {
                context: 'send_otc_data_to_background',
                retryCount: retryCount,
                data: data
              }
            );
          }
        }
        return;
      }
      
      // Check response
      if (response && response.success) {
        console.log('[OTC Mode] OTC data sent to background script successfully');
      } else {
        console.warn('[OTC Mode] Background script returned error:', response);
        
        // Retry if possible
        if (retryCount < maxRetries) {
          console.log(`[OTC Mode] Retrying send to background (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            sendOTCDataToBackground(data, retryCount + 1);
          }, retryDelay * (retryCount + 1));
        } else {
          console.error('[OTC Mode] Failed to send OTC data after all retries');
          
          // Use error handler if available
          if (window.otcErrorHandler) {
            window.otcErrorHandler.handleError(
              new Error(response?.error || 'Background script error'), 
              'NETWORK', 
              {
                context: 'send_otc_data_to_background',
                retryCount: retryCount,
                response: response,
                data: data
              }
            );
          }
        }
      }
    });
  } catch (error) {
    console.error('[OTC Mode] Error sending OTC data to background:', error);
    
    // Retry if possible
    if (retryCount < maxRetries) {
      console.log(`[OTC Mode] Retrying send to background (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => {
        sendOTCDataToBackground(data, retryCount + 1);
      }, retryDelay * (retryCount + 1));
    } else {
      // Use error handler if available
      if (window.otcErrorHandler) {
        window.otcErrorHandler.handleError(error, 'NETWORK', {
          context: 'send_otc_data_to_background',
          retryCount: retryCount,
          data: data
        });
      }
    }
  }
}

/**
 * Start OTC data extraction
 * @param {Object} data - Activation data
 */
function startOTCExtraction(data = {}) {
  try {
    console.log('[OTC Mode] Starting OTC extraction with data:', data);
    
    // Check if already active
    if (isExtracting) {
      console.log('[OTC Mode] OTC extraction already active');
      return;
    }
    
    // Set active state
    isExtracting = true;
    
    // Start extraction based on broker
    switch (brokerDetected) {
      case 'Pocket Option':
        startPocketOptionExtraction();
        break;
      case 'Quotex':
        startQuotexExtraction();
        break;
      default:
        startGenericExtraction();
    }
    
    console.log('[OTC Mode] OTC extraction started');
  } catch (error) {
    console.error('[OTC Mode] Error starting OTC extraction:', error);
    isExtracting = false;
  }
}

/**
 * Start Pocket Option extraction
 */
function startPocketOptionExtraction() {
  try {
    // Inject script to start extraction
    const script = document.createElement('script');
    script.textContent = `
      try {
        if (window.pocketOptionExtractor) {
          window.pocketOptionExtractor.startRealtimeExtraction();
          console.log('Pocket Option extraction started');
        } else {
          console.error('Pocket Option extractor not found');
        }
      } catch (error) {
        console.error('Error starting Pocket Option extraction:', error);
      }
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error starting Pocket Option extraction:', error);
  }
}

/**
 * Start Quotex extraction
 */
function startQuotexExtraction() {
  try {
    // Inject script to start extraction
    const script = document.createElement('script');
    script.textContent = `
      try {
        if (window.quotexExtractor) {
          window.quotexExtractor.startRealtimeExtraction();
          console.log('Quotex extraction started');
        } else {
          console.error('Quotex extractor not found');
        }
      } catch (error) {
        console.error('Error starting Quotex extraction:', error);
      }
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error starting Quotex extraction:', error);
  }
}

/**
 * Start generic extraction
 */
function startGenericExtraction() {
  try {
    // Inject script to start extraction
    const script = document.createElement('script');
    script.textContent = `
      try {
        if (window.otcExtractor) {
          window.otcExtractor.startExtraction();
          console.log('Generic OTC extraction started');
        } else {
          console.error('Generic OTC extractor not found');
        }
      } catch (error) {
        console.error('Error starting generic OTC extraction:', error);
      }
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error starting generic extraction:', error);
  }
}

/**
 * Stop OTC data extraction
 */
function stopOTCExtraction() {
  try {
    console.log('[OTC Mode] Stopping OTC extraction');
    
    // Check if already inactive
    if (!isExtracting) {
      console.log('[OTC Mode] OTC extraction already inactive');
      return;
    }
    
    // Set inactive state
    isExtracting = false;
    
    // Stop extraction based on broker
    switch (brokerDetected) {
      case 'Pocket Option':
        stopPocketOptionExtraction();
        break;
      case 'Quotex':
        stopQuotexExtraction();
        break;
      default:
        stopGenericExtraction();
    }
    
    console.log('[OTC Mode] OTC extraction stopped');
  } catch (error) {
    console.error('[OTC Mode] Error stopping OTC extraction:', error);
  }
}

/**
 * Stop Pocket Option extraction
 */
function stopPocketOptionExtraction() {
  try {
    // Inject script to stop extraction
    const script = document.createElement('script');
    script.textContent = `
      try {
        if (window.pocketOptionExtractor) {
          window.pocketOptionExtractor.stopRealtimeExtraction();
          console.log('Pocket Option extraction stopped');
        } else {
          console.error('Pocket Option extractor not found');
        }
      } catch (error) {
        console.error('Error stopping Pocket Option extraction:', error);
      }
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error stopping Pocket Option extraction:', error);
  }
}

/**
 * Stop Quotex extraction
 */
function stopQuotexExtraction() {
  try {
    // Inject script to stop extraction
    const script = document.createElement('script');
    script.textContent = `
      try {
        if (window.quotexExtractor) {
          window.quotexExtractor.stopRealtimeExtraction();
          console.log('Quotex extraction stopped');
        } else {
          console.error('Quotex extractor not found');
        }
      } catch (error) {
        console.error('Error stopping Quotex extraction:', error);
      }
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error stopping Quotex extraction:', error);
  }
}

/**
 * Stop generic extraction
 */
function stopGenericExtraction() {
  try {
    // Inject script to stop extraction
    const script = document.createElement('script');
    script.textContent = `
      try {
        if (window.otcExtractor) {
          window.otcExtractor.stopExtraction();
          console.log('Generic OTC extraction stopped');
        } else {
          console.error('Generic OTC extractor not found');
        }
      } catch (error) {
        console.error('Error stopping generic OTC extraction:', error);
      }
    `;
    document.head.appendChild(script);
    document.head.removeChild(script);
  } catch (error) {
    console.error('[OTC Mode] Error stopping generic extraction:', error);
  }
}

/**
 * Place OTC trade based on signal
 * @param {Object} data - Trade data
 * @returns {Promise<Object>} - Trade result
 */
async function placeOTCTrade(data) {
  try {
    if (!data || !data.pair || !data.direction) {
      return {
        success: false,
        error: 'Invalid trade data'
      };
    }
    
    console.log('[OTC Mode] Placing OTC trade:', data);
    
    // Place trade based on broker
    switch (brokerDetected) {
      case 'Pocket Option':
        return await placePocketOptionTrade(data);
      case 'Quotex':
        return await placeQuotexTrade(data);
      default:
        return {
          success: false,
          error: `Trade execution not implemented for ${brokerDetected}`
        };
    }
  } catch (error) {
    console.error('[OTC Mode] Error placing OTC trade:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Place trade on Pocket Option
 * @param {Object} data - Trade data
 * @returns {Promise<Object>} - Trade result
 */
async function placePocketOptionTrade(data) {
  return new Promise((resolve, reject) => {
    try {
      // Inject script to place trade
      const script = document.createElement('script');
      script.textContent = `
        try {
          // Find trade buttons
          const upButton = document.querySelector('.up-button, .call-button, [data-direction="up"], [data-direction="call"]');
          const downButton = document.querySelector('.down-button, .put-button, [data-direction="down"], [data-direction="put"]');
          
          // Set amount if possible
          const amountInput = document.querySelector('.amount-input, [data-test="amount-input"], [name="amount"]');
          if (amountInput && ${data.amount || 10}) {
            amountInput.value = ${data.amount || 10};
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            amountInput.dispatchEvent(event);
          }
          
          // Set expiry if possible
          const expirySelect = document.querySelector('.expiry-select, [data-test="expiry-select"], [name="expiry"]');
          if (expirySelect && ${data.expiry || 60}) {
            expirySelect.value = ${data.expiry || 60};
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            expirySelect.dispatchEvent(event);
          }
          
          // Click appropriate button
          if ('${data.direction}'.toUpperCase() === 'UP' || '${data.direction}'.toUpperCase() === 'CALL') {
            if (upButton) {
              upButton.click();
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: true, direction: 'UP' }, '*');
            } else {
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: 'Up button not found' }, '*');
            }
          } else if ('${data.direction}'.toUpperCase() === 'DOWN' || '${data.direction}'.toUpperCase() === 'PUT') {
            if (downButton) {
              downButton.click();
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: true, direction: 'DOWN' }, '*');
            } else {
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: 'Down button not found' }, '*');
            }
          } else {
            window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: 'Invalid direction' }, '*');
          }
        } catch (error) {
          window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: error.message }, '*');
        }
      `;
      document.head.appendChild(script);
      document.head.removeChild(script);
      
      // Listen for trade result
      const messageListener = function(event) {
        if (event.data && event.data.type === 'OTC_TRADE_PLACED') {
          window.removeEventListener('message', messageListener);
          
          if (event.data.success) {
            resolve({
              success: true,
              trade: {
                pair: data.pair,
                direction: event.data.direction,
                amount: data.amount || 10,
                timestamp: Date.now(),
                broker: brokerDetected,
                isOTC: true
              }
            });
          } else {
            reject(new Error(event.data.error || 'Failed to place trade'));
          }
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Set timeout for trade execution
      setTimeout(() => {
        window.removeEventListener('message', messageListener);
        reject(new Error('Trade execution timed out'));
      }, 5000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Place trade on Quotex
 * @param {Object} data - Trade data
 * @returns {Promise<Object>} - Trade result
 */
async function placeQuotexTrade(data) {
  return new Promise((resolve, reject) => {
    try {
      // Inject script to place trade
      const script = document.createElement('script');
      script.textContent = `
        try {
          // Find trade buttons
          const upButton = document.querySelector('.call-btn, .up-btn, [data-type="call"], [data-type="up"]');
          const downButton = document.querySelector('.put-btn, .down-btn, [data-type="put"], [data-type="down"]');
          
          // Set amount if possible
          const amountInput = document.querySelector('.amount-input, [data-test="amount-input"], [name="amount"]');
          if (amountInput && ${data.amount || 10}) {
            amountInput.value = ${data.amount || 10};
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            amountInput.dispatchEvent(event);
          }
          
          // Set expiry if possible
          const expirySelect = document.querySelector('.expiry-select, [data-test="expiry-select"], [name="expiry"]');
          if (expirySelect && ${data.expiry || 60}) {
            expirySelect.value = ${data.expiry || 60};
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            expirySelect.dispatchEvent(event);
          }
          
          // Click appropriate button
          if ('${data.direction}'.toUpperCase() === 'UP' || '${data.direction}'.toUpperCase() === 'CALL') {
            if (upButton) {
              upButton.click();
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: true, direction: 'UP' }, '*');
            } else {
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: 'Up button not found' }, '*');
            }
          } else if ('${data.direction}'.toUpperCase() === 'DOWN' || '${data.direction}'.toUpperCase() === 'PUT') {
            if (downButton) {
              downButton.click();
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: true, direction: 'DOWN' }, '*');
            } else {
              window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: 'Down button not found' }, '*');
            }
          } else {
            window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: 'Invalid direction' }, '*');
          }
        } catch (error) {
          window.postMessage({ type: 'OTC_TRADE_PLACED', success: false, error: error.message }, '*');
        }
      `;
      document.head.appendChild(script);
      document.head.removeChild(script);
      
      // Listen for trade result
      const messageListener = function(event) {
        if (event.data && event.data.type === 'OTC_TRADE_PLACED') {
          window.removeEventListener('message', messageListener);
          
          if (event.data.success) {
            resolve({
              success: true,
              trade: {
                pair: data.pair,
                direction: event.data.direction,
                amount: data.amount || 10,
                timestamp: Date.now(),
                broker: brokerDetected,
                isOTC: true
              }
            });
          } else {
            reject(new Error(event.data.error || 'Failed to place trade'));
          }
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Set timeout for trade execution
      setTimeout(() => {
        window.removeEventListener('message', messageListener);
        reject(new Error('Trade execution timed out'));
      }, 5000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set up Pocket Option specific event listeners
 */
function setupPocketOptionSpecificListeners() {
  // Listen for asset changes
  document.addEventListener('click', (event) => {
    // Check if clicked on asset selector
    const assetSelectors = [
      '.asset-select',
      '.asset-dropdown',
      '.asset-selector',
      '.instrument-selector'
    ];
    
    for (const selector of assetSelectors) {
      if (event.target.closest(selector)) {
        console.log('Asset selection clicked, will refresh data extraction');
        
        // Wait for asset change to complete
        setTimeout(() => {
          if (otcExtractor) {
            otcExtractor.extractCurrentData();
          }
        }, 1000);
        
        break;
      }
    }
  });
  
  // Listen for timeframe changes
  document.addEventListener('click', (event) => {
    // Check if clicked on timeframe selector
    const timeframeSelectors = [
      '.chart-timeframe-item',
      '.timeframe-selector',
      '.period-selector'
    ];
    
    for (const selector of timeframeSelectors) {
      if (event.target.closest(selector)) {
        console.log('Timeframe selection clicked, will refresh data extraction');
        
        // Wait for timeframe change to complete
        setTimeout(() => {
          if (otcExtractor) {
            otcExtractor.extractCurrentData();
          }
        }, 1000);
        
        break;
      }
    }
  });
}

/**
 * Set up Quotex specific event listeners
 */
function setupQuotexSpecificListeners() {
  // Listen for asset changes
  document.addEventListener('click', (event) => {
    // Check if clicked on asset selector
    const assetSelectors = [
      '.asset-select',
      '.symbol-selector',
      '.asset-dropdown'
    ];
    
    for (const selector of assetSelectors) {
      if (event.target.closest(selector)) {
        console.log('Asset selection clicked, will refresh data extraction');
        
        // Wait for asset change to complete
        setTimeout(() => {
          if (otcExtractor) {
            otcExtractor.extractCurrentData();
          }
        }, 1000);
        
        break;
      }
    }
  });
  
  // Listen for timeframe changes
  document.addEventListener('click', (event) => {
    // Check if clicked on timeframe selector
    const timeframeSelectors = [
      '.chart-period',
      '.timeframe-selector',
      '.period-selector'
    ];
    
    for (const selector of timeframeSelectors) {
      if (event.target.closest(selector)) {
        console.log('Timeframe selection clicked, will refresh data extraction');
        
        // Wait for timeframe change to complete
        setTimeout(() => {
          if (otcExtractor) {
            otcExtractor.extractCurrentData();
          }
        }, 1000);
        
        break;
      }
    }
  });
}

/**
 * Start OTC data extraction
 */
function startOTCExtraction() {
  if (isExtracting || !otcExtractor) return;
  
  console.log('Starting OTC data extraction...');
  isExtracting = true;
  
  // Set up event listeners for extraction method selection
  document.addEventListener('otcExtractionMethodSelected', (event) => {
    const { method, broker } = event.detail;
    console.log(`OTC extraction method selected: ${method} for ${broker}`);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'otcExtractionMethodSelected',
      method,
      broker
    });
  });
  
  // Start the extractor
  otcExtractor.startRealtimeMonitoring();
  
  // Notify background script
  chrome.runtime.sendMessage({
    action: 'otcExtractionStarted',
    broker: brokerDetected
  });
  
  // Set up periodic status check
  setInterval(() => {
    if (otcExtractor && isExtracting) {
      const status = {
        isExtracting: true,
        broker: brokerDetected,
        method: otcExtractor.currentMethod,
        lastUpdate: lastUpdateTime
      };
      
      // Send status update to background script
      chrome.runtime.sendMessage({
        action: 'otcExtractionStatus',
        status
      });
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Stop OTC data extraction
 */
function stopOTCExtraction() {
  if (!isExtracting || !otcExtractor) return;
  
  console.log('Stopping OTC data extraction...');
  isExtracting = false;
  
  // Stop the extractor
  otcExtractor.stopRealtimeMonitoring();
  
  // Notify background script
  chrome.runtime.sendMessage({
    action: 'otcExtractionStopped'
  });
}

/**
 * Handle OTC data update event
 */
function handleOTCDataUpdate(event) {
  const { timeframe, candles, timestamp, asset } = event.detail;
  
  // Check if this is an OTC asset
  const isOTCAsset = checkIfOTCAsset(asset);
  
  // Update current data
  currentData = {
    timeframe,
    candles,
    timestamp,
    broker: brokerDetected,
    asset: asset || 'Unknown',
    isOTC: isOTCAsset
  };
  
  lastUpdateTime = new Date().toISOString();
  
  // Send data to background script
  chrome.runtime.sendMessage({
    action: 'otcDataUpdate',
    data: currentData
  });
  
  console.log(`OTC data updated: ${candles.length} candles for ${asset || 'Unknown'} (${timeframe})`);
  
  if (isOTCAsset) {
    console.log(`Detected OTC asset: ${asset}`);
  }
}

/**
 * Check if the asset is an OTC asset
 */
function checkIfOTCAsset(asset) {
  if (!asset) return false;
  
  const assetName = asset.toString().toLowerCase();
  
  // Common OTC asset indicators
  const otcIndicators = [
    'otc',
    'weekend',
    'saturday',
    'sunday',
    '-otc',
    'otc-',
    'synthetic',
    'virtual',
    'weekend trading',
    'demo'
  ];
  
  // Check if any OTC indicator is in the asset name
  for (const indicator of otcIndicators) {
    if (assetName.includes(indicator)) {
      console.log(`Detected OTC asset by indicator "${indicator}": ${asset}`);
      return true;
    }
  }
  
  // Broker-specific OTC asset detection
  if (brokerDetected === 'Pocket Option') {
    // Pocket Option typically adds "OTC" suffix to OTC assets
    if (assetName.endsWith('otc') || 
        assetName.includes('(otc)') || 
        assetName.includes('-otc') ||
        assetName.includes('synthetic') ||
        assetName.includes('random')) {
      console.log(`Detected Pocket Option OTC asset: ${asset}`);
      return true;
    }
    
    // Pocket Option specific OTC pairs
    const pocketOptionOTCPairs = [
      'crypto idx', 'crypto idx 10', 'jump 10', 'jump 25', 'jump 50', 'jump 75', 'jump 100',
      'boom 500', 'boom 1000', 'crash 500', 'crash 1000', 'volatility 10', 'volatility 25',
      'volatility 50', 'volatility 75', 'volatility 100'
    ];
    
    for (const pair of pocketOptionOTCPairs) {
      if (assetName.includes(pair)) {
        console.log(`Detected Pocket Option specific OTC pair: ${asset}`);
        return true;
      }
    }
  } else if (brokerDetected === 'Quotex') {
    // Quotex typically uses "OTC" in the asset name
    if (assetName.includes('otc') || 
        assetName.includes('(weekend)') || 
        assetName.includes('(w)') ||
        assetName.includes('synthetic') ||
        assetName.includes('random')) {
      console.log(`Detected Quotex OTC asset: ${asset}`);
      return true;
    }
    
    // Quotex specific OTC pairs
    const quotexOTCPairs = [
      'crypto idx', 'crypto index', 'jump index', 'boom index', 'crash index',
      'volatility', 'random index', 'random', 'synthetic'
    ];
    
    for (const pair of quotexOTCPairs) {
      if (assetName.includes(pair)) {
        console.log(`Detected Quotex specific OTC pair: ${asset}`);
        return true;
      }
    }
  }
  
  // Check if we're on a weekend (Saturday or Sunday)
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    // On weekends, most forex pairs are OTC
    const commonWeekendOTCPairs = [
      'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad', 'eur/jpy',
      'gbp/jpy', 'eur/gbp', 'aud/jpy', 'usd/chf', 'eur/aud', 'eur/cad'
    ];
    
    for (const pair of commonWeekendOTCPairs) {
      if (assetName.includes(pair)) {
        console.log(`Detected weekend OTC forex pair: ${asset}`);
        return true;
      }
    }
    
    // On weekends, most indices are OTC
    const commonWeekendIndices = [
      'dax', 'cac', 'ftse', 'dow', 'nasdaq', 's&p', 'sp500', 'nikkei', 'hang seng'
    ];
    
    for (const index of commonWeekendIndices) {
      if (assetName.includes(index)) {
        console.log(`Detected weekend OTC index: ${asset}`);
        return true;
      }
    }
  }
  
  return false;
}

// Clean up when the page is unloaded
window.addEventListener('beforeunload', () => {
  if (otcExtractor) {
    otcExtractor.destroy();
  }
  
  document.removeEventListener('otcDataUpdate', handleOTCDataUpdate);
});