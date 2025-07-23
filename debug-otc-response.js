/**
 * Debug OTC response to see what's actually being returned
 */

const axios = require('axios');

async function debugOTCResponse() {
    const baseUrl = 'https://tradai-jli03th3t-ranveer-singh-rajputs-projects.vercel.app';
    
    console.log('🔍 === DEBUGGING OTC RESPONSE ===');
    console.log(`🌐 Production URL: ${baseUrl}`);
    console.log(`⏰ Debug Started: ${new Date().toISOString()}\n`);

    try {
        console.log('📊 Making OTC signal request...');
        
        const response = await axios.post(`${baseUrl}/api/otc-signal-generator`, {
            currencyPair: 'USD/PKR',
            timeframe: '5m',
            tradeDuration: '5'
        }, {
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Response received');
        console.log('📋 Full Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Check specific fields
        console.log('\n🔍 Key Fields Analysis:');
        console.log(`Signal: ${response.data.signal}`);
        console.log(`Confidence: ${response.data.confidence}`);
        console.log(`Success: ${response.data.success}`);
        console.log(`Strict Mode: ${response.data.strictMode}`);
        console.log(`Data Source: ${response.data.metadata?.dataSource}`);
        console.log(`Analysis Method: ${response.data.metadata?.analysisMethod}`);
        console.log(`Unique ID: ${response.data.metadata?.uniqueId}`);
        console.log(`Timestamp: ${response.data.metadata?.timestamp}`);

        if (response.data.technicalIndicators) {
            console.log('\n📊 Technical Indicators:');
            console.log(`RSI: ${response.data.technicalIndicators.rsi}`);
            console.log(`MACD: ${JSON.stringify(response.data.technicalIndicators.macd)}`);
            console.log(`Trend: ${response.data.technicalIndicators.trend}`);
            console.log(`Volatility: ${response.data.technicalIndicators.volatility}`);
            console.log(`Data Source: ${response.data.technicalIndicators.dataSource}`);
        }

        if (response.data.metadata) {
            console.log('\n🔗 Metadata:');
            console.log(`Bullish Strength: ${response.data.metadata.bullishStrength}`);
            console.log(`Bearish Strength: ${response.data.metadata.bearishStrength}`);
            console.log(`Total Strength: ${response.data.metadata.totalStrength}`);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the debug
if (require.main === module) {
    debugOTCResponse().catch(console.error);
}

module.exports = debugOTCResponse;
