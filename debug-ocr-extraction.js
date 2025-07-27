/**
 * Debug OCR Data Extraction
 * 
 * Detailed analysis of what data is being extracted from trading screenshots
 * to identify why the system is not generating proper trading signals.
 */

const fs = require('fs').promises;
const path = require('path');
const ComprehensiveOCRAIAnalyzer = require('./src/analysis/ComprehensiveOCRAIAnalyzer');

async function debugOCRExtraction() {
    console.log('🔍 DEBUG: OCR Data Extraction Analysis');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Test with one real screenshot
    const testScreenshot = 'C:\\Users\\thaku\\Pictures\\trading ss\\1m\\usdbrl.png';
    
    try {
        // Initialize OCR analyzer
        console.log('🚀 Initializing OCR analyzer...');
        const analyzer = new ComprehensiveOCRAIAnalyzer();
        await analyzer.initialize();
        console.log('✅ OCR analyzer ready\n');
        
        // Perform detailed OCR analysis
        console.log(`📸 Analyzing screenshot: ${path.basename(testScreenshot)}`);
        console.log('─'.repeat(60));
        
        const ocrResults = await analyzer.performMultiEngineOCR(testScreenshot);
        
        // Detailed OCR results analysis
        console.log('\n📊 DETAILED OCR RESULTS:');
        console.log('═'.repeat(60));
        
        console.log(`\n🔧 Engine Results (${ocrResults.engines.length} engines):`);
        ocrResults.engines.forEach((engine, index) => {
            console.log(`\n   Engine ${index + 1}: ${engine.engine}`);
            console.log(`   Confidence: ${engine.confidence.toFixed(2)}`);
            console.log(`   Raw Text Length: ${engine.text.length} characters`);
            console.log(`   Raw Text Preview: "${engine.text.substring(0, 100)}${engine.text.length > 100 ? '...' : ''}"`);
            
            if (engine.extractedPrices && engine.extractedPrices.length > 0) {
                console.log(`   Extracted Prices (${engine.extractedPrices.length}):`);
                engine.extractedPrices.forEach(price => {
                    console.log(`      💰 ${price.value} (confidence: ${price.confidence.toFixed(2)})`);
                });
            } else {
                console.log(`   ❌ No prices extracted`);
            }
            
            if (engine.extractedIndicators && engine.extractedIndicators.length > 0) {
                console.log(`   Extracted Indicators (${engine.extractedIndicators.length}):`);
                engine.extractedIndicators.forEach(indicator => {
                    console.log(`      📈 ${indicator.name}: ${indicator.value} (confidence: ${indicator.confidence.toFixed(2)})`);
                });
            } else {
                console.log(`   ❌ No indicators extracted`);
            }
            
            if (engine.extractedTradingPairs && engine.extractedTradingPairs.length > 0) {
                console.log(`   Extracted Trading Pairs (${engine.extractedTradingPairs.length}):`);
                engine.extractedTradingPairs.forEach(pair => {
                    console.log(`      💱 ${pair.pair} (confidence: ${pair.confidence.toFixed(2)})`);
                });
            } else {
                console.log(`   ❌ No trading pairs extracted`);
            }
        });
        
        console.log(`\n📊 Aggregated Extracted Data:`);
        console.log(`   Total Prices: ${ocrResults.extractedData.prices.length}`);
        console.log(`   Total Indicators: ${ocrResults.extractedData.indicators.length}`);
        console.log(`   Total Trading Pairs: ${ocrResults.extractedData.tradingPairs.length}`);
        console.log(`   Total Patterns: ${ocrResults.extractedData.patterns.length}`);
        
        if (ocrResults.extractedData.prices.length > 0) {
            console.log(`\n💰 Price Data Details:`);
            ocrResults.extractedData.prices.forEach((price, index) => {
                console.log(`   ${index + 1}. Value: ${price.value}, Confidence: ${price.confidence.toFixed(2)}, Type: ${price.type || 'unknown'}`);
            });
        }
        
        if (ocrResults.extractedData.indicators.length > 0) {
            console.log(`\n📈 Indicator Data Details:`);
            ocrResults.extractedData.indicators.forEach((indicator, index) => {
                console.log(`   ${index + 1}. ${indicator.name}: ${indicator.value}, Confidence: ${indicator.confidence.toFixed(2)}`);
            });
        }
        
        if (ocrResults.extractedData.tradingPairs.length > 0) {
            console.log(`\n💱 Trading Pair Details:`);
            ocrResults.extractedData.tradingPairs.forEach((pair, index) => {
                console.log(`   ${index + 1}. ${pair.pair}, Confidence: ${pair.confidence.toFixed(2)}, Source: ${pair.source}`);
            });
        }
        
        console.log(`\n🎯 Overall OCR Confidence: ${ocrResults.confidence.overall.toFixed(2)}%`);
        console.log(`💰 Price Confidence: ${ocrResults.confidence.prices.toFixed(2)}%`);
        console.log(`📈 Indicator Confidence: ${ocrResults.confidence.indicators.toFixed(2)}%`);
        
        // Test price extraction patterns
        console.log('\n🔍 TESTING PRICE EXTRACTION PATTERNS:');
        console.log('─'.repeat(60));
        
        const testTexts = [
            "USD/BRL 5.2345",
            "5.2345",
            "Price: 5.2345",
            "1.08456",
            "EUR/USD 1.08456",
            "Current: 1.08456",
            "83.4567",
            "USD/INR 83.4567"
        ];
        
        testTexts.forEach(text => {
            const extractedPrices = analyzer.extractPricesFromText(text);
            console.log(`Text: "${text}" → Prices: ${extractedPrices.length > 0 ? extractedPrices.map(p => p.value).join(', ') : 'None'}`);
        });
        
        // Test indicator extraction patterns
        console.log('\n📈 TESTING INDICATOR EXTRACTION PATTERNS:');
        console.log('─'.repeat(60));
        
        const testIndicatorTexts = [
            "RSI: 65.4",
            "MACD: 0.0012",
            "Stochastic: 72.1",
            "RSI 65.4",
            "MACD 0.0012",
            "Stoch 72.1",
            "EMA: 1.0845",
            "SMA: 1.0850"
        ];
        
        testIndicatorTexts.forEach(text => {
            const extractedIndicators = analyzer.extractIndicatorsFromText(text);
            console.log(`Text: "${text}" → Indicators: ${extractedIndicators.length > 0 ? extractedIndicators.map(i => `${i.name}:${i.value}`).join(', ') : 'None'}`);
        });
        
        // Test trading pair extraction patterns
        console.log('\n💱 TESTING TRADING PAIR EXTRACTION PATTERNS:');
        console.log('─'.repeat(60));
        
        const testPairTexts = [
            "USD/BRL",
            "USDBRL",
            "USD/BRL OTC",
            "EUR/USD",
            "EURUSD",
            "GBP/USD",
            "USD/INR",
            "USDINR"
        ];
        
        testPairTexts.forEach(text => {
            const extractedPairs = analyzer.extractTradingPairsFromText(text);
            console.log(`Text: "${text}" → Pairs: ${extractedPairs.length > 0 ? extractedPairs.map(p => p.pair).join(', ') : 'None'}`);
        });
        
        await analyzer.cleanup();
        console.log('\n✅ OCR debugging completed');
        
    } catch (error) {
        console.error('\n❌ OCR debugging failed:', error.message);
        console.error(error.stack);
    }
}

// Run the debug analysis
debugOCRExtraction();
