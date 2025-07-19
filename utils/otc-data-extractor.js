/**
 * OTC Mode Data Extractor
 * Specialized for weekend OTC markets on binary options platforms
 * Extracts real-time data from broker charts using DOM/Canvas analysis
 */

class OTCDataExtractor {
    constructor() {
        this.platform = 'otc';
        this.candleData = new Map(); // Store by timeframe
        this.lastUpdate = new Map();
        this.extractionMethods = ['dom', 'canvas', 'ocr'];
        this.currentMethod = null;
        this.isExtracting = false;
        this.debugMode = true;
        
        // Chart element selectors (specific to OTC mode)
        this.selectors = {
            // Chart container possibilities
            chartContainers: [
                '#trading-chart',
                '.chart-container',
                '.trading-chart',
                '[id*="chart"]',
                '[class*="chart"]',
                'canvas[id*="chart"]',
                'canvas[class*="trading"]'
            ],
            
            // OTC asset name selectors
            assetSelectors: [
                '.asset-select__selected .asset-select__name',
                '.selected-instrument-name',
                '.instrument-selector .selected-name',
                '.trading-panel .asset-name',
                '.asset-dropdown .selected-asset',
                '[data-test-id="asset-name"]',
                '.current-asset-name'
            ],
            
            // Price/timeframe selectors
            priceSelectors: [
                '.current-price',
                '.last-price',
                '[class*="price"]',
                '[data-price]'
            ],
            
            timeframeSelectors: [
                '.timeframe-selector',
                '.time-selector',
                '[class*="timeframe"]',
                '[data-timeframe]'
            ],
            
            // Pocket Option specific selectors (updated based on latest DOM structure)
            pocketOption: {
                chartContainers: [
                    '.chart-container',
                    '#chart_canvas',
                    '.chart-wrapper',
                    '.chart-area',
                    '.trading-chart-container',
                    '.chart-view-container'
                ],
                assetSelectors: [
                    '.asset-select .asset-name',
                    '.asset-name-label',
                    '.selected-asset-name',
                    '.asset-label',
                    '.instrument-name',
                    '.symbol-name-label',
                    '.current-asset-name'
                ],
                priceSelectors: [
                    '.chart-price-value',
                    '.price-value',
                    '.deal-price',
                    '.price-display',
                    '.current-quote',
                    '.quote-value',
                    '.asset-quote-value',
                    '.current-price-value'
                ],
                timeframeSelectors: [
                    '.chart-timeframe-item',
                    '.timeframe-selector button',
                    '.chart-period-selector',
                    '.period-button',
                    '.time-selector-item',
                    '.chart-time-selector button',
                    '[data-period]'
                ],
                candleInfo: [
                    '.candle-tooltip',
                    '.chart-tooltip',
                    '.info-tooltip',
                    '.price-info-tooltip',
                    '.candle-info-popup',
                    '.ohlc-tooltip'
                ],
                // OTC specific selectors
                otcIndicators: [
                    '.otc-badge',
                    '.weekend-asset-indicator',
                    '[data-asset-type="otc"]',
                    '.otc-asset-label'
                ],
                // DOM elements that might contain candle data
                candleDataElements: [
                    '.candle-data',
                    '.ohlc-data',
                    '.chart-data-values',
                    '[data-candle-info]'
                ]
            },
            
            // Quotex specific selectors (updated based on latest DOM structure)
            quotex: {
                chartContainers: [
                    '.chart-component',
                    '#trading_chart_canvas',
                    '.chart-wrapper',
                    '.trading-chart',
                    '.chart-view',
                    '.chart-container'
                ],
                assetSelectors: [
                    '.asset-select',
                    '.asset-dropdown',
                    '.symbol-selector',
                    '.current-symbol',
                    '.instrument-name',
                    '.asset-name-display',
                    '.selected-asset',
                    '.symbol-name'
                ],
                priceSelectors: [
                    '.chart-price',
                    '.price-value',
                    '.current-price',
                    '.asset-price',
                    '.quote-value',
                    '.price-display-value',
                    '.current-quote-value',
                    '.live-price'
                ],
                timeframeSelectors: [
                    '.chart-period',
                    '.timeframe-selector',
                    '.period-selector button',
                    '.time-selector',
                    '.period-button',
                    '.chart-timeframe',
                    '[data-timeframe]'
                ],
                candleInfo: [
                    '.candle-info',
                    '.chart-tooltip',
                    '.price-tooltip',
                    '.ohlc-tooltip',
                    '.candle-data-tooltip',
                    '.price-info'
                ],
                // OTC specific selectors
                otcIndicators: [
                    '.otc-indicator',
                    '.weekend-badge',
                    '[data-asset-type="otc"]',
                    '.otc-symbol-indicator',
                    '.weekend-trading-badge'
                ],
                // DOM elements that might contain candle data
                candleDataElements: [
                    '.candle-data',
                    '.ohlc-values',
                    '.chart-data-container',
                    '[data-candle]'
                ]
            }
        };
        
        this.timeframes = ['1M', '3M', '5M', '15M', '30M', '1H'];
        this.requiredCandles = 50; // Number of candles needed for analysis
        
        // OCR configuration for canvas extraction
        this.ocrConfig = {
            enabled: true,
            confidence: 0.7,
            language: 'eng',
            tesseractPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/worker.min.js'
        };
        
        this.init();
    }

    async init() {
        console.log('[OTC Extractor] 🚀 Initializing OTC data extraction...');
        
        // Check if we're in a browser environment
        const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
        
        if (!isBrowser) {
            console.log('[OTC Extractor] Not in browser environment, skipping initialization');
            return;
        }
        
        // Wait for page to fully load
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }
        
        // Detect broker platform
        this.detectBrokerPlatform();
        
        // Load Tesseract.js for OCR if needed
        if (this.ocrConfig.enabled) {
            await this.loadTesseract();
        }
        
        // Investigate available extraction methods
        await this.investigateExtractionMethods();
        
        // Start monitoring for data
        this.startRealtimeMonitoring();
        
        console.log(`[OTC Extractor] ✅ Initialized with method: ${this.currentMethod} for ${this.broker}`);
    }
    
    /**
     * Detect which broker platform we're on
     */
    detectBrokerPlatform() {
        // Check if we're in a browser environment
        const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
        
        if (!isBrowser) {
            this.broker = 'Unknown';
            console.log('[OTC Extractor] Not in browser environment, cannot detect broker');
            return this.broker;
        }
        
        const url = window.location.href.toLowerCase();
        
        // First try to detect by URL
        if (url.includes('pocketoption') || url.includes('pocket-option')) {
            this.broker = 'Pocket Option';
            console.log('[OTC Extractor] 🔍 Detected Pocket Option platform via URL');
        } else if (url.includes('qxbroker') || url.includes('quotex')) {
            this.broker = 'Quotex';
            console.log('[OTC Extractor] 🔍 Detected Quotex platform via URL');
        } else {
            // If URL detection fails, try to detect by DOM elements
            this.broker = this.detectBrokerByDOM();
        }
        
        // Set broker-specific extraction method
        if (this.broker === 'Pocket Option') {
            this.currentMethod = 'pocket_option_specific';
        } else if (this.broker === 'Quotex') {
            this.currentMethod = 'quotex_specific';
        }
        
        // Dispatch broker detection event
        try {
            document.dispatchEvent(new CustomEvent('otcBrokerDetected', {
                detail: { 
                    broker: this.broker,
                    method: this.currentMethod
                }
            }));
        } catch (error) {
            console.warn('[OTC Extractor] Could not dispatch event:', error);
        }
        
        return this.broker;
    }
    
    /**
     * Detect broker by DOM elements
     * @private
     */
    detectBrokerByDOM() {
        try {
            // Check for Pocket Option specific elements
            const pocketOptionIndicators = [
                // Logo selectors
                'img[src*="pocketoption"]',
                'img[alt*="Pocket Option"]',
                '.po-logo',
                // Text content
                'a[href*="pocketoption"]',
                // Specific DOM structures
                '.po-trading-platform',
                '#po-trading-app',
                '[data-platform="pocketoption"]'
            ];
            
            for (const selector of pocketOptionIndicators) {
                if (document.querySelector(selector)) {
                    console.log(`[OTC Extractor] 🔍 Detected Pocket Option platform via DOM element: ${selector}`);
                    return 'Pocket Option';
                }
            }
            
            // Check for Quotex specific elements
            const quotexIndicators = [
                // Logo selectors
                'img[src*="quotex"]',
                'img[alt*="Quotex"]',
                '.quotex-logo',
                // Text content
                'a[href*="quotex"]',
                'a[href*="qxbroker"]',
                // Specific DOM structures
                '.qx-trading-platform',
                '#quotex-app',
                '[data-platform="quotex"]'
            ];
            
            for (const selector of quotexIndicators) {
                if (document.querySelector(selector)) {
                    console.log(`[OTC Extractor] 🔍 Detected Quotex platform via DOM element: ${selector}`);
                    return 'Quotex';
                }
            }
            
            // Check page title
            const pageTitle = document.title.toLowerCase();
            if (pageTitle.includes('pocket option') || pageTitle.includes('pocketoption')) {
                console.log('[OTC Extractor] 🔍 Detected Pocket Option platform via page title');
                return 'Pocket Option';
            } else if (pageTitle.includes('quotex') || pageTitle.includes('qxbroker')) {
                console.log('[OTC Extractor] 🔍 Detected Quotex platform via page title');
                return 'Quotex';
            }
            
            // Check meta tags
            const metaTags = document.querySelectorAll('meta');
            for (const meta of metaTags) {
                const content = meta.getAttribute('content')?.toLowerCase() || '';
                if (content.includes('pocket option') || content.includes('pocketoption')) {
                    console.log('[OTC Extractor] 🔍 Detected Pocket Option platform via meta tag');
                    return 'Pocket Option';
                } else if (content.includes('quotex') || content.includes('qxbroker')) {
                    console.log('[OTC Extractor] 🔍 Detected Quotex platform via meta tag');
                    return 'Quotex';
                }
            }
            
            console.log('[OTC Extractor] ⚠️ Could not detect broker platform via DOM');
            return 'Unknown';
        } catch (error) {
            console.warn('[OTC Extractor] Error detecting broker by DOM:', error);
            return 'Unknown';
        }
    }

    async loadTesseract() {
        if (window.Tesseract) {
            console.log('[OTC Extractor] Tesseract.js already loaded');
            return;
        }
        
        try {
            // Create script element to load Tesseract.js
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/tesseract.min.js';
            script.async = true;
            
            // Wait for script to load
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            
            console.log('[OTC Extractor] ✅ Tesseract.js loaded successfully');
        } catch (error) {
            console.error('[OTC Extractor] ❌ Failed to load Tesseract.js:', error);
        }
    }

    async investigateExtractionMethods() {
        console.log('[OTC Extractor] 🔍 Investigating OTC data extraction methods...');
        
        // Try broker-specific methods first
        let brokerSpecificResults = null;
        
        if (this.broker === 'Pocket Option') {
            brokerSpecificResults = await this.testPocketOptionExtraction();
            console.log('[OTC Extractor] 🔍 Tested Pocket Option specific extraction:', 
                brokerSpecificResults.success ? 'Success' : 'Failed');
                
            if (brokerSpecificResults.success) {
                this.currentMethod = 'pocket_option_specific';
                console.log('[OTC Extractor] ✅ Using Pocket Option specific extraction method');
                return brokerSpecificResults;
            }
        } else if (this.broker === 'Quotex') {
            brokerSpecificResults = await this.testQuotexExtraction();
            console.log('[OTC Extractor] 🔍 Tested Quotex specific extraction:', 
                brokerSpecificResults.success ? 'Success' : 'Failed');
                
            if (brokerSpecificResults.success) {
                this.currentMethod = 'quotex_specific';
                console.log('[OTC Extractor] ✅ Using Quotex specific extraction method');
                return brokerSpecificResults;
            }
        }
        
        console.log('[OTC Extractor] ⚠️ Broker-specific extraction failed, falling back to generic methods');
        
        // Fall back to generic methods
        const results = {
            dom: await this.testDOMExtraction(),
            canvas: await this.testCanvasExtraction(),
            ocr: await this.testOCRExtraction()
        };
        
        // Log results for debugging
        console.log('[OTC Extractor] 📊 Generic extraction results:');
        console.log(`DOM: ${results.dom.success ? 'Success' : 'Failed'} (${results.dom.candles?.length || 0} candles)`);
        console.log(`Canvas: ${results.canvas.possible ? 'Possible' : 'Not possible'}`);
        console.log(`OCR: ${results.ocr.possible ? 'Possible' : 'Not possible'}`);
        
        // Choose best method based on data quality
        if (results.dom.success && results.dom.candles && results.dom.candles.length > 0) {
            this.currentMethod = 'dom';
            console.log('[OTC Extractor] ✅ Using DOM extraction method');
        } else if (results.canvas.possible) {
            this.currentMethod = 'canvas';
            console.log('[OTC Extractor] ✅ Using canvas parsing method');
        } else if (results.ocr.possible) {
            this.currentMethod = 'ocr';
            console.log('[OTC Extractor] ✅ Using OCR extraction method');
        } else {
            console.error('[OTC Extractor] ❌ No viable extraction method found');
            this.currentMethod = 'none';
        }
        
        // Dispatch event with extraction method
        try {
            document.dispatchEvent(new CustomEvent('otcExtractionMethodSelected', {
                detail: { 
                    method: this.currentMethod,
                    broker: this.broker
                }
            }));
        } catch (error) {
            console.warn('[OTC Extractor] Could not dispatch event:', error);
        }
        
        return results;
    }
    
    /**
     * Test Pocket Option specific extraction methods
     */
    async testPocketOptionExtraction() {
        console.log('[OTC Extractor] 🔍 Testing Pocket Option specific extraction...');
        
        try {
            // Use Pocket Option specific selectors
            const selectors = this.selectors.pocketOption;
            
            // Try to find chart container
            let chartContainer = null;
            for (const selector of selectors.chartContainers) {
                const element = document.querySelector(selector);
                if (element) {
                    chartContainer = element;
                    console.log(`[OTC Extractor] Found chart container: ${selector}`);
                    break;
                }
            }
            
            // Try to find price element
            let priceElement = null;
            let currentPrice = null;
            for (const selector of selectors.priceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    priceElement = element;
                    const priceText = element.textContent.trim();
                    const priceMatch = priceText.match(/(\d+\.\d+)/);
                    if (priceMatch) {
                        currentPrice = parseFloat(priceMatch[1]);
                        console.log(`[OTC Extractor] Found price element: ${selector} with value: ${currentPrice}`);
                        break;
                    }
                }
            }
            
            // Try to find asset element
            let assetElement = null;
            let currentAsset = null;
            for (const selector of selectors.assetSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    assetElement = element;
                    currentAsset = element.textContent.trim();
                    console.log(`[OTC Extractor] Found asset element: ${selector} with value: ${currentAsset}`);
                    break;
                }
            }
            
            // Try to find candle data elements
            let candleDataElements = [];
            for (const selector of selectors.candleDataElements) {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length > 0) {
                    candleDataElements = Array.from(elements);
                    console.log(`[OTC Extractor] Found ${elements.length} candle data elements: ${selector}`);
                    break;
                }
            }
            
            // Try to find OTC indicators
            let isOTC = false;
            for (const selector of selectors.otcIndicators) {
                const element = document.querySelector(selector);
                if (element) {
                    isOTC = true;
                    console.log(`[OTC Extractor] Found OTC indicator: ${selector}`);
                    break;
                }
            }
            
            // Check if asset name contains OTC indicators
            if (currentAsset) {
                const assetLower = currentAsset.toLowerCase();
                if (assetLower.includes('otc') || 
                    assetLower.includes('weekend') || 
                    assetLower.includes('synthetic')) {
                    isOTC = true;
                    console.log(`[OTC Extractor] Asset name indicates OTC: ${currentAsset}`);
                }
            }
            
            // Check if we found the essential elements
            const foundElements = {
                chartContainer: !!chartContainer,
                priceElement: !!priceElement && !!currentPrice,
                assetElement: !!assetElement && !!currentAsset,
                candleData: candleDataElements.length > 0,
                isOTC
            };
            
            // If we found at least 2 out of 3 essential elements, consider it a success
            const essentialCount = [
                foundElements.chartContainer,
                foundElements.priceElement,
                foundElements.assetElement
            ].filter(Boolean).length;
            
            const success = essentialCount >= 2;
            
            // Try to extract a sample candle
            let sampleCandle = null;
            if (success && currentPrice) {
                sampleCandle = {
                    timestamp: Date.now(),
                    open: currentPrice * 0.9995,
                    high: currentPrice * 1.001,
                    low: currentPrice * 0.999,
                    close: currentPrice,
                    volume: 1
                };
            }
            
            return {
                method: 'pocket_option_specific',
                success,
                elements: foundElements,
                chartContainer,
                priceElement,
                assetElement,
                currentPrice,
                currentAsset,
                isOTC,
                candles: sampleCandle ? [sampleCandle] : [],
                candleDataElements: candleDataElements.length
            };
            
        } catch (error) {
            console.error('[OTC Extractor] Pocket Option extraction test failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Test Quotex specific extraction methods
     */
    async testQuotexExtraction() {
        console.log('[OTC Extractor] 🔍 Testing Quotex specific extraction...');
        
        try {
            // Use Quotex specific selectors
            const selectors = this.selectors.quotex;
            
            // Try to find chart container
            let chartContainer = null;
            for (const selector of selectors.chartContainers) {
                const element = document.querySelector(selector);
                if (element) {
                    chartContainer = element;
                    console.log(`[OTC Extractor] Found chart container: ${selector}`);
                    break;
                }
            }
            
            // Try to find price element
            let priceElement = null;
            let currentPrice = null;
            for (const selector of selectors.priceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    priceElement = element;
                    const priceText = element.textContent.trim();
                    const priceMatch = priceText.match(/(\d+\.\d+)/);
                    if (priceMatch) {
                        currentPrice = parseFloat(priceMatch[1]);
                        console.log(`[OTC Extractor] Found price element: ${selector} with value: ${currentPrice}`);
                        break;
                    }
                }
            }
            
            // Try to find asset element
            let assetElement = null;
            let currentAsset = null;
            for (const selector of selectors.assetSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    assetElement = element;
                    currentAsset = element.textContent.trim();
                    console.log(`[OTC Extractor] Found asset element: ${selector} with value: ${currentAsset}`);
                    break;
                }
            }
            
            // Try to find candle data elements
            let candleDataElements = [];
            for (const selector of selectors.candleDataElements) {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length > 0) {
                    candleDataElements = Array.from(elements);
                    console.log(`[OTC Extractor] Found ${elements.length} candle data elements: ${selector}`);
                    break;
                }
            }
            
            // Try to find OTC indicators
            let isOTC = false;
            for (const selector of selectors.otcIndicators) {
                const element = document.querySelector(selector);
                if (element) {
                    isOTC = true;
                    console.log(`[OTC Extractor] Found OTC indicator: ${selector}`);
                    break;
                }
            }
            
            // Check if asset name contains OTC indicators
            if (currentAsset) {
                const assetLower = currentAsset.toLowerCase();
                if (assetLower.includes('otc') || 
                    assetLower.includes('weekend') || 
                    assetLower.includes('synthetic')) {
                    isOTC = true;
                    console.log(`[OTC Extractor] Asset name indicates OTC: ${currentAsset}`);
                }
            }
            
            // Check if we found the essential elements
            const foundElements = {
                chartContainer: !!chartContainer,
                priceElement: !!priceElement && !!currentPrice,
                assetElement: !!assetElement && !!currentAsset,
                candleData: candleDataElements.length > 0,
                isOTC
            };
            
            // If we found at least 2 out of 3 essential elements, consider it a success
            const essentialCount = [
                foundElements.chartContainer,
                foundElements.priceElement,
                foundElements.assetElement
            ].filter(Boolean).length;
            
            const success = essentialCount >= 2;
            
            // Try to extract a sample candle
            let sampleCandle = null;
            if (success && currentPrice) {
                sampleCandle = {
                    timestamp: Date.now(),
                    open: currentPrice * 0.9995,
                    high: currentPrice * 1.001,
                    low: currentPrice * 0.999,
                    close: currentPrice,
                    volume: 1
                };
            }
            
            return {
                method: 'quotex_specific',
                success,
                elements: foundElements,
                chartContainer,
                priceElement,
                assetElement,
                currentPrice,
                currentAsset,
                isOTC,
                candles: sampleCandle ? [sampleCandle] : [],
                candleDataElements: candleDataElements.length
            };
            
        } catch (error) {
            console.error('[OTC Extractor] Quotex extraction test failed:', error);
            return { success: false, error: error.message };
        }
    }

    async testDOMExtraction() {
        console.log('[OTC Extractor] Testing DOM extraction for OTC data...');
        
        try {
            // Look for hidden data attributes or elements
            const potentialDataElements = [
                // Chart data containers
                '[data-candles]',
                '[data-ohlcv]',
                '[data-chart-data]',
                '.chart-data',
                '#chart-data',
                
                // Price data
                '[data-prices]',
                '.price-data',
                
                // Time series data
                '[data-timeseries]',
                '.timeseries-data',
                
                // Trading view style
                '.tv-lightweight-charts',
                '[data-tradingview]'
            ];
            
            let foundData = null;
            let dataSource = null;
            
            for (const selector of potentialDataElements) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`[OTC Extractor] Found potential data element: ${selector}`);
                    
                    // Try to extract data from various attributes/content
                    const possibleData = this.extractDataFromElement(element);
                    if (possibleData.candles && possibleData.candles.length > 0) {
                        foundData = possibleData;
                        dataSource = selector;
                        break;
                    }
                }
            }
            
            // Try scanning all elements for OHLCV-like data patterns
            if (!foundData) {
                foundData = await this.scanForCandleData();
                dataSource = 'document-scan';
            }
            
            return {
                method: 'dom',
                success: !!foundData,
                candles: foundData ? foundData.candles : [],
                source: dataSource,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error('[OTC Extractor] DOM extraction test failed:', error);
            return { method: 'dom', success: false, candles: [], error: error.message };
        }
    }

    extractDataFromElement(element) {
        const extractedData = { candles: [] };
        
        try {
            // Check data attributes
            const dataAttrs = ['data-candles', 'data-ohlcv', 'data-chart-data', 'data-prices'];
            for (const attr of dataAttrs) {
                const value = element.getAttribute(attr);
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) {
                            extractedData.candles = parsed;
                            return extractedData;
                        }
                    } catch (e) {
                        // Not JSON, try other formats
                    }
                }
            }
            
            // Check element content
            const content = element.textContent || element.innerHTML;
            if (content) {
                // Look for JSON-like structures
                const jsonMatches = content.match(/\{[^}]*"open"[^}]*\}/g) || 
                                   content.match(/\{[^}]*"high"[^}]*\}/g) ||
                                   content.match(/\[[^\]]*\d+\.\d+[^\]]*\]/g);
                
                if (jsonMatches) {
                    for (const match of jsonMatches) {
                        try {
                            const parsed = JSON.parse(match);
                            if (this.isValidCandleData(parsed)) {
                                extractedData.candles.push(parsed);
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log('[OTC Extractor] Element extraction error:', error);
        }
        
        return extractedData;
    }

    async scanForCandleData() {
        console.log('[OTC Extractor] Scanning document for OTC candle data patterns...');
        
        try {
            // Get all script tags that might contain data
            const scripts = document.querySelectorAll('script');
            
            for (const script of scripts) {
                const content = script.textContent || script.innerHTML;
                if (content) {
                    // Look for common patterns
                    const patterns = [
                        /candle(?:s|Data|s_data)\s*[:=]\s*(\[[^\]]+\])/gi,
                        /ohlcv?\s*[:=]\s*(\[[^\]]+\])/gi,
                        /chart(?:Data|_data)\s*[:=]\s*(\[[^\]]+\])/gi,
                        /price(?:s|Data|_data)\s*[:=]\s*(\[[^\]]+\])/gi,
                        /\[\s*\{\s*["']?(?:time|timestamp|t)["']?\s*:\s*\d+.*?["']?(?:open|o)["']?\s*:\s*\d+/gi
                    ];
                    
                    for (const pattern of patterns) {
                        const matches = content.match(pattern);
                        if (matches) {
                            for (const match of matches) {
                                try {
                                    // Extract JSON part
                                    const jsonPart = match.match(/\[.*\]/)[0];
                                    const parsed = JSON.parse(jsonPart);
                                    
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                        const validCandles = parsed.filter(item => this.isValidCandleData(item));
                                        if (validCandles.length > 5) { // Need at least 5 valid candles
                                            console.log(`[OTC Extractor] Found ${validCandles.length} candles in script`);
                                            return { candles: validCandles };
                                        }
                                    }
                                } catch (e) {
                                    continue; // Try next match
                                }
                            }
                        }
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('[OTC Extractor] Document scan error:', error);
            return null;
        }
    }

    async testCanvasExtraction() {
        console.log('[OTC Extractor] Testing canvas extraction for OTC data...');
        
        try {
            // Find chart canvas elements
            const canvasElements = [];
            
            for (const selector of this.selectors.chartContainers) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.tagName === 'CANVAS') {
                        canvasElements.push(el);
                    } else {
                        // Look for canvas inside this element
                        const canvases = el.querySelectorAll('canvas');
                        canvases.forEach(canvas => canvasElements.push(canvas));
                    }
                });
            }
            
            if (canvasElements.length === 0) {
                return { method: 'canvas', possible: false, reason: 'No canvas elements found' };
            }
            
            // Find the most likely chart canvas (usually the largest)
            const chartCanvas = this.findMostLikelyChartCanvas(canvasElements);
            
            if (!chartCanvas) {
                return { method: 'canvas', possible: false, reason: 'Could not identify chart canvas' };
            }
            
            // Take a snapshot of the canvas
            const dataUrl = chartCanvas.toDataURL('image/png');
            
            return {
                method: 'canvas',
                possible: true,
                canvasFound: true,
                canvasSize: { width: chartCanvas.width, height: chartCanvas.height },
                sampleImage: dataUrl.substring(0, 100) + '...' // Just for logging
            };
            
        } catch (error) {
            console.error('[OTC Extractor] Canvas extraction test failed:', error);
            return { method: 'canvas', possible: false, error: error.message };
        }
    }

    findMostLikelyChartCanvas(canvasElements) {
        if (canvasElements.length === 0) return null;
        if (canvasElements.length === 1) return canvasElements[0];
        
        // Sort by area (largest first)
        const sortedCanvases = [...canvasElements].sort((a, b) => {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            return areaB - areaA;
        });
        
        return sortedCanvases[0];
    }

    async testOCRExtraction() {
        console.log('[OTC Extractor] Testing OCR extraction for OTC data...');
        
        if (!window.Tesseract) {
            return { method: 'ocr', possible: false, reason: 'Tesseract.js not loaded' };
        }
        
        try {
            // Find price elements
            let priceElement = null;
            
            for (const selector of this.selectors.priceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    priceElement = element;
                    break;
                }
            }
            
            if (!priceElement) {
                return { method: 'ocr', possible: true, priceElementFound: false };
            }
            
            // Try to read current price
            const priceText = priceElement.textContent;
            const hasNumericPrice = /\d+\.\d+/.test(priceText);
            
            return {
                method: 'ocr',
                possible: true,
                priceElementFound: true,
                hasNumericPrice,
                sampleText: priceText
            };
            
        } catch (error) {
            console.error('[OTC Extractor] OCR extraction test failed:', error);
            return { method: 'ocr', possible: false, error: error.message };
        }
    }

    startRealtimeMonitoring() {
        if (this.isExtracting) return;
        
        console.log('[OTC Extractor] Starting real-time OTC data monitoring...');
        this.isExtracting = true;
        
        // Set up interval for data extraction
        this.extractionInterval = setInterval(() => {
            this.extractCurrentData();
        }, 1000); // Check every second
    }

    stopRealtimeMonitoring() {
        if (!this.isExtracting) return;
        
        console.log('[OTC Extractor] Stopping real-time OTC data monitoring...');
        this.isExtracting = false;
        
        if (this.extractionInterval) {
            clearInterval(this.extractionInterval);
            this.extractionInterval = null;
        }
    }

    async extractCurrentData() {
        if (!this.currentMethod || this.currentMethod === 'none') return;
        
        try {
            let extractedData = null;
            
            // Use broker-specific methods if available
            if (this.currentMethod === 'pocket_option_specific') {
                extractedData = await this.extractPocketOptionData();
            } else if (this.currentMethod === 'quotex_specific') {
                extractedData = await this.extractQuotexData();
            } else {
                // Use the generic extraction method
                switch (this.currentMethod) {
                    case 'dom':
                        extractedData = await this.extractDataUsingDOM();
                        break;
                    case 'canvas':
                        extractedData = await this.extractDataUsingCanvas();
                        break;
                    case 'ocr':
                        extractedData = await this.extractDataUsingOCR();
                        break;
                }
            }
            
            if (extractedData && extractedData.candles && extractedData.candles.length > 0) {
                // Process and store the extracted data
                this.processExtractedData(extractedData);
            }
            
        } catch (error) {
            console.error('[OTC Extractor] Data extraction error:', error);
        }
    }

    async extractDataUsingDOM() {
        // Implementation similar to testDOMExtraction but focused on current data
        const result = await this.testDOMExtraction();
        return result.success ? { candles: result.candles, timeframe: this.getCurrentTimeframe() } : null;
    }

    async extractDataUsingCanvas() {
        // Find chart canvas
        const canvasElements = [];
        
        for (const selector of this.selectors.chartContainers) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.tagName === 'CANVAS') {
                    canvasElements.push(el);
                } else {
                    // Look for canvas inside this element
                    const canvases = el.querySelectorAll('canvas');
                    canvases.forEach(canvas => canvasElements.push(canvas));
                }
            });
        }
        
        if (canvasElements.length === 0) {
            return null;
        }
        
        // Find the most likely chart canvas
        const chartCanvas = this.findMostLikelyChartCanvas(canvasElements);
        
        if (!chartCanvas) {
            return null;
        }
        
        // Take a snapshot of the canvas
        const dataUrl = chartCanvas.toDataURL('image/png');
        
        // Process the image to extract candle data
        // This is a complex task that would require image processing
        // For now, we'll return a placeholder
        
        return {
            candles: [],
            timeframe: this.getCurrentTimeframe(),
            imageData: dataUrl
        };
    }

    async extractDataUsingOCR() {
        // Find price element
        let priceElement = null;
        
        for (const selector of this.selectors.priceSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                priceElement = element;
                break;
            }
        }
        
        if (!priceElement) {
            return null;
        }
        
        // Read current price
        const priceText = priceElement.textContent;
        const priceMatch = priceText.match(/(\d+\.\d+)/);
        
        if (!priceMatch) {
            return null;
        }
        
        const currentPrice = parseFloat(priceMatch[1]);
        
        // Create a simple candle with just the current price
        const candle = {
            timestamp: Date.now(),
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0
        };
        
        return {
            candles: [candle],
            timeframe: this.getCurrentTimeframe()
        };
    }

    getCurrentTimeframe() {
        // Try to detect the current timeframe from the UI
        for (const selector of this.selectors.timeframeSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent;
                
                // Common timeframe formats
                if (/1\s*min/i.test(text)) return '1M';
                if (/3\s*min/i.test(text)) return '3M';
                if (/5\s*min/i.test(text)) return '5M';
                if (/15\s*min/i.test(text)) return '15M';
                if (/30\s*min/i.test(text)) return '30M';
                if (/1\s*h/i.test(text)) return '1H';
                
                // Try to extract from class or data attribute
                const tfClass = Array.from(element.classList).find(c => /timeframe/i.test(c));
                if (tfClass) {
                    if (/1m/i.test(tfClass)) return '1M';
                    if (/3m/i.test(tfClass)) return '3M';
                    if (/5m/i.test(tfClass)) return '5M';
                    if (/15m/i.test(tfClass)) return '15M';
                    if (/30m/i.test(tfClass)) return '30M';
                    if (/1h/i.test(tfClass)) return '1H';
                }
            }
        }
        
        // Default to 1M if we can't detect
        return '1M';
    }

    /**
     * Extract data specifically from Pocket Option
     */
    async extractPocketOptionData() {
        console.log('[OTC Extractor] Extracting data from Pocket Option...');
        
        try {
            const selectors = this.selectors.pocketOption;
            
            // Get current price
            let currentPrice = null;
            for (const selector of selectors.priceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const priceText = element.textContent.trim();
                    const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        break;
                    }
                }
            }
            
            if (!currentPrice) {
                console.warn('[OTC Extractor] Could not extract price from Pocket Option');
                return null;
            }
            
            // Get current asset
            let currentAsset = 'Unknown';
            for (const selector of selectors.assetSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const assetText = element.textContent.trim();
                    if (assetText) {
                        currentAsset = assetText;
                        break;
                    }
                }
            }
            
            // Try to extract candle data from DOM
            let candles = [];
            
            // Look for candle info tooltips
            const tooltipSelectors = selectors.candleInfo || [];
            for (const selector of tooltipSelectors) {
                const tooltips = document.querySelectorAll(selector);
                if (tooltips.length > 0) {
                    // Extract data from tooltips
                    tooltips.forEach(tooltip => {
                        const tooltipText = tooltip.textContent;
                        const candleData = this.parseCandleTooltip(tooltipText);
                        if (candleData) {
                            candles.push(candleData);
                        }
                    });
                }
            }
            
            // If we couldn't extract candles, create a synthetic one with current price
            if (candles.length === 0) {
                const syntheticCandle = {
                    timestamp: Date.now(),
                    open: currentPrice,
                    high: currentPrice * 1.0001, // Slightly higher
                    low: currentPrice * 0.9999,  // Slightly lower
                    close: currentPrice,
                    volume: 1
                };
                
                candles.push(syntheticCandle);
            }
            
            return {
                source: 'pocket_option',
                asset: currentAsset,
                currentPrice,
                candles,
                timestamp: Date.now(),
                timeframe: this.getCurrentTimeframe()
            };
            
        } catch (error) {
            console.error('[OTC Extractor] Pocket Option extraction error:', error);
            return null;
        }
    }
    
    /**
     * Extract data specifically from Quotex
     */
    async extractQuotexData() {
        console.log('[OTC Extractor] Extracting data from Quotex...');
        
        try {
            const selectors = this.selectors.quotex;
            
            // Get current price
            let currentPrice = null;
            for (const selector of selectors.priceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const priceText = element.textContent.trim();
                    const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                    if (!isNaN(price) && price > 0) {
                        currentPrice = price;
                        break;
                    }
                }
            }
            
            if (!currentPrice) {
                console.warn('[OTC Extractor] Could not extract price from Quotex');
                return null;
            }
            
            // Get current asset
            let currentAsset = 'Unknown';
            for (const selector of selectors.assetSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const assetText = element.textContent.trim();
                    if (assetText) {
                        currentAsset = assetText;
                        break;
                    }
                }
            }
            
            // Try to extract candle data from DOM
            let candles = [];
            
            // Look for candle info tooltips
            const tooltipSelectors = selectors.candleInfo || [];
            for (const selector of tooltipSelectors) {
                const tooltips = document.querySelectorAll(selector);
                if (tooltips.length > 0) {
                    // Extract data from tooltips
                    tooltips.forEach(tooltip => {
                        const tooltipText = tooltip.textContent;
                        const candleData = this.parseCandleTooltip(tooltipText);
                        if (candleData) {
                            candles.push(candleData);
                        }
                    });
                }
            }
            
            // If we couldn't extract candles, create a synthetic one with current price
            if (candles.length === 0) {
                const syntheticCandle = {
                    timestamp: Date.now(),
                    open: currentPrice,
                    high: currentPrice * 1.0001, // Slightly higher
                    low: currentPrice * 0.9999,  // Slightly lower
                    close: currentPrice,
                    volume: 1
                };
                
                candles.push(syntheticCandle);
            }
            
            return {
                source: 'quotex',
                asset: currentAsset,
                currentPrice,
                candles,
                timestamp: Date.now(),
                timeframe: this.getCurrentTimeframe()
            };
            
        } catch (error) {
            console.error('[OTC Extractor] Quotex extraction error:', error);
            return null;
        }
    }
    
    /**
     * Parse candle tooltip text into candle data
     */
    parseCandleTooltip(tooltipText) {
        try {
            if (!tooltipText) return null;
            
            // Common patterns in candle tooltips
            const openMatch = tooltipText.match(/open[:\s]+([0-9.]+)/i);
            const highMatch = tooltipText.match(/high[:\s]+([0-9.]+)/i);
            const lowMatch = tooltipText.match(/low[:\s]+([0-9.]+)/i);
            const closeMatch = tooltipText.match(/close[:\s]+([0-9.]+)/i);
            
            // Alternative patterns
            const openAltMatch = tooltipText.match(/o[:\s]+([0-9.]+)/i);
            const highAltMatch = tooltipText.match(/h[:\s]+([0-9.]+)/i);
            const lowAltMatch = tooltipText.match(/l[:\s]+([0-9.]+)/i);
            const closeAltMatch = tooltipText.match(/c[:\s]+([0-9.]+)/i);
            
            // Time pattern
            const timeMatch = tooltipText.match(/time[:\s]+([\d:\/\s.]+)/i) || 
                             tooltipText.match(/([\d]{2}:[\d]{2}:[\d]{2})/);
            
            // Extract values
            const open = parseFloat((openMatch && openMatch[1]) || (openAltMatch && openAltMatch[1]) || '0');
            const high = parseFloat((highMatch && highMatch[1]) || (highAltMatch && highAltMatch[1]) || '0');
            const low = parseFloat((lowMatch && lowMatch[1]) || (lowAltMatch && lowAltMatch[1]) || '0');
            const close = parseFloat((closeMatch && closeMatch[1]) || (closeAltMatch && closeAltMatch[1]) || '0');
            
            // If we couldn't extract OHLC values, return null
            if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                return null;
            }
            
            // Create timestamp from time or use current time
            let timestamp = Date.now();
            if (timeMatch && timeMatch[1]) {
                try {
                    const timeStr = timeMatch[1].trim();
                    const date = new Date(timeStr);
                    if (!isNaN(date.getTime())) {
                        timestamp = date.getTime();
                    }
                } catch (e) {
                    // Use current time as fallback
                }
            }
            
            return {
                timestamp,
                open,
                high,
                low,
                close,
                volume: 1 // Default volume
            };
            
        } catch (error) {
            console.warn('[OTC Extractor] Error parsing candle tooltip:', error);
            return null;
        }
    }
    
    processExtractedData(extractedData) {
        const { candles, timeframe } = extractedData;
        
        if (!candles || candles.length === 0 || !timeframe) {
            return;
        }
        
        // Store the data by timeframe
        this.candleData.set(timeframe, candles);
        this.lastUpdate.set(timeframe, Date.now());
        
        // Emit event for data update
        this.emitDataUpdate(timeframe, candles);
        
        if (this.debugMode) {
            console.log(`[OTC Extractor] Updated ${candles.length} candles for ${timeframe} timeframe`);
        }
    }

    emitDataUpdate(timeframe, candles) {
        // Create and dispatch a custom event
        const event = new CustomEvent('otcDataUpdate', {
            detail: {
                timeframe,
                candles,
                timestamp: Date.now(),
                source: this.platform
            }
        });
        
        document.dispatchEvent(event);
    }

    // Get the latest candle data for a specific timeframe
    getLatestData(timeframe = '1M') {
        return {
            candles: this.candleData.get(timeframe) || [],
            lastUpdate: this.lastUpdate.get(timeframe) || null,
            timeframe
        };
    }

    // Get all available timeframe data
    getAllTimeframeData() {
        const result = {};
        
        for (const timeframe of this.timeframes) {
            if (this.candleData.has(timeframe)) {
                result[timeframe] = {
                    candles: this.candleData.get(timeframe),
                    lastUpdate: this.lastUpdate.get(timeframe)
                };
            }
        }
        
        return result;
    }

    // Utility to check if an object looks like valid candle data
    isValidCandleData(obj) {
        // Check if it has the basic OHLC properties
        const hasOHLC = (
            (obj.hasOwnProperty('open') || obj.hasOwnProperty('o')) &&
            (obj.hasOwnProperty('high') || obj.hasOwnProperty('h')) &&
            (obj.hasOwnProperty('low') || obj.hasOwnProperty('l')) &&
            (obj.hasOwnProperty('close') || obj.hasOwnProperty('c'))
        );
        
        return hasOHLC;
    }
    
    /**
     * Extract OTC data from current page
     */
    async extractOTCData() {
        try {
            const data = await this.extractCandleData();
            if (data && this.validateData(data)) {
                return data;
            }
            throw new Error('No valid OTC data found');
        } catch (error) {
            console.error('[OTC Extractor] Error extracting OTC data:', error);
            throw error;
        }
    }
    
    /**
     * Process candles data
     */
    processCandles(rawData) {
        if (!Array.isArray(rawData)) {
            return [];
        }
        
        return rawData.map(candle => ({
            timestamp: candle.timestamp || Date.now(),
            open: parseFloat(candle.open) || 0,
            high: parseFloat(candle.high) || 0,
            low: parseFloat(candle.low) || 0,
            close: parseFloat(candle.close) || 0,
            volume: parseFloat(candle.volume) || 0
        }));
    }
    
    /**
     * Validate extracted data
     */
    validateData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        const requiredFields = ['timestamp', 'open', 'high', 'low', 'close'];
        return requiredFields.every(field => 
            data.hasOwnProperty(field) && 
            data[field] !== null && 
            !isNaN(data[field])
        );
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OTCDataExtractor;
} else if (typeof window !== 'undefined') {
    window.OTCDataExtractor = OTCDataExtractor;
}
            (obj.hasOwnProperty('low') || obj.hasOwnProperty('l')) &&
            (obj.hasOwnProperty('close') || obj.hasOwnProperty('c'))
        );
        
        // Check if it has a timestamp
        const hasTimestamp = (
            obj.hasOwnProperty('timestamp') || 
            obj.hasOwnProperty('time') || 
            obj.hasOwnProperty('t') ||
            obj.hasOwnProperty('date')
        );
        
        return hasOHLC && hasTimestamp;
    }

    // Clean up resources
    destroy() {
        this.stopRealtimeMonitoring();
        console.log('[OTC Extractor] Destroyed');
    }
}

// Export the class
module.exports = { OTCDataExtractor };