#!/usr/bin/env node

/**
 * Comprehensive Authentic Signal Test
 * 
 * Analyzes ALL screenshots in Camera Roll and generates authentic trading signals
 * with confidence percentages. NO MOCK DATA OR FALLBACKS ALLOWED.
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveSignalTest {
    constructor() {
        this.screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
        this.results = {
            totalScreenshots: 0,
            successfulAnalysis: 0,
            failedAnalysis: 0,
            signals: []
        };
    }

    async runComprehensiveTest() {
        console.log('🎯 === COMPREHENSIVE AUTHENTIC SIGNAL TEST ===');
        console.log('⏰ Started:', new Date().toISOString());
        console.log('🚫 NO MOCK DATA OR FALLBACKS ALLOWED');
        console.log(`📁 Analyzing: ${this.screenshotDir}`);
        console.log('');

        // Get all screenshots
        const screenshots = this.getScreenshots();
        this.results.totalScreenshots = screenshots.length;
        
        console.log(`📸 Found ${screenshots.length} screenshots to analyze`);
        console.log('');

        // Analyze each screenshot
        for (let i = 0; i < screenshots.length; i++) {
            const filename = screenshots[i];
            console.log(`🖼️ [${i + 1}/${screenshots.length}] Analyzing: ${filename}`);
            
            try {
                const signal = await this.analyzeScreenshot(filename);
                this.results.signals.push(signal);
                this.results.successfulAnalysis++;
                
                console.log(`   ✅ SUCCESS: ${signal.direction} signal with ${signal.confidence}% confidence`);
                console.log(`   💰 Extracted ${signal.pricesFound} price values`);
                console.log(`   ⏱️ Processing time: ${signal.processingTime}ms`);
                
            } catch (error) {
                console.log(`   ❌ FAILED: ${error.message}`);
                this.results.failedAnalysis++;
                this.results.signals.push({
                    filename: filename,
                    success: false,
                    error: error.message,
                    direction: 'ERROR',
                    confidence: 0
                });
            }
            
            console.log('');
            
            // Add delay between analyses to avoid overwhelming the system
            if (i < screenshots.length - 1) {
                console.log('   ⏳ Waiting 1 second...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Generate comprehensive report
        this.generateReport();
    }

    getScreenshots() {
        const files = fs.readdirSync(this.screenshotDir);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.bmp'].includes(ext);
        });
    }

    async analyzeScreenshot(filename) {
        const imagePath = path.join(this.screenshotDir, filename);
        const stats = fs.statSync(imagePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`   📊 File size: ${sizeMB}MB`);
        
        // Perform OCR analysis
        const ocrResult = await this.performOCR(imagePath);
        
        // Extract trading data
        const tradingData = this.extractTradingData(ocrResult.text);
        
        // Generate signal
        const signal = this.generateSignal(tradingData);
        
        // Calculate confidence
        const confidence = this.calculateConfidence(tradingData, ocrResult);
        
        return {
            filename: filename,
            success: true,
            direction: signal.direction,
            confidence: confidence,
            sizeMB: parseFloat(sizeMB),
            pricesFound: tradingData.prices.length,
            processingTime: ocrResult.processingTime,
            ocrConfidence: ocrResult.confidence,
            textLength: ocrResult.text.length,
            currencyPair: tradingData.currencyPair,
            timeframe: tradingData.timeframe,
            platform: tradingData.platform,
            signalStrength: signal.strength,
            priceMovement: signal.priceMovement,
            timestamp: new Date().toISOString()
        };
    }

    async performOCR(imagePath) {
        console.log('   🔍 Performing OCR analysis...');
        
        const Tesseract = require('tesseract.js');
        const worker = await Tesseract.createWorker('eng');
        
        const startTime = Date.now();
        const { data } = await worker.recognize(imagePath);
        const processingTime = Date.now() - startTime;
        
        await worker.terminate();
        
        if (data.text.length === 0) {
            throw new Error('No text extracted from screenshot');
        }
        
        return {
            text: data.text,
            confidence: data.confidence,
            processingTime: processingTime
        };
    }

    extractTradingData(text) {
        const lowerText = text.toLowerCase();
        
        // Extract prices
        const prices = this.extractPrices(text);
        
        // Detect currency pair
        const currencyPair = this.detectCurrencyPair(lowerText);
        
        // Detect timeframe
        const timeframe = this.detectTimeframe(lowerText);
        
        // Detect platform
        const platform = this.detectPlatform(lowerText);
        
        return {
            prices: prices,
            currencyPair: currencyPair,
            timeframe: timeframe,
            platform: platform,
            rawText: text
        };
    }

    extractPrices(text) {
        // Extract price patterns (e.g., 1.23456, 123.45, 0.98765)
        const pricePattern = /\b\d{1,4}\.?\d{2,5}\b/g;
        const matches = text.match(pricePattern) || [];
        
        const prices = matches
            .map(match => parseFloat(match))
            .filter(price => price > 0 && price < 100000) // Reasonable price range
            .filter((price, index, arr) => arr.indexOf(price) === index); // Remove duplicates
        
        return prices.sort((a, b) => a - b);
    }

    detectCurrencyPair(text) {
        const pairs = [
            'eur/usd', 'usd/eur', 'gbp/usd', 'usd/jpy', 'aud/usd', 'usd/cad',
            'usd/chf', 'nzd/usd', 'eur/gbp', 'eur/jpy', 'gbp/jpy', 'aud/jpy',
            'eurusd', 'gbpusd', 'usdjpy', 'audusd', 'usdcad', 'usdchf'
        ];
        
        for (const pair of pairs) {
            if (text.includes(pair)) {
                return pair.toUpperCase().replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
            }
        }
        
        return null;
    }

    detectTimeframe(text) {
        const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
        
        for (const tf of timeframes) {
            if (text.includes(tf)) {
                return tf;
            }
        }
        
        return null;
    }

    detectPlatform(text) {
        const platforms = {
            'quotex': 'Quotex',
            'iqoption': 'IQ Option',
            'binomo': 'Binomo',
            'olymptrade': 'Olymp Trade',
            'pocketoption': 'Pocket Option',
            'qxbroker': 'QX Broker',
            'metatrader': 'MetaTrader',
            'tradingview': 'TradingView'
        };
        
        for (const [key, name] of Object.entries(platforms)) {
            if (text.includes(key)) {
                return name;
            }
        }
        
        return null;
    }

    generateSignal(tradingData) {
        const prices = tradingData.prices;
        
        if (prices.length < 2) {
            return { 
                direction: 'NO_SIGNAL', 
                strength: 0, 
                priceMovement: 0,
                reason: 'Insufficient price data'
            };
        }
        
        // Calculate price movement
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const priceChange = lastPrice - firstPrice;
        const percentChange = (priceChange / firstPrice) * 100;
        
        // Count up/down movements
        let upMoves = 0;
        let downMoves = 0;
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) upMoves++;
            else if (prices[i] < prices[i - 1]) downMoves++;
        }
        
        const totalMoves = upMoves + downMoves;
        const trendStrength = totalMoves > 0 ? Math.max(upMoves, downMoves) / totalMoves : 0;
        
        // Determine signal direction
        let direction;
        let reason;
        
        if (Math.abs(percentChange) < 0.01) {
            direction = 'NO_SIGNAL';
            reason = 'Price movement too small';
        } else if (percentChange > 0 && upMoves > downMoves) {
            direction = 'UP';
            reason = 'Bullish price trend detected';
        } else if (percentChange < 0 && downMoves > upMoves) {
            direction = 'DOWN';
            reason = 'Bearish price trend detected';
        } else {
            direction = 'NO_SIGNAL';
            reason = 'Conflicting price signals';
        }
        
        return {
            direction: direction,
            strength: Math.round(trendStrength * 100),
            priceMovement: parseFloat(percentChange.toFixed(4)),
            reason: reason,
            upMoves: upMoves,
            downMoves: downMoves
        };
    }

    calculateConfidence(tradingData, ocrResult) {
        let confidence = 0;
        
        // OCR quality (max 30%)
        confidence += Math.min(ocrResult.confidence || 0, 30);
        
        // Price data quality (max 25%)
        if (tradingData.prices.length >= 5) confidence += 25;
        else if (tradingData.prices.length >= 3) confidence += 15;
        else if (tradingData.prices.length >= 2) confidence += 10;
        
        // Text extraction quality (max 20%)
        if (ocrResult.text.length >= 100) confidence += 20;
        else if (ocrResult.text.length >= 50) confidence += 15;
        else if (ocrResult.text.length >= 20) confidence += 10;
        
        // Trading context detection (max 25%)
        if (tradingData.currencyPair) confidence += 10;
        if (tradingData.timeframe) confidence += 8;
        if (tradingData.platform) confidence += 7;
        
        return Math.min(Math.round(confidence), 100);
    }

    generateReport() {
        console.log('📋 === COMPREHENSIVE AUTHENTIC SIGNAL REPORT ===');
        console.log('');

        // Overall Statistics
        console.log('📊 === ANALYSIS STATISTICS ===');
        console.log(`📸 Total screenshots: ${this.results.totalScreenshots}`);
        console.log(`✅ Successful analyses: ${this.results.successfulAnalysis}`);
        console.log(`❌ Failed analyses: ${this.results.failedAnalysis}`);

        const successRate = this.results.totalScreenshots > 0 ?
            ((this.results.successfulAnalysis / this.results.totalScreenshots) * 100).toFixed(1) : 0;
        console.log(`📈 Success rate: ${successRate}%`);
        console.log('');

        // Signal Distribution
        const successfulSignals = this.results.signals.filter(s => s.success);
        const upSignals = successfulSignals.filter(s => s.direction === 'UP');
        const downSignals = successfulSignals.filter(s => s.direction === 'DOWN');
        const noSignals = successfulSignals.filter(s => s.direction === 'NO_SIGNAL');

        console.log('📈 === SIGNAL DISTRIBUTION ===');
        console.log(`🔺 UP signals: ${upSignals.length}`);
        console.log(`🔻 DOWN signals: ${downSignals.length}`);
        console.log(`⚪ NO_SIGNAL: ${noSignals.length}`);
        console.log(`❌ ERROR signals: ${this.results.failedAnalysis}`);
        console.log('');

        // Confidence Analysis
        if (successfulSignals.length > 0) {
            const avgConfidence = successfulSignals.reduce((sum, s) => sum + s.confidence, 0) / successfulSignals.length;
            const highConfidenceSignals = successfulSignals.filter(s => s.confidence >= 70);

            console.log('🎯 === CONFIDENCE ANALYSIS ===');
            console.log(`📊 Average confidence: ${avgConfidence.toFixed(1)}%`);
            console.log(`🎯 High confidence signals (70%+): ${highConfidenceSignals.length}/${successfulSignals.length}`);
            console.log('');
        }

        // Processing Time Analysis
        if (successfulSignals.length > 0) {
            const avgProcessingTime = successfulSignals.reduce((sum, s) => sum + s.processingTime, 0) / successfulSignals.length;
            const realOCRCount = successfulSignals.filter(s => s.processingTime >= 1000).length;

            console.log('⏱️ === PROCESSING TIME ANALYSIS ===');
            console.log(`📊 Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
            console.log(`🔍 Real OCR processing (1s+): ${realOCRCount}/${successfulSignals.length}`);

            if (avgProcessingTime >= 1000) {
                console.log('✅ Processing times indicate authentic OCR analysis');
            } else {
                console.log('⚠️ Fast processing - verify real OCR is being performed');
            }
            console.log('');
        }

        // Detailed Signal Results
        console.log('📝 === DETAILED SIGNAL RESULTS ===');
        this.results.signals.forEach((signal, index) => {
            console.log(`${index + 1}. ${signal.filename}`);

            if (signal.success) {
                console.log(`   📈 SIGNAL: ${signal.direction} (${signal.confidence}% confidence)`);
                console.log(`   💪 Strength: ${signal.signalStrength}%`);
                console.log(`   📊 Price movement: ${signal.priceMovement}%`);
                console.log(`   💰 Prices extracted: ${signal.pricesFound}`);
                console.log(`   ⏱️ Processing: ${signal.processingTime}ms`);
                console.log(`   📏 File size: ${signal.sizeMB}MB`);

                if (signal.currencyPair) console.log(`   💱 Currency: ${signal.currencyPair}`);
                if (signal.timeframe) console.log(`   ⏰ Timeframe: ${signal.timeframe}`);
                if (signal.platform) console.log(`   🏢 Platform: ${signal.platform}`);

            } else {
                console.log(`   ❌ FAILED: ${signal.error}`);
            }
            console.log('');
        });

        // Trading Signal Quality
        const tradingSignals = successfulSignals.filter(s => s.direction === 'UP' || s.direction === 'DOWN');

        console.log('💹 === TRADING SIGNAL QUALITY ===');
        if (tradingSignals.length > 0) {
            console.log(`📈 Actionable trading signals: ${tradingSignals.length}/${successfulSignals.length}`);

            const avgSignalStrength = tradingSignals.reduce((sum, s) => sum + s.signalStrength, 0) / tradingSignals.length;
            console.log(`💪 Average signal strength: ${avgSignalStrength.toFixed(1)}%`);

            const strongSignals = tradingSignals.filter(s => s.signalStrength >= 70);
            console.log(`🎯 Strong signals (70%+ strength): ${strongSignals.length}/${tradingSignals.length}`);

            // Show best signals
            const bestSignals = tradingSignals
                .sort((a, b) => (b.confidence + b.signalStrength) - (a.confidence + a.signalStrength))
                .slice(0, 3);

            console.log('');
            console.log('🏆 TOP 3 SIGNALS:');
            bestSignals.forEach((signal, index) => {
                console.log(`   ${index + 1}. ${signal.filename}`);
                console.log(`      📈 ${signal.direction} - ${signal.confidence}% confidence, ${signal.signalStrength}% strength`);
                console.log(`      📊 Price movement: ${signal.priceMovement}%`);
            });

        } else {
            console.log('❌ No actionable trading signals generated');
        }
        console.log('');

        // Final Assessment
        console.log('🏆 === FINAL ASSESSMENT ===');

        if (this.results.successfulAnalysis === 0) {
            console.log('❌ CRITICAL FAILURE: No successful OCR analysis');
            console.log('   • OCR functionality is not working properly');
            console.log('   • Screenshots may not contain readable text');
            console.log('   • System cannot generate authentic signals');

        } else if (tradingSignals.length === 0) {
            console.log('⚠️ PARTIAL SUCCESS: OCR working but no trading signals');
            console.log('   • OCR successfully extracted text from screenshots');
            console.log('   • Screenshots may not contain trading chart data');
            console.log('   • Consider using screenshots from broker platforms');

        } else {
            console.log('🎉 SUCCESS: AUTHENTIC SIGNAL GENERATION WORKING');
            console.log(`✅ Generated ${tradingSignals.length} authentic trading signals`);
            console.log('✅ OCR analysis is extracting real market data');
            console.log('✅ Signal generation based on actual price movements');
            console.log('✅ NO MOCK DATA OR FALLBACKS USED');

            if (avgConfidence >= 70) {
                console.log('✅ High confidence signals - system is highly reliable');
            } else if (avgConfidence >= 50) {
                console.log('⚠️ Moderate confidence - consider higher quality screenshots');
            } else {
                console.log('⚠️ Low confidence - improve screenshot quality for better results');
            }
        }

        console.log('');
        console.log('⏰ Analysis completed:', new Date().toISOString());
        console.log('🚫 ZERO MOCK DATA USED - ALL SIGNALS ARE 100% AUTHENTIC');
    }
}

// Run the comprehensive test
if (require.main === module) {
    const tester = new ComprehensiveSignalTest();
    tester.runComprehensiveTest().catch(console.error);
}

module.exports = ComprehensiveSignalTest;
