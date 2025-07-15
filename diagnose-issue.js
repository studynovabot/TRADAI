// Quotex Detection Diagnostic Script
// Run this in the browser console on Quotex to see what's available

console.log('🔍 QUOTEX DETECTION DIAGNOSTIC');
console.log('================================');

// Check current URL and hostname
console.log('📍 LOCATION INFO:');
console.log('Hostname:', window.location.hostname);
console.log('URL:', window.location.href);
console.log('Title:', document.title);

// Check if this is Quotex
const isQuotex = window.location.hostname.includes('quotex.io');
console.log('Is Quotex?', isQuotex);

console.log('\n🔎 SEARCHING FOR ASSET ELEMENTS:');

// All possible selectors to try
const selectors = [
    // New Quotex interface selectors
    '.asset-select__selected .asset-select__name',
    '.selected-instrument-name',
    '.instrument-selector .selected-name',
    '.trading-panel .asset-name',
    '.asset-dropdown .selected-asset',
    '[data-test-id="asset-name"]',
    '.current-asset-name',
    
    // Fallback selectors
    '.asset-name',
    '.selected-asset .asset-name', 
    '[class*="asset"] [class*="name"]',
    '.trading-header .asset-name',
    '[data-test="asset-name"]',
    '.instrument-name',
    '.pair-name',
    '.symbol-name',
    
    // Generic selectors
    '[class*="instrument"]',
    '[class*="symbol"]',
    '[class*="pair"]',
    '[class*="asset"]'
];

let foundElements = 0;
selectors.forEach(selector => {
    try {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.textContent || element.innerText || '';
            if (text.trim()) {
                console.log(`✅ FOUND: ${selector}`);
                console.log(`   Text: "${text.trim()}"`);
                console.log(`   Classes: ${element.className}`);
                console.log(`   Visible: ${element.offsetHeight > 0}`);
                foundElements++;
            }
        }
    } catch (e) {
        // Skip invalid selectors
    }
});

if (foundElements === 0) {
    console.log('❌ No asset elements found with standard selectors');
    console.log('\n🔍 SCANNING ALL ELEMENTS FOR CURRENCY PATTERNS:');
    
    // Scan all visible elements for currency pairs
    const allElements = document.querySelectorAll('*');
    const currencyPattern = /(?:EUR\/USD|GBP\/USD|USD\/JPY|AUD\/USD|USD\/CAD|USD\/CHF|NZD\/USD|EUR\/GBP|EUR\/JPY|GBP\/JPY|EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|USDCHF|NZDUSD|EURGBP|EURJPY|GBPJPY)/i;
    
    let currencyElements = [];
    allElements.forEach(el => {
        if (el.offsetHeight > 0) { // Only visible elements
            const text = el.textContent || '';
            if (currencyPattern.test(text)) {
                currencyElements.push({
                    element: el,
                    text: text.trim(),
                    selector: getElementSelector(el)
                });
            }
        }
    });
    
    if (currencyElements.length > 0) {
        console.log('💡 FOUND CURRENCY PAIRS IN THESE ELEMENTS:');
        currencyElements.slice(0, 10).forEach(item => {
            console.log(`   Selector: ${item.selector}`);
            console.log(`   Text: "${item.text.substring(0, 100)}"`);
            console.log(`   ---`);
        });
    } else {
        console.log('❌ No currency pairs found anywhere on page');
    }
}

// Helper function to get element selector
function getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) {
        const classes = element.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
}

console.log('\n📊 SUMMARY:');
console.log(`Found ${foundElements} potential asset elements`);
console.log('Next step: Copy the working selector and test it');

console.log('\n🧪 QUICK TEST:');
console.log('Try running this in console:');
console.log('document.querySelector("SELECTOR_HERE").textContent');

// Check if extension content script is loaded
console.log('\n🔌 EXTENSION STATUS:');
if (window.candleSniperDetector) {
    console.log('✅ Extension content script is loaded');
} else {
    console.log('❌ Extension content script NOT loaded');
    console.log('   Solution: Reload the extension and refresh this page');
}