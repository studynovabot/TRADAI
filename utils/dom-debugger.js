/**
 * AI Candle Sniper - DOM Structure Debugger
 * Interactive debugging tool to investigate platform DOM structure
 * Helps identify data sources and extraction points
 */

class DOMDebugger {
    constructor() {
        this.isActive = false;
        this.debugPanel = null;
        this.highlightedElements = new Set();
        this.discoveredData = new Map();
        this.scanResults = {
            canvasElements: [],
            dataAttributes: [],
            hiddenElements: [],
            scriptVariables: [],
            websocketConnections: [],
            apiCalls: []
        };
        
        this.init();
    }

    init() {
        console.log('[DOM Debugger] 🔧 Initializing DOM investigation tools...');
        
        // Override common functions to detect data flow
        this.setupInterceptors();
        
        // Create debug panel
        this.createDebugPanel();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupInterceptors() {
        // Intercept fetch calls to detect API data
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch.apply(window, args);
            
            if (this.isActive) {
                this.logAPICall('fetch', args[0], response);
            }
            
            return response;
        };

        // Intercept XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const debugger = window.domDebugger;
            
            if (debugger && debugger.isActive) {
                const originalOpen = xhr.open;
                xhr.open = function(method, url, ...args) {
                    debugger.logAPICall('xhr', `${method} ${url}`, null);
                    return originalOpen.apply(this, [method, url, ...args]);
                };
            }
            
            return xhr;
        };

        // Intercept WebSocket connections
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            const ws = new originalWebSocket(url, protocols);
            const debugger = window.domDebugger;
            
            if (debugger && debugger.isActive) {
                debugger.logWebSocketConnection(url);
                
                ws.addEventListener('message', (event) => {
                    debugger.logWebSocketMessage(url, event.data);
                });
            }
            
            return ws;
        };
    }

    createDebugPanel() {
        // Create floating debug panel
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'candlesniper-debug-panel';
        this.debugPanel.innerHTML = `
            <div class="debug-header">
                <h3>🔍 AI Candle Sniper - DOM Debugger</h3>
                <div class="debug-controls">
                    <button id="debug-start-scan">Start Deep Scan</button>
                    <button id="debug-highlight-canvases">Highlight Canvases</button>
                    <button id="debug-find-data">Find Data Sources</button>
                    <button id="debug-export">Export Results</button>
                    <button id="debug-close">Close</button>
                </div>
            </div>
            <div class="debug-content">
                <div class="debug-tabs">
                    <button class="debug-tab active" data-tab="elements">Elements</button>
                    <button class="debug-tab" data-tab="data">Data Sources</button>
                    <button class="debug-tab" data-tab="network">Network</button>
                    <button class="debug-tab" data-tab="scripts">Scripts</button>
                </div>
                <div id="debug-tab-elements" class="debug-tab-content active">
                    <div class="debug-section">
                        <h4>Canvas Elements</h4>
                        <div id="debug-canvases"></div>
                    </div>
                    <div class="debug-section">
                        <h4>Data Attributes</h4>
                        <div id="debug-data-attrs"></div>
                    </div>
                </div>
                <div id="debug-tab-data" class="debug-tab-content">
                    <div class="debug-section">
                        <h4>Discovered Variables</h4>
                        <div id="debug-variables"></div>
                    </div>
                    <div class="debug-section">
                        <h4>Hidden Elements</h4>
                        <div id="debug-hidden"></div>
                    </div>
                </div>
                <div id="debug-tab-network" class="debug-tab-content">
                    <div class="debug-section">
                        <h4>API Calls</h4>
                        <div id="debug-api-calls"></div>
                    </div>
                    <div class="debug-section">
                        <h4>WebSocket Connections</h4>
                        <div id="debug-websockets"></div>
                    </div>
                </div>
                <div id="debug-tab-scripts" class="debug-tab-content">
                    <div class="debug-section">
                        <h4>Global Variables</h4>
                        <div id="debug-globals"></div>
                    </div>
                    <div class="debug-section">
                        <h4>Chart Libraries</h4>
                        <div id="debug-chart-libs"></div>
                    </div>
                </div>
            </div>
        `;

        // Style the debug panel
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            width: 400px;
            height: 600px;
            background: #1a1a1a;
            color: #ffffff;
            border: 2px solid #4ecdc4;
            border-radius: 8px;
            z-index: 999999;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        // Add styles for debug panel content
        const debugStyles = document.createElement('style');
        debugStyles.textContent = `
            #candlesniper-debug-panel .debug-header {
                background: #2d2d2d;
                padding: 10px;
                border-bottom: 1px solid #4ecdc4;
            }
            #candlesniper-debug-panel .debug-header h3 {
                margin: 0 0 10px 0;
                color: #4ecdc4;
                font-size: 14px;
            }
            #candlesniper-debug-panel .debug-controls {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            #candlesniper-debug-panel .debug-controls button {
                padding: 4px 8px;
                background: #4ecdc4;
                color: #1a1a1a;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
            }
            #candlesniper-debug-panel .debug-controls button:hover {
                background: #45b7aa;
            }
            #candlesniper-debug-panel .debug-content {
                height: calc(100% - 80px);
                overflow-y: auto;
            }
            #candlesniper-debug-panel .debug-tabs {
                display: flex;
                background: #2d2d2d;
                border-bottom: 1px solid #444;
            }
            #candlesniper-debug-panel .debug-tab {
                padding: 8px 12px;
                background: none;
                border: none;
                color: #ccc;
                cursor: pointer;
                font-size: 11px;
            }
            #candlesniper-debug-panel .debug-tab.active {
                background: #4ecdc4;
                color: #1a1a1a;
            }
            #candlesniper-debug-panel .debug-tab-content {
                display: none;
                padding: 10px;
            }
            #candlesniper-debug-panel .debug-tab-content.active {
                display: block;
            }
            #candlesniper-debug-panel .debug-section {
                margin-bottom: 15px;
            }
            #candlesniper-debug-panel .debug-section h4 {
                color: #4ecdc4;
                margin: 0 0 8px 0;
                font-size: 12px;
            }
            #candlesniper-debug-panel .debug-item {
                background: #2d2d2d;
                padding: 5px;
                margin: 3px 0;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
            }
            #candlesniper-debug-panel .debug-item:hover {
                background: #3d3d3d;
            }
            .debug-highlight {
                outline: 3px solid #ff6b6b !important;
                background: rgba(255, 107, 107, 0.2) !important;
            }
        `;
        document.head.appendChild(debugStyles);

        document.body.appendChild(this.debugPanel);
        
        // Setup event listeners
        this.setupDebugPanelEvents();
    }

    setupDebugPanelEvents() {
        // Tab switching
        const tabs = this.debugPanel.querySelectorAll('.debug-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabContents = this.debugPanel.querySelectorAll('.debug-tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                const targetContent = document.getElementById(`debug-tab-${tab.dataset.tab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Control buttons
        document.getElementById('debug-start-scan').addEventListener('click', () => this.startDeepScan());
        document.getElementById('debug-highlight-canvases').addEventListener('click', () => this.highlightCanvases());
        document.getElementById('debug-find-data').addEventListener('click', () => this.findDataSources());
        document.getElementById('debug-export').addEventListener('click', () => this.exportResults());
        document.getElementById('debug-close').addEventListener('click', () => this.close());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D to toggle debugger
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
            
            // Ctrl+Shift+S to start scan
            if (e.ctrlKey && e.shiftKey && e.key === 'S' && this.isActive) {
                e.preventDefault();
                this.startDeepScan();
            }
        });
    }

    toggle() {
        if (this.isActive) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isActive = true;
        this.debugPanel.style.display = 'block';
        console.log('[DOM Debugger] 🔍 Debug panel opened - Press Ctrl+Shift+S to scan');
    }

    close() {
        this.isActive = false;
        this.debugPanel.style.display = 'none';
        this.clearHighlights();
        console.log('[DOM Debugger] Debug panel closed');
    }

    async startDeepScan() {
        console.log('[DOM Debugger] 🕵️ Starting deep DOM scan...');
        
        // Clear previous results
        this.scanResults = {
            canvasElements: [],
            dataAttributes: [],
            hiddenElements: [],
            scriptVariables: [],
            websocketConnections: [],
            apiCalls: []
        };

        // Scan for canvas elements
        await this.scanForCanvases();
        
        // Scan for data attributes
        await this.scanForDataAttributes();
        
        // Scan for hidden elements with data
        await this.scanForHiddenElements();
        
        // Scan for JavaScript variables
        await this.scanForScriptVariables();
        
        // Scan for chart libraries
        await this.scanForChartLibraries();
        
        // Update display
        this.updateDebugDisplay();
        
        console.log('[DOM Debugger] ✅ Deep scan complete');
    }

    async scanForCanvases() {
        const canvases = document.querySelectorAll('canvas');
        
        canvases.forEach((canvas, index) => {
            const rect = canvas.getBoundingClientRect();
            const context = canvas.getContext('2d');
            
            // Test if canvas has content
            let hasContent = false;
            try {
                const imageData = context.getImageData(0, 0, Math.min(canvas.width, 10), Math.min(canvas.height, 10));
                hasContent = Array.from(imageData.data).some(pixel => pixel !== 0);
            } catch (e) {
                hasContent = 'unknown';
            }
            
            this.scanResults.canvasElements.push({
                index,
                element: canvas,
                width: canvas.width,
                height: canvas.height,
                visible: rect.width > 0 && rect.height > 0,
                hasContent,
                id: canvas.id || 'no-id',
                classes: canvas.className || 'no-classes',
                parent: canvas.parentElement?.tagName || 'unknown'
            });
        });
    }

    async scanForDataAttributes() {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            // Check for data attributes
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('data-') && attr.value) {
                    // Try to parse as JSON
                    let parsedValue = attr.value;
                    try {
                        parsedValue = JSON.parse(attr.value);
                    } catch (e) {
                        // Not JSON, keep as string
                    }
                    
                    // Check if looks like chart data
                    const isChartData = this.looksLikeChartData(attr.name, parsedValue);
                    
                    if (isChartData) {
                        this.scanResults.dataAttributes.push({
                            element: element,
                            tagName: element.tagName,
                            attribute: attr.name,
                            value: parsedValue,
                            isJSON: typeof parsedValue === 'object',
                            id: element.id || 'no-id',
                            classes: element.className || 'no-classes'
                        });
                    }
                }
            });
        });
    }

    async scanForHiddenElements() {
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            const style = window.getComputedStyle(element);
            const isHidden = style.display === 'none' || 
                           style.visibility === 'hidden' || 
                           style.opacity === '0';
            
            if (isHidden && (element.textContent || element.innerHTML)) {
                // Check if contains data that looks like OHLCV
                const content = element.textContent + element.innerHTML;
                if (this.containsOHLCVData(content)) {
                    this.scanResults.hiddenElements.push({
                        element: element,
                        tagName: element.tagName,
                        content: content.substring(0, 200) + '...',
                        id: element.id || 'no-id',
                        classes: element.className || 'no-classes'
                    });
                }
            }
        });
    }

    async scanForScriptVariables() {
        // Scan global variables for chart data
        const globalVars = Object.getOwnPropertyNames(window);
        
        globalVars.forEach(varName => {
            try {
                const value = window[varName];
                
                // Skip functions and common browser objects
                if (typeof value === 'function' || 
                    ['document', 'window', 'console', 'navigator'].includes(varName)) {
                    return;
                }
                
                // Check if variable contains chart-like data
                if (this.containsChartData(value)) {
                    this.scanResults.scriptVariables.push({
                        name: varName,
                        type: typeof value,
                        isArray: Array.isArray(value),
                        length: Array.isArray(value) ? value.length : null,
                        preview: this.getValuePreview(value)
                    });
                }
            } catch (e) {
                // Skip variables that can't be accessed
            }
        });
    }

    async scanForChartLibraries() {
        const chartLibraries = [
            'TradingView', 'tv', 'Chart', 'ChartJS', 'Highcharts', 'D3', 'd3',
            'Plotly', 'ApexCharts', 'ECharts', 'echarts', 'Chartist'
        ];
        
        const foundLibraries = [];
        
        chartLibraries.forEach(libName => {
            if (window[libName]) {
                foundLibraries.push({
                    name: libName,
                    type: typeof window[libName],
                    methods: Object.getOwnPropertyNames(window[libName]).slice(0, 10)
                });
            }
        });
        
        this.scanResults.chartLibraries = foundLibraries;
    }

    highlightCanvases() {
        this.clearHighlights();
        
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            canvas.classList.add('debug-highlight');
            this.highlightedElements.add(canvas);
        });
        
        console.log(`[DOM Debugger] Highlighted ${canvases.length} canvas elements`);
    }

    findDataSources() {
        console.log('[DOM Debugger] 🔍 Searching for data sources...');
        
        // Look for common data source patterns
        const dataPatterns = [
            'candle', 'ohlc', 'price', 'chart', 'trading', 'market',
            'quote', 'tick', 'bar', 'series', 'data', 'feed'
        ];
        
        const foundSources = [];
        
        // Search in element IDs and classes
        document.querySelectorAll('*').forEach(element => {
            const id = element.id.toLowerCase();
            const classes = element.className.toLowerCase();
            
            dataPatterns.forEach(pattern => {
                if (id.includes(pattern) || classes.includes(pattern)) {
                    foundSources.push({
                        type: 'element',
                        element: element,
                        pattern: pattern,
                        location: id.includes(pattern) ? 'id' : 'class'
                    });
                }
            });
        });
        
        // Search in script content
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent) {
                dataPatterns.forEach(pattern => {
                    if (script.textContent.toLowerCase().includes(pattern)) {
                        foundSources.push({
                            type: 'script',
                            element: script,
                            pattern: pattern,
                            preview: this.extractScriptPreview(script.textContent, pattern)
                        });
                    }
                });
            }
        });
        
        console.log(`[DOM Debugger] Found ${foundSources.length} potential data sources`);
        this.discoveredData.set('dataSources', foundSources);
        
        return foundSources;
    }

    // Utility methods for data detection
    looksLikeChartData(attrName, value) {
        const chartKeywords = ['chart', 'candle', 'ohlc', 'price', 'data', 'series'];
        const nameMatch = chartKeywords.some(keyword => attrName.toLowerCase().includes(keyword));
        
        if (typeof value === 'object' && Array.isArray(value)) {
            return nameMatch || value.some(item => this.isOHLCVLike(item));
        }
        
        return nameMatch;
    }

    containsOHLCVData(content) {
        const ohlcvPattern = /(?:open|high|low|close|volume|ohlc|ohlcv)/i;
        const numberPattern = /\d+\.\d{2,}/; // Decimal numbers with 2+ places
        
        return ohlcvPattern.test(content) && numberPattern.test(content);
    }

    containsChartData(value) {
        if (Array.isArray(value) && value.length > 0) {
            return value.some(item => this.isOHLCVLike(item));
        }
        
        if (typeof value === 'object' && value !== null) {
            const keys = Object.keys(value).map(k => k.toLowerCase());
            const chartKeys = ['chart', 'candle', 'price', 'data', 'series', 'ohlc'];
            return chartKeys.some(key => keys.includes(key));
        }
        
        return false;
    }

    isOHLCVLike(item) {
        if (typeof item !== 'object' || item === null) return false;
        
        const keys = Object.keys(item).map(k => k.toLowerCase());
        const requiredKeys = ['open', 'high', 'low', 'close'];
        const aliasKeys = ['o', 'h', 'l', 'c'];
        
        const hasRequired = requiredKeys.every(key => keys.includes(key));
        const hasAliases = aliasKeys.every(key => keys.includes(key));
        
        return hasRequired || hasAliases;
    }

    getValuePreview(value) {
        if (typeof value === 'string') {
            return value.length > 50 ? value.substring(0, 50) + '...' : value;
        }
        
        if (Array.isArray(value)) {
            return `Array(${value.length}) [${JSON.stringify(value[0] || '').substring(0, 30)}...]`;
        }
        
        if (typeof value === 'object') {
            return `Object {${Object.keys(value).slice(0, 3).join(', ')}...}`;
        }
        
        return String(value);
    }

    extractScriptPreview(scriptContent, pattern) {
        const lines = scriptContent.split('\n');
        const matchingLines = lines.filter(line => 
            line.toLowerCase().includes(pattern.toLowerCase())
        );
        
        return matchingLines.slice(0, 3).map(line => 
            line.trim().substring(0, 80) + '...'
        ).join('\n');
    }

    updateDebugDisplay() {
        // Update canvas display
        const canvasContainer = document.getElementById('debug-canvases');
        if (canvasContainer) {
            canvasContainer.innerHTML = this.scanResults.canvasElements.map((canvas, index) => 
                `<div class="debug-item" onclick="window.domDebugger.highlightElement(${index}, 'canvas')">
                    Canvas ${index}: ${canvas.width}x${canvas.height} 
                    ${canvas.hasContent ? '✅' : '❌'} ${canvas.id}
                </div>`
            ).join('');
        }
        
        // Update data attributes display
        const dataContainer = document.getElementById('debug-data-attrs');
        if (dataContainer) {
            dataContainer.innerHTML = this.scanResults.dataAttributes.map((attr, index) => 
                `<div class="debug-item" onclick="window.domDebugger.highlightElement(${index}, 'data')">
                    ${attr.tagName}: ${attr.attribute} ${attr.isJSON ? '📄' : '📝'}
                </div>`
            ).join('');
        }
        
        // Update other displays...
        this.updateNetworkDisplay();
        this.updateScriptDisplay();
    }

    updateNetworkDisplay() {
        const apiContainer = document.getElementById('debug-api-calls');
        if (apiContainer) {
            apiContainer.innerHTML = this.scanResults.apiCalls.map(call => 
                `<div class="debug-item">${call.method}: ${call.url}</div>`
            ).join('') || '<div class="debug-item">No API calls detected</div>';
        }
        
        const wsContainer = document.getElementById('debug-websockets');
        if (wsContainer) {
            wsContainer.innerHTML = this.scanResults.websocketConnections.map(ws => 
                `<div class="debug-item">WebSocket: ${ws.url}</div>`
            ).join('') || '<div class="debug-item">No WebSocket connections</div>';
        }
    }

    updateScriptDisplay() {
        const globalsContainer = document.getElementById('debug-globals');
        if (globalsContainer) {
            globalsContainer.innerHTML = this.scanResults.scriptVariables.map(variable => 
                `<div class="debug-item" title="${variable.preview}">
                    ${variable.name} (${variable.type}) ${variable.isArray ? `[${variable.length}]` : ''}
                </div>`
            ).join('');
        }
        
        const libsContainer = document.getElementById('debug-chart-libs');
        if (libsContainer) {
            libsContainer.innerHTML = (this.scanResults.chartLibraries || []).map(lib => 
                `<div class="debug-item">${lib.name} (${lib.type})</div>`
            ).join('') || '<div class="debug-item">No chart libraries detected</div>';
        }
    }

    highlightElement(index, type) {
        this.clearHighlights();
        
        let element = null;
        
        switch (type) {
            case 'canvas':
                element = this.scanResults.canvasElements[index]?.element;
                break;
            case 'data':
                element = this.scanResults.dataAttributes[index]?.element;
                break;
        }
        
        if (element) {
            element.classList.add('debug-highlight');
            this.highlightedElements.add(element);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    clearHighlights() {
        this.highlightedElements.forEach(element => {
            element.classList.remove('debug-highlight');
        });
        this.highlightedElements.clear();
    }

    // Network interceptor methods
    logAPICall(type, url, response) {
        this.scanResults.apiCalls.push({
            type,
            method: type.toUpperCase(),
            url: url.toString(),
            timestamp: Date.now(),
            response: response ? response.status : null
        });
    }

    logWebSocketConnection(url) {
        this.scanResults.websocketConnections.push({
            url,
            timestamp: Date.now()
        });
    }

    logWebSocketMessage(url, data) {
        console.log(`[DOM Debugger] WebSocket message from ${url}:`, data);
        // Could analyze message for chart data patterns
    }

    exportResults() {
        const results = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            platform: window.location.hostname,
            scanResults: this.scanResults,
            discoveredData: Object.fromEntries(this.discoveredData)
        };
        
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `candlesniper-debug-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('[DOM Debugger] 📁 Debug results exported');
    }
}

// Initialize DOM debugger
const domDebugger = new DOMDebugger();
window.domDebugger = domDebugger;

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMDebugger;
} else if (typeof window !== 'undefined') {
    window.DOMDebugger = DOMDebugger;
}

console.log('[DOM Debugger] 🔧 Ready! Press Ctrl+Shift+D to open debug panel');