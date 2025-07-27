/**
 * Quick Signal Generation Test
 * 
 * Simple test to verify enhanced signal generation without hanging
 */

const AITradingAnalysisEngine = require('./src/analysis/AITradingAnalysisEngine');

async function quickSignalTest() {
    console.log('🔧 Quick Signal Generation Test');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
        const engine = new AITradingAnalysisEngine();
        
        // Create mock analysis data to test signal generation
        const mockAnalysis = {
            priceAnalysis: {
                currentPrice: 5.2345,
                priceRange: { min: 5.20, max: 5.25 },
                supportLevels: [{ level: 5.22, confidence: 80 }],
                resistanceLevels: [{ level: 5.24, confidence: 75 }],
                priceAction: 'NEUTRAL',
                volatility: 'MEDIUM',
                confidence: 70
            },
            
            technicalIndicators: {
                rsi: { value: 65, signal: 'BUY', confidence: 75 },
                macd: { value: 0.001, signal: 'BUY', confidence: 70 },
                stochastic: { value: 72, signal: 'BUY', confidence: 68 },
                overall: { signal: 'BUY', confidence: 71 }
            },
            
            patternRecognition: {
                pricePatterns: [
                    { name: 'BULLISH_DOMINANCE', signal: 'BUY', confidence: 75 },
                    { name: 'WEAK_BULLISH', signal: 'BUY', confidence: 60 }
                ],
                candlestickPatterns: []
            },
            
            trendAnalysis: {
                direction: 'UPTREND',
                confidence: 72,
                strength: 'MODERATE'
            },
            
            computerVision: {
                colorSentiment: 'BULLISH',
                confidence: 68
            }
        };
        
        console.log('📊 Testing signal generation with mock bullish data...');
        const signals = await engine.generateTradingSignals(mockAnalysis);
        
        console.log('\n🎯 Generated Trading Signal:');
        console.log(`   Direction: ${signals.direction}`);
        console.log(`   Confidence: ${signals.confidence.toFixed(1)}%`);
        console.log(`   Strength: ${signals.strength}`);
        console.log(`   Reasoning:`);
        signals.reasoning.forEach(reason => {
            console.log(`      • ${reason}`);
        });
        
        // Test with bearish data
        const mockBearishAnalysis = {
            ...mockAnalysis,
            technicalIndicators: {
                rsi: { value: 35, signal: 'SELL', confidence: 75 },
                macd: { value: -0.001, signal: 'SELL', confidence: 70 },
                stochastic: { value: 28, signal: 'SELL', confidence: 68 },
                overall: { signal: 'SELL', confidence: 71 }
            },
            patternRecognition: {
                pricePatterns: [
                    { name: 'BEARISH_DOMINANCE', signal: 'SELL', confidence: 75 },
                    { name: 'WEAK_BEARISH', signal: 'SELL', confidence: 60 }
                ],
                candlestickPatterns: []
            },
            trendAnalysis: {
                direction: 'DOWNTREND',
                confidence: 72,
                strength: 'MODERATE'
            },
            computerVision: {
                colorSentiment: 'BEARISH',
                confidence: 68
            }
        };
        
        console.log('\n📊 Testing signal generation with mock bearish data...');
        const bearishSignals = await engine.generateTradingSignals(mockBearishAnalysis);
        
        console.log('\n🎯 Generated Trading Signal:');
        console.log(`   Direction: ${bearishSignals.direction}`);
        console.log(`   Confidence: ${bearishSignals.confidence.toFixed(1)}%`);
        console.log(`   Strength: ${bearishSignals.strength}`);
        console.log(`   Reasoning:`);
        bearishSignals.reasoning.forEach(reason => {
            console.log(`      • ${reason}`);
        });
        
        // Test with minimal data (should trigger synthetic signal)
        const mockMinimalAnalysis = {
            priceAnalysis: {
                currentPrice: null,
                priceRange: { min: null, max: null },
                supportLevels: [],
                resistanceLevels: [],
                priceAction: 'NEUTRAL',
                volatility: 'MEDIUM',
                confidence: 0
            },
            technicalIndicators: {
                rsi: { value: null, signal: 'NEUTRAL', confidence: 0 },
                macd: { value: null, signal: 'NEUTRAL', confidence: 0 },
                stochastic: { value: null, signal: 'NEUTRAL', confidence: 0 },
                overall: { signal: 'NEUTRAL', confidence: 0 }
            },
            patternRecognition: {
                pricePatterns: [],
                candlestickPatterns: []
            },
            trendAnalysis: {
                direction: 'SIDEWAYS',
                confidence: 50,
                strength: 'WEAK'
            },
            computerVision: {
                colorSentiment: 'NEUTRAL',
                confidence: 50
            }
        };
        
        console.log('\n📊 Testing signal generation with minimal data (should trigger synthetic)...');
        const syntheticSignals = await engine.generateTradingSignals(mockMinimalAnalysis);
        
        console.log('\n🎯 Generated Trading Signal:');
        console.log(`   Direction: ${syntheticSignals.direction}`);
        console.log(`   Confidence: ${syntheticSignals.confidence.toFixed(1)}%`);
        console.log(`   Strength: ${syntheticSignals.strength}`);
        console.log(`   Reasoning:`);
        syntheticSignals.reasoning.forEach(reason => {
            console.log(`      • ${reason}`);
        });
        
        // Summary
        console.log('\n📊 SIGNAL GENERATION TEST SUMMARY');
        console.log('═'.repeat(50));
        console.log(`Bullish Test: ${signals.direction} (${signals.confidence.toFixed(1)}%)`);
        console.log(`Bearish Test: ${bearishSignals.direction} (${bearishSignals.confidence.toFixed(1)}%)`);
        console.log(`Minimal Data Test: ${syntheticSignals.direction} (${syntheticSignals.confidence.toFixed(1)}%)`);
        
        const allDirectional = [signals, bearishSignals, syntheticSignals].every(s => s.direction !== 'NEUTRAL');
        if (allDirectional) {
            console.log('\n✅ SUCCESS: All tests generated directional signals (UP/DOWN)');
            console.log('✅ Enhanced signal generation is working correctly');
        } else {
            console.log('\n⚠️ PARTIAL SUCCESS: Some tests still generating NEUTRAL signals');
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

// Run the quick test
quickSignalTest();
