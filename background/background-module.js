/**
 * AI Candle Sniper - Background Module
 * 
 * This module integrates the OTC data handler with the main extension
 * and provides a unified API for accessing OTC data.
 */

// Import OTC data handler
import './otc-data-handler.js';

// Global state
let otcDataHandlerInitialized = false;

// Initialize
function initialize() {
  console.log('[Background Module] Initializing...');
  
  // Set up message listeners
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Initialize OTC data handler
  initializeOTCDataHandler();
  
  console.log('[Background Module] Initialized');
}

/**
 * Initialize OTC data handler
 */
async function initializeOTCDataHandler() {
  try {
    // Check if OTC data handler is already initialized
    if (otcDataHandlerInitialized) {
      console.log('[Background Module] OTC data handler already initialized');
      return;
    }
    
    console.log('[Background Module] Initializing OTC data handler...');
    
    // The OTC data handler is imported at the top of the file
    // and will initialize itself
    
    otcDataHandlerInitialized = true;
    
    console.log('[Background Module] OTC data handler initialized');
  } catch (error) {
    console.error('[Background Module] Error initializing OTC data handler:', error);
  }
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(message, sender, sendResponse) {
  // Forward OTC-related messages to the OTC data handler
  if (message.action && message.action.startsWith('otc')) {
    // These messages will be handled by the OTC data handler
    return true;
  }
  
  // Handle other messages
  switch (message.action) {
    case 'getHistoricalOTCData':
      handleGetHistoricalOTCData(message, sendResponse);
      return true;
      
    case 'getAvailableOTCPairs':
      handleGetAvailableOTCPairs(sendResponse);
      return true;
      
    case 'getOTCExtractionStatus':
      handleGetOTCExtractionStatus(sendResponse);
      return true;
  }
  
  return false;
}

/**
 * Handle request for historical OTC data
 */
async function handleGetHistoricalOTCData(message, sendResponse) {
  try {
    // Forward request to OTC data handler
    const response = await chrome.runtime.sendMessage({
      action: 'getOTCData',
      pair: message.pair,
      timeframe: message.timeframe
    });
    
    sendResponse(response);
  } catch (error) {
    console.error('[Background Module] Error getting historical OTC data:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle request for available OTC pairs
 */
async function handleGetAvailableOTCPairs(sendResponse) {
  try {
    // Forward request to OTC data handler
    const response = await chrome.runtime.sendMessage({
      action: 'getAllOTCPairs'
    });
    
    sendResponse(response);
  } catch (error) {
    console.error('[Background Module] Error getting available OTC pairs:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle request for OTC extraction status
 */
async function handleGetOTCExtractionStatus(sendResponse) {
  try {
    // Forward request to OTC data handler
    const response = await chrome.runtime.sendMessage({
      action: 'getOTCStatus'
    });
    
    sendResponse(response);
  } catch (error) {
    console.error('[Background Module] Error getting OTC extraction status:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Initialize when loaded
initialize();

export { 
  handleGetHistoricalOTCData,
  handleGetAvailableOTCPairs,
  handleGetOTCExtractionStatus
};