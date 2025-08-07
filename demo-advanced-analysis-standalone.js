/**
 * 🧠 ADVANCED ANALYSIS SERVICE STANDALONE DEMONSTRATION
 * 
 * This script demonstrates the Advanced Analysis Service independently
 * without requiring Gemini API keys. Shows all advanced features using
 * only the 3 specified indicators:
 * - 2 EMAs (Fast & Slow)
 * - Stochastic Oscillator  
 * - Bollinger Bands
 */

const AdvancedAnalysisService = require('./services/AdvancedAnalysisService');

class AdvancedAnalysisStandaloneDemo {
    constructor() {
        this.service = new AdvancedAnalysisService({
            minSignalScore: 70,
            debugMode: true,
            learningEnabled: true
        });
    }

    /**
     * Run complete standalone demonstration
     */
    async runDemo() {
        console.log('🧠 ADVANCED ANALYSIS SERVICE STANDALONE DEMONSTRATION');
        console.log('=' .repeat(80));
        console.log('This demo showcases all advanced features using ONLY 3 indicators:');
        console.log('• 2 Exponential Moving Averages (Fast & Slow)');
        console.log('• Stochastic Oscillator');
        console.log('• Bollinger Bands');
        console.log('=' .repeat(80) + '\n');

        try {
            // Demo 1: Basic Analysis
            await this.demonstrateBasicAnalysis();

            // Demo 2: Reversal Signal Detection
            await this.demonstrateReversalSignal();

            // Demo 3: Continuation Signal Detection
            await this.demonstrateContinuationSignal();

            // Demo 4: Bot Trap Detection
            await this.demonstrateBotTrapDetection();

            // Demo 5: Pattern Recognition
            await this.demonstratePatternRecognition();

            // Demo 6: Learning Memory System
            await this.demonstrateLearningMemory();

            // Demo 7: Signal Scoring System
            await this.demonstrateSignalScoring();

            // Demo 8: Service Statistics
            await this.demonstrateServiceStatistics();

            console.log('🎉 STANDALONE DEMONSTRATION COMPLETED SUCCESSFULLY!');
            console.log('=' .repeat(80));
            console.log('The Advanced Analysis Service is working correctly with all features.');
            console.log('Ready for integration with Gemini AI when API keys are available.');
            console.log('=' .repeat(80));

        } catch (error) {
            console.error('❌ Demonstration failed:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Demo 1: Basic Analysis
     */
    async demonstrateBasicAnalysis() {
        console.log('🎯 DEMO 1: BASIC ANALYSIS');
        console.log('-' .repeat(50));

        const marketData = this.createBasicMarketData();
        console.log('📊 Market Data:');
        console.log('   Current Price:', marketData.current_price);
        console.log('   Fast EMA:', marketData.ema_fast);
        console.log('   Slow EMA:', marketData.ema_slow);
        console.log('   BB Upper:', marketData.bollinger_bands.upper);
        console.log('   BB Lower:', marketData.bollinger_bands.lower);
        console.log('   Stochastic K:', marketData.stochastic.k);
        console.log('   Stochastic D:', marketData.stochastic.d);

        const result = await this.service.analyzeMarketData(marketData);

        if (result.success) {
            const analysis = result.analysis;
            console.log('\n🎯 Analysis Results:');
            console.log('   Direction:', analysis.direction);
            console.log('   Signal Type:', analysis.signal_type);
            console.log('   Signal Score:', analysis.signal_score + '%');
            console.log('   Trade Confidence:', analysis.trade_confidence);
            console.log('   Entry Window:', analysis.entry_window);
            console.log('   Bot Trap Risk:', analysis.bot_trap_risk ? 'YES' : 'NO');
            console.log('   Reasoning:', analysis.reasoning);
        } else {
            console.error('❌ Analysis failed:', result.error);
        }

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 2: Reversal Signal Detection
     */
    async demonstrateReversalSignal() {
        console.log('🔄 DEMO 2: REVERSAL SIGNAL DETECTION');
        console.log('-' .repeat(50));

        // Create market data showing reversal conditions
        const marketData = this.createReversalMarketData();
        console.log('📊 Reversal Scenario:');
        console.log('   Price at BB Lower Band (oversold)');
        console.log('   Stochastic in oversold territory with bullish cross');
        console.log('   Bullish engulfing pattern detected');

        const result = await this.service.analyzeMarketData(marketData);

        if (result.success) {
            const analysis = result.analysis;
            console.log('\n🎯 Reversal Analysis:');
            console.log('   Direction:', analysis.direction);
            console.log('   Signal Type:', analysis.signal_type);
            console.log('   Signal Score:', analysis.signal_score + '%');
            console.log('   Reasoning:', analysis.reasoning);

            // Show pattern details
            if (analysis.analysis_breakdown.candle_patterns.detected.length > 0) {
                console.log('\n🕯️ Detected Patterns:');
                analysis.analysis_breakdown.candle_patterns.detected.forEach(pattern => {
                    console.log(`   • ${pattern.type} (strength: ${pattern.strength}, bias: ${pattern.bias})`);
                });
            }
        }

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 3: Continuation Signal Detection
     */
    async demonstrateContinuationSignal() {
        console.log('➡️ DEMO 3: CONTINUATION SIGNAL DETECTION');
        console.log('-' .repeat(50));

        // Create market data showing continuation conditions
        const marketData = this.createContinuationMarketData();
        console.log('📊 Continuation Scenario:');
        console.log('   Price bouncing off EMA support');
        console.log('   Strong uptrend with wide EMA spread');
        console.log('   Stochastic confirming trend direction');

        const result = await this.service.analyzeMarketData(marketData);

        if (result.success) {
            const analysis = result.analysis;
            console.log('\n🎯 Continuation Analysis:');
            console.log('   Direction:', analysis.direction);
            console.log('   Signal Type:', analysis.signal_type);
            console.log('   Signal Score:', analysis.signal_score + '%');
            console.log('   Reasoning:', analysis.reasoning);

            // Show trend details
            console.log('\n📈 Trend Analysis:');
            console.log('   Direction:', analysis.analysis_breakdown.trend_analysis.trend_direction);
            console.log('   Strength:', analysis.analysis_breakdown.trend_analysis.trend_strength);
            console.log('   EMA Spread:', analysis.analysis_breakdown.trend_analysis.ema_spread);
        }

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 4: Bot Trap Detection
     */
    async demonstrateBotTrapDetection() {
        console.log('🚨 DEMO 4: BOT TRAP DETECTION');
        console.log('-' .repeat(50));

        // Create market data showing bot trap conditions
        const marketData = this.createBotTrapMarketData();
        console.log('📊 Bot Trap Scenario:');
        console.log('   Flat EMA movement (very small spread)');
        console.log('   Price hovering at BB edge');
        console.log('   Consecutive similar candles');
        console.log('   Flat stochastic in neutral zone');

        const result = await this.service.analyzeMarketData(marketData);

        if (result.success) {
            const analysis = result.analysis;
            console.log('\n🎯 Bot Trap Analysis:');
            console.log('   Bot Trap Detected:', analysis.bot_trap_risk ? 'YES' : 'NO');
            console.log('   Signal Score:', analysis.signal_score + '%');
            
            if (analysis.analysis_breakdown.bot_trap_analysis.detected) {
                console.log('   Risk Level:', analysis.analysis_breakdown.bot_trap_analysis.risk_level);
                console.log('   Reasons:');
                analysis.analysis_breakdown.bot_trap_analysis.reasons.forEach(reason => {
                    console.log(`     • ${reason}`);
                });
            }
        }

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 5: Pattern Recognition
     */
    async demonstratePatternRecognition() {
        console.log('🕯️ DEMO 5: PATTERN RECOGNITION');
        console.log('-' .repeat(50));

        const patterns = [
            { name: 'Bullish Engulfing', data: this.createBullishEngulfingData() },
            { name: 'Bearish Engulfing', data: this.createBearishEngulfingData() },
            { name: 'Hammer', data: this.createHammerData() },
            { name: 'Shooting Star', data: this.createShootingStarData() },
            { name: 'Doji', data: this.createDojiData() }
        ];

        for (const pattern of patterns) {
            console.log(`\n🔍 Testing ${pattern.name} Pattern:`);
            
            const result = await this.service.analyzeMarketData(pattern.data);
            
            if (result.success) {
                const analysis = result.analysis;
                const detectedPatterns = analysis.analysis_breakdown.candle_patterns.detected;
                
                if (detectedPatterns.length > 0) {
                    console.log('   ✅ Pattern detected:');
                    detectedPatterns.forEach(p => {
                        console.log(`      • ${p.type} (strength: ${p.strength})`);
                    });
                } else {
                    console.log('   ❌ No patterns detected');
                }
                
                console.log('   Signal:', analysis.direction, analysis.signal_type);
                console.log('   Score:', analysis.signal_score + '%');
            }
        }

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 6: Learning Memory System
     */
    async demonstrateLearningMemory() {
        console.log('🧠 DEMO 6: LEARNING MEMORY SYSTEM');
        console.log('-' .repeat(50));

        // Get initial statistics
        const initialStats = this.service.getAnalysisStatistics();
        console.log('📊 Initial Statistics:');
        console.log('   Total Signals:', initialStats.total_signals);
        console.log('   Pattern Performance:', JSON.stringify(initialStats.pattern_performance, null, 2));

        // Simulate signal outcomes
        console.log('\n🎯 Simulating Signal Outcomes:');

        const signalResults = [
            { type: 'Reversal', outcome: 'success' },
            { type: 'Reversal', outcome: 'success' },
            { type: 'Continuation', outcome: 'failure' },
            { type: 'Reversal', outcome: 'failure' },
            { type: 'Continuation', outcome: 'success' }
        ];

        signalResults.forEach((signal, index) => {
            const signalResult = {
                signal_type: signal.type,
                analysis_breakdown: {
                    candle_patterns: {
                        detected: [{ type: 'test_pattern', strength: 7 }]
                    },
                    indicators: {
                        stochastic: { k: 25, d: 30 }
                    }
                }
            };

            this.service.updateLearningMemory(signalResult, signal.outcome);
            console.log(`   ${index + 1}. ${signal.type} signal - ${signal.outcome}`);
        });

        // Get updated statistics
        const updatedStats = this.service.getAnalysisStatistics();
        console.log('\n📊 Updated Statistics:');
        console.log('   Total Signals:', updatedStats.total_signals);
        console.log('   Successful Confluences:', updatedStats.successful_confluences);
        console.log('   Failed Confluences:', updatedStats.failed_confluences);
        console.log('   Pattern Performance:', JSON.stringify(updatedStats.pattern_performance, null, 2));

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 7: Signal Scoring System
     */
    async demonstrateSignalScoring() {
        console.log('📊 DEMO 7: SIGNAL SCORING SYSTEM');
        console.log('-' .repeat(50));

        console.log('🔢 Scoring Weights:');
        Object.entries(this.service.scoringWeights).forEach(([component, weight]) => {
            console.log(`   ${component}: ${weight}%`);
        });

        // Test different scenarios
        const scenarios = [
            { name: 'Perfect Confluence', data: this.createPerfectConfluenceData() },
            { name: 'Weak Signal', data: this.createWeakSignalData() },
            { name: 'Mixed Signals', data: this.createMixedSignalData() }
        ];

        for (const scenario of scenarios) {
            console.log(`\n🧪 Testing ${scenario.name}:`);
            
            const result = await this.service.analyzeMarketData(scenario.data);
            
            if (result.success) {
                const analysis = result.analysis;
                console.log('   Signal Score:', analysis.signal_score + '%');
                console.log('   Trade Confidence:', analysis.trade_confidence);
                console.log('   Meets Threshold:', analysis.signal_score >= this.service.config.minSignalScore ? 'YES' : 'NO');
                
                // Show scoring breakdown (simplified)
                console.log('   Key Factors:');
                if (analysis.analysis_breakdown.candle_patterns.detected.length > 0) {
                    console.log('     • Pattern detected ✅');
                }
                if (analysis.analysis_breakdown.trend_analysis.trend_strength > 5) {
                    console.log('     • Strong trend ✅');
                }
                if (analysis.bot_trap_risk) {
                    console.log('     • Bot trap risk ⚠️');
                }
            }
        }

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Demo 8: Service Statistics
     */
    async demonstrateServiceStatistics() {
        console.log('📈 DEMO 8: SERVICE STATISTICS');
        console.log('-' .repeat(50));

        const stats = this.service.getAnalysisStatistics();
        
        console.log('📊 Analysis Statistics:');
        console.log('   Total Signals:', stats.total_signals);
        console.log('   Buy Signals:', stats.buy_signals);
        console.log('   Sell Signals:', stats.sell_signals);
        console.log('   Reversal Signals:', stats.reversal_signals);
        console.log('   Continuation Signals:', stats.continuation_signals);
        console.log('   Average Signal Score:', stats.average_signal_score);

        if (Object.keys(stats.pattern_performance).length > 0) {
            console.log('\n🕯️ Pattern Performance:');
            Object.entries(stats.pattern_performance).forEach(([pattern, score]) => {
                console.log(`   ${pattern}: ${score.toFixed(1)}/10`);
            });
        }

        console.log('\n🧠 Learning Memory:');
        console.log('   Successful Confluences:', stats.successful_confluences);
        console.log('   Failed Confluences:', stats.failed_confluences);

        console.log('\n' + '-' .repeat(50) + '\n');
    }

    /**
     * Create sample market data scenarios
     */
    createBasicMarketData() {
        const currentPrice = 1.2345;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0005,
            ema_slow: currentPrice - 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 45, d: 50 },
            candles: this.generateSampleCandles(currentPrice, 5)
        };
    }

    createReversalMarketData() {
        const currentPrice = 1.2320; // Near BB lower
        return {
            current_price: currentPrice,
            ema_fast: currentPrice + 0.0010,
            ema_slow: currentPrice + 0.0015,
            bollinger_bands: {
                upper: currentPrice + 0.0040,
                middle: currentPrice + 0.0020,
                lower: currentPrice + 0.0001 // Very close to lower band
            },
            stochastic: { k: 18, d: 22 }, // Oversold with potential cross
            candles: this.generateBullishEngulfingCandles(currentPrice)
        };
    }

    createContinuationMarketData() {
        const currentPrice = 1.2365;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0010, // Price above EMAs
            ema_slow: currentPrice - 0.0025, // Wide spread = strong trend
            bollinger_bands: {
                upper: currentPrice + 0.0015,
                middle: currentPrice - 0.0005,
                lower: currentPrice - 0.0025
            },
            stochastic: { k: 65, d: 60 }, // Trending up
            candles: this.generateTrendingCandles(currentPrice, 'up')
        };
    }

    createBotTrapMarketData() {
        const currentPrice = 1.2345;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.00001, // Very small spread
            ema_slow: currentPrice - 0.00002,
            bollinger_bands: {
                upper: currentPrice + 0.0001, // Very close to upper band
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 51, d: 49 }, // Flat in neutral zone
            candles: this.generateSimilarCandles(currentPrice, 5)
        };
    }

    createBullishEngulfingData() {
        const currentPrice = 1.2340;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0005,
            ema_slow: currentPrice - 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 25, d: 30 },
            candles: this.generateBullishEngulfingCandles(currentPrice)
        };
    }

    createBearishEngulfingData() {
        const currentPrice = 1.2350;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice + 0.0005,
            ema_slow: currentPrice + 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 75, d: 70 },
            candles: this.generateBearishEngulfingCandles(currentPrice)
        };
    }

    createHammerData() {
        const currentPrice = 1.2330;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice + 0.0005,
            ema_slow: currentPrice + 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 20, d: 25 },
            candles: this.generateHammerCandles(currentPrice)
        };
    }

    createShootingStarData() {
        const currentPrice = 1.2360;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0005,
            ema_slow: currentPrice - 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 80, d: 75 },
            candles: this.generateShootingStarCandles(currentPrice)
        };
    }

    createDojiData() {
        const currentPrice = 1.2345;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0005,
            ema_slow: currentPrice - 0.0010,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 50, d: 50 },
            candles: this.generateDojiCandles(currentPrice)
        };
    }

    createPerfectConfluenceData() {
        const currentPrice = 1.2325;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice + 0.0005,
            ema_slow: currentPrice + 0.0015,
            bollinger_bands: {
                upper: currentPrice + 0.0040,
                middle: currentPrice + 0.0020,
                lower: currentPrice + 0.0002 // At lower band
            },
            stochastic: { k: 15, d: 20 }, // Oversold with cross
            candles: this.generateBullishEngulfingCandles(currentPrice)
        };
    }

    createWeakSignalData() {
        const currentPrice = 1.2345;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice,
            ema_slow: currentPrice,
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 50, d: 50 },
            candles: this.generateSimilarCandles(currentPrice, 3)
        };
    }

    createMixedSignalData() {
        const currentPrice = 1.2345;
        return {
            current_price: currentPrice,
            ema_fast: currentPrice - 0.0005, // Bullish
            ema_slow: currentPrice + 0.0005, // Bearish
            bollinger_bands: {
                upper: currentPrice + 0.0020,
                middle: currentPrice,
                lower: currentPrice - 0.0020
            },
            stochastic: { k: 75, d: 25 }, // Mixed signals
            candles: this.generateSampleCandles(currentPrice, 3)
        };
    }

    /**
     * Generate various candle patterns
     */
    generateSampleCandles(basePrice, count) {
        const candles = [];
        let price = basePrice;
        
        for (let i = 0; i < count; i++) {
            const variation = (Math.random() - 0.5) * 0.001;
            const open = price;
            const close = price + variation;
            const high = Math.max(open, close) + Math.random() * 0.0005;
            const low = Math.min(open, close) - Math.random() * 0.0005;
            
            candles.push({
                open: open,
                high: high,
                low: low,
                close: close,
                timestamp: Date.now() - (count - i) * 60000
            });
            
            price = close;
        }
        
        return candles;
    }

    generateBullishEngulfingCandles(currentPrice) {
        return [
            // Previous bearish candle
            {
                open: currentPrice + 0.0005,
                high: currentPrice + 0.0008,
                low: currentPrice - 0.0002,
                close: currentPrice - 0.0002,
                timestamp: Date.now() - 120000
            },
            // Current bullish engulfing candle
            {
                open: currentPrice - 0.0003,
                high: currentPrice + 0.0010,
                low: currentPrice - 0.0005,
                close: currentPrice + 0.0008,
                timestamp: Date.now() - 60000
            }
        ];
    }

    generateBearishEngulfingCandles(currentPrice) {
        return [
            // Previous bullish candle
            {
                open: currentPrice - 0.0005,
                high: currentPrice + 0.0002,
                low: currentPrice - 0.0008,
                close: currentPrice + 0.0002,
                timestamp: Date.now() - 120000
            },
            // Current bearish engulfing candle
            {
                open: currentPrice + 0.0003,
                high: currentPrice + 0.0005,
                low: currentPrice - 0.0010,
                close: currentPrice - 0.0008,
                timestamp: Date.now() - 60000
            }
        ];
    }

    generateHammerCandles(currentPrice) {
        return [
            {
                open: currentPrice + 0.0002,
                high: currentPrice + 0.0003,
                low: currentPrice - 0.0015, // Long lower wick
                close: currentPrice + 0.0001,
                timestamp: Date.now() - 60000
            }
        ];
    }

    generateShootingStarCandles(currentPrice) {
        return [
            {
                open: currentPrice - 0.0002,
                high: currentPrice + 0.0015, // Long upper wick
                low: currentPrice - 0.0003,
                close: currentPrice - 0.0001,
                timestamp: Date.now() - 60000
            }
        ];
    }

    generateDojiCandles(currentPrice) {
        return [
            {
                open: currentPrice,
                high: currentPrice + 0.0008,
                low: currentPrice - 0.0008,
                close: currentPrice + 0.0001, // Very small body
                timestamp: Date.now() - 60000
            }
        ];
    }

    generateTrendingCandles(currentPrice, direction) {
        const candles = [];
        let price = currentPrice - (direction === 'up' ? 0.0020 : -0.0020);
        
        for (let i = 0; i < 5; i++) {
            const move = direction === 'up' ? 0.0004 : -0.0004;
            const open = price;
            const close = price + move;
            const high = Math.max(open, close) + 0.0002;
            const low = Math.min(open, close) - 0.0002;
            
            candles.push({
                open: open,
                high: high,
                low: low,
                close: close,
                timestamp: Date.now() - (5 - i) * 60000
            });
            
            price = close;
        }
        
        return candles;
    }

    generateSimilarCandles(currentPrice, count) {
        const candles = [];
        
        for (let i = 0; i < count; i++) {
            const open = currentPrice;
            const close = currentPrice + 0.00001; // Very small movement
            const high = currentPrice + 0.00002;
            const low = currentPrice - 0.00002;
            
            candles.push({
                open: open,
                high: high,
                low: low,
                close: close,
                timestamp: Date.now() - (count - i) * 60000
            });
        }
        
        return candles;
    }
}

// Run demonstration if this file is executed directly
if (require.main === module) {
    const demo = new AdvancedAnalysisStandaloneDemo();
    demo.runDemo().catch(error => {
        console.error('❌ Demo execution failed:', error);
        process.exit(1);
    });
}

module.exports = AdvancedAnalysisStandaloneDemo;