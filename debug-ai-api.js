// Debug AI API Test
const http = require('http');

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData, raw: responseData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, raw: responseData, parseError: e.message });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

async function debugTest() {
  console.log('🔍 Debugging AI API...\n');
  
  const testData = {
    symbol: 'EUR/USD',
    trade_duration: '5M',
    trade_mode: 'SCALPING',
    risk_per_trade: '1'
  };
  
  console.log('📤 Sending request:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest('/api/enhanced-ai-signal', testData);
    
    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Parse Error:', response.parseError || 'None');
    console.log('Raw Response Length:', response.raw.length);
    console.log('Raw Response (first 1000 chars):', response.raw.substring(0, 1000));
    
    if (response.data && typeof response.data === 'object') {
      console.log('\n📊 Parsed Data:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTest();