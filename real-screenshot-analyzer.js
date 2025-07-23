#!/usr/bin/env node

/**
 * REAL Screenshot Analyzer - NO FAKE SIGNALS
 * 
 * This system will ONLY analyze what's actually visible in screenshots.
 * If OCR fails or data is insufficient, it will FAIL and tell you why.
 * ZERO MOCK DATA - ZERO FAKE SIGNALS
 */

const fs = require('fs');
const path = require('path');

class RealScreenshotAnalyzer {
    constructor() {
        this.screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
        this.minConfidenceForSignal = 70; // High threshold to avoid false signals
    }

    async analyzeRealScreenshots() {
        console.log('🔍 === REAL SCREENSHOT ANALYZER ===');
        console.log('⏰ Started:', new Date().toISOString());
        console.log('🚫 ZERO FAKE SIGNALS - ONLY REAL ANALYSIS');
        console.log('');

        // Get actual screenshots
        const screenshots = this.getActualScreenshots();
        console.log(`📸 Found ${screenshots.length} screenshots in directory`);
        
        if (screenshots.length === 0) {
            console.log('❌ CRITICAL ERROR: No screenshots found in Camera Roll');
            console.log('📁 Directory checked:', this.screenshotDir);
            return { success: false, error: 'No screenshots found' };
        }

        console.log('📋 Available screenshots:');
        screenshots.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });
        console.log('');

        // Analyze each screenshot individually with REAL OCR
        const results = [];
        
        for (let i = 0; i < Math.min(3, screenshots.length); i++) {
            const filename = screenshots[i];
            const filepath = path.join(this.screenshotDir, filename);
            
            console.log(`🖼️ [${i + 1}] REAL ANALYSIS: ${filename}`);
            
            try {
                const analysis = await this.performRealOCRAnalysis(filepath, filename);
                results.push(analysis);
                
                // Show what was ACTUALLY found
                this.displayRealFindings(analysis);
                
            } catch (error) {
                console.log(`   ❌ ANALYSIS FAILED: ${error.message}`);
                results.push({
                    filename: filename,
                    success: false,
                    error: error.message,
                    canGenerateSignal: false
                });
            }
            
            console.log('');
        }

        // Generate REAL assessment
        this.generateRealAssessment(results);
        
        return { success: true, results: results };
    }

    getActualScreenshots() {
        try {
            const files = fs.readdirSync(this.screenshotDir);
            return files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg'].includes(ext);
            });
        } catch (error) {
            console.log(`❌ ERROR: Cannot access directory ${this.screenshotDir}`);
            console.log(`   Error: ${error.message}`);
            return [];
        }
    }

    async performRealOCRAnalysis(imagePath, filename) {
        console.log('   🔍 Performing REAL OCR analysis...');
        
        const Tesseract = require('tesseract.js');
        const worker = await Tesseract.createWorker('eng');
        
        const startTime = Date.now();
        const { data } = await worker.recognize(imagePath);
        const processingTime = Date.now() - startTime;
        
        await worker.terminate();
        
        console.log(`   ⏱️ OCR processing time: ${processingTime}ms`);
        console.log(`   📊 OCR confidence: ${data.confidence.toFixed(1)}%`);
        console.log(`   📝 Text extracted: ${data.text.length} characters`);
        
        // Show actual extracted text sample
        const textSample = data.text.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   📄 Text sample: "${textSample}${data.text.length > 100 ? '...' : ''}"`);
        
        // REAL analysis of what was found
        const realAnalysis = this.analyzeExtractedText(data.text, data.confidence);
        
        return {
            filename: filename,
            success: true,
            ocrConfidence: data.confidence,
            processingTime: processingTime,
            textLength: data.text.length,
            extractedText: data.text,
            analysis: realAnalysis,
            canGenerateSignal: this.canGenerateRealSignal(realAnalysis, data.confidence)
        };
    }

    analyzeExtractedText(text, ocrConfidence) {
        const analysis = {
            currencyPair: null,
            timeframe: null,
            platform: null,
            prices: [],
            indicators: {},
            tradingElements: []
        };

        const lowerText = text.toLowerCase();
        
        // REAL currency pair detection
        const currencyPatterns = [
            { pattern: /eur\s*\/?\s*usd/i, pair: 'EUR/USD' },
            { pattern: /gbp\s*\/?\s*usd/i, pair: 'GBP/USD' },
            { pattern: /usd\s*\/?\s*jpy/i, pair: 'USD/JPY' },
            { pattern: /aud\s*\/?\s*usd/i, pair: 'AUD/USD' },
            { pattern: /usd\s*\/?\s*cad/i, pair: 'USD/CAD' },
            { pattern: /eurusd/i, pair: 'EUR/USD' },
            { pattern: /gbpusd/i, pair: 'GBP/USD' },
            { pattern: /usdjpy/i, pair: 'USD/JPY' }
        ];

        for (const { pattern, pair } of currencyPatterns) {
            if (pattern.test(text)) {
                analysis.currencyPair = pair;
                break;
            }
        }

        // REAL timeframe detection
        const timeframePatterns = [
            { pattern: /\b1m\b/i, timeframe: '1m' },
            { pattern: /\b3m\b/i, timeframe: '3m' },
            { pattern: /\b5m\b/i, timeframe: '5m' },
            { pattern: /\b15m\b/i, timeframe: '15m' },
            { pattern: /\b30m\b/i, timeframe: '30m' },
            { pattern: /\b1h\b/i, timeframe: '1h' }
        ];

        for (const { pattern, timeframe } of timeframePatterns) {
            if (pattern.test(text)) {
                analysis.timeframe = timeframe;
                break;
            }
        }

        // REAL platform detection
        const platformPatterns = [
            { pattern: /quotex/i, platform: 'Quotex' },
            { pattern: /iq\s*option/i, platform: 'IQ Option' },
            { pattern: /binomo/i, platform: 'Binomo' },
            { pattern: /pocket\s*option/i, platform: 'Pocket Option' },
            { pattern: /olymp\s*trade/i, platform: 'Olymp Trade' }
        ];

        for (const { pattern, platform } of platformPatterns) {
            if (pattern.test(text)) {
                analysis.platform = platform;
                break;
            }
        }

        // REAL price extraction
        const pricePattern = /\b\d{1,4}\.?\d{2,5}\b/g;
        const priceMatches = text.match(pricePattern) || [];
        
        analysis.prices = priceMatches
            .map(match => parseFloat(match))
            .filter(price => price > 0 && price < 100000)
            .filter((price, index, arr) => arr.indexOf(price) === index);

        // REAL indicator detection
        const rsiMatch = text.match(/rsi[:\s]*(\d{1,3}\.?\d*)/i);
        if (rsiMatch) {
            const rsiValue = parseFloat(rsiMatch[1]);
            if (rsiValue >= 0 && rsiValue <= 100) {
                analysis.indicators.rsi = rsiValue;
            }
        }

        const macdMatch = text.match(/macd[:\s]*(-?\d+\.?\d*)/i);
        if (macdMatch) {
            analysis.indicators.macd = parseFloat(macdMatch[1]);
        }

        // Detect trading-related terms
        const tradingTerms = ['call', 'put', 'buy', 'sell', 'signal', 'trade', 'profit', 'loss', 'candle', 'chart'];
        analysis.tradingElements = tradingTerms.filter(term => lowerText.includes(term));

        return analysis;
    }

    canGenerateRealSignal(analysis, ocrConfidence) {
        const requirements = {
            minOCRConfidence: 40,
            minPrices: 3,
            needsCurrencyPair: true,
            needsPlatform: false // Platform detection is optional
        };

        const issues = [];

        if (ocrConfidence < requirements.minOCRConfidence) {
            issues.push(`OCR confidence too low (${ocrConfidence.toFixed(1)}% < ${requirements.minOCRConfidence}%)`);
        }

        if (!analysis.currencyPair && requirements.needsCurrencyPair) {
            issues.push('No currency pair detected in screenshot');
        }

        if (analysis.prices.length < requirements.minPrices) {
            issues.push(`Insufficient price data (${analysis.prices.length} prices < ${requirements.minPrices} required)`);
        }

        if (analysis.tradingElements.length === 0) {
            issues.push('No trading-related elements detected - may not be a trading chart');
        }

        return {
            canGenerate: issues.length === 0,
            issues: issues,
            requirements: requirements
        };
    }

    displayRealFindings(analysis) {
        console.log('   📊 === REAL FINDINGS ===');
        
        if (analysis.analysis.currencyPair) {
            console.log(`   💱 Currency Pair: ${analysis.analysis.currencyPair}`);
        } else {
            console.log(`   ❌ Currency Pair: NOT DETECTED`);
        }

        if (analysis.analysis.timeframe) {
            console.log(`   ⏰ Timeframe: ${analysis.analysis.timeframe}`);
        } else {
            console.log(`   ❌ Timeframe: NOT DETECTED`);
        }

        if (analysis.analysis.platform) {
            console.log(`   🏢 Platform: ${analysis.analysis.platform}`);
        } else {
            console.log(`   ❌ Platform: NOT DETECTED`);
        }

        console.log(`   💰 Prices Found: ${analysis.analysis.prices.length}`);
        if (analysis.analysis.prices.length > 0) {
            console.log(`   📈 Price Range: ${Math.min(...analysis.analysis.prices)} - ${Math.max(...analysis.analysis.prices)}`);
        }

        if (Object.keys(analysis.analysis.indicators).length > 0) {
            console.log(`   📊 Indicators Found:`);
            Object.entries(analysis.analysis.indicators).forEach(([indicator, value]) => {
                console.log(`      ${indicator.toUpperCase()}: ${value}`);
            });
        } else {
            console.log(`   ❌ Indicators: NONE DETECTED`);
        }

        if (analysis.analysis.tradingElements.length > 0) {
            console.log(`   🎯 Trading Elements: ${analysis.analysis.tradingElements.join(', ')}`);
        } else {
            console.log(`   ❌ Trading Elements: NONE DETECTED`);
        }

        // Signal generation assessment
        console.log('   🎯 === SIGNAL GENERATION ASSESSMENT ===');
        if (analysis.canGenerateSignal.canGenerate) {
            console.log('   ✅ CAN GENERATE SIGNAL: All requirements met');
        } else {
            console.log('   ❌ CANNOT GENERATE SIGNAL:');
            analysis.canGenerateSignal.issues.forEach(issue => {
                console.log(`      • ${issue}`);
            });
        }
    }

    generateRealAssessment(results) {
        console.log('🏆 === REAL ASSESSMENT SUMMARY ===');
        console.log('');

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const canGenerateSignals = successful.filter(r => r.canGenerateSignal.canGenerate);

        console.log(`📊 Screenshots analyzed: ${results.length}`);
        console.log(`✅ Successful OCR: ${successful.length}`);
        console.log(`❌ Failed OCR: ${failed.length}`);
        console.log(`🎯 Can generate signals: ${canGenerateSignals.length}`);
        console.log('');

        if (canGenerateSignals.length === 0) {
            console.log('❌ === CRITICAL: NO SIGNALS CAN BE GENERATED ===');
            console.log('');
            console.log('🚫 REASONS:');
            
            successful.forEach((result, index) => {
                console.log(`📸 Screenshot ${index + 1} (${result.filename}):`);
                if (!result.canGenerateSignal.canGenerate) {
                    result.canGenerateSignal.issues.forEach(issue => {
                        console.log(`   • ${issue}`);
                    });
                }
                console.log('');
            });

            console.log('💡 === RECOMMENDATIONS ===');
            console.log('1. 📸 Take higher quality screenshots with clear text');
            console.log('2. 💱 Ensure currency pair is clearly visible in the screenshot');
            console.log('3. 📊 Make sure trading charts with price data are visible');
            console.log('4. 🏢 Use screenshots from recognized trading platforms');
            console.log('5. 📈 Include technical indicators (RSI, MACD) if possible');
            console.log('');
            console.log('🚫 NO TRADING SIGNALS WILL BE PROVIDED - INSUFFICIENT DATA');
            
        } else {
            console.log('✅ === SIGNALS CAN BE GENERATED ===');
            console.log('');
            console.log(`🎯 ${canGenerateSignals.length} screenshot(s) have sufficient data for signal generation`);
            
            // Show what currency pairs and timeframes were detected
            const detectedPairs = canGenerateSignals.map(r => r.analysis.currencyPair).filter(p => p);
            const detectedTimeframes = canGenerateSignals.map(r => r.analysis.timeframe).filter(t => t);
            
            if (detectedPairs.length > 0) {
                console.log(`💱 Currency pairs detected: ${[...new Set(detectedPairs)].join(', ')}`);
            }
            if (detectedTimeframes.length > 0) {
                console.log(`⏰ Timeframes detected: ${[...new Set(detectedTimeframes)].join(', ')}`);
            }
            
            console.log('');
            console.log('✅ READY FOR SIGNAL GENERATION');
        }

        console.log('');
        console.log('⏰ Analysis completed:', new Date().toISOString());
        console.log('🔍 This analysis is based ONLY on what was actually found in your screenshots');
        console.log('🚫 NO FAKE DATA OR MOCK SIGNALS WERE GENERATED');
    }
}

// Run the real analyzer
if (require.main === module) {
    const analyzer = new RealScreenshotAnalyzer();
    analyzer.analyzeRealScreenshots()
        .then(results => {
            if (results.success) {
                console.log('');
                console.log('✅ Real analysis completed');
            } else {
                console.log('');
                console.log('❌ Analysis failed:', results.error);
            }
        })
        .catch(error => {
            console.error('❌ CRITICAL ERROR:', error.message);
        });
}

module.exports = RealScreenshotAnalyzer;
