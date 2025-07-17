/**
 * API Key Verification Script
 * 
 * This script verifies all API keys in the .env file to ensure they're working properly.
 */

// Load environment variables from .env file
require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// API configurations
const API_CONFIGS = [
  {
    name: 'Twelve Data',
    key: process.env.TWELVE_DATA_API_KEY,
    testUrl: 'https://api.twelvedata.com/time_series',
    testParams: {
      symbol: 'EUR/USD',
      interval: '1min',
      outputsize: 1,
      apikey: process.env.TWELVE_DATA_API_KEY,
      format: 'JSON'
    },
    validateResponse: (response) => {
      return response.data && response.data.values && Array.isArray(response.data.values);
    }
  },
  {
    name: 'Groq',
    key: process.env.GROQ_API_KEY,
    testUrl: 'https://api.groq.com/openai/v1/chat/completions',
    testMethod: 'post',
    testHeaders: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    testData: {
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: 'Hello, this is a test message to verify the API key.' }],
      max_tokens: 10
    },
    validateResponse: (response) => {
      return response.data && response.data.choices && response.data.choices.length > 0;
    }
  },
  {
    name: 'Together AI',
    key: process.env.TOGETHER_API_KEY,
    testUrl: 'https://api.together.xyz/v1/completions',
    testMethod: 'post',
    testHeaders: {
      'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    testData: {
      model: 'togethercomputer/llama-2-7b',
      prompt: 'Hello, this is a test message to verify the API key.',
      max_tokens: 10
    },
    validateResponse: (response) => {
      return response.data && response.data.choices && response.data.choices.length > 0;
    }
  },
  {
    name: 'OpenRouter',
    key: process.env.OPENROUTER_API_KEY,
    testUrl: 'https://openrouter.ai/api/v1/chat/completions',
    testMethod: 'post',
    testHeaders: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    testData: {
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello, this is a test message to verify the API key.' }],
      max_tokens: 10
    },
    validateResponse: (response) => {
      return response.data && response.data.choices && response.data.choices.length > 0;
    }
  },
  {
    name: 'Fireworks',
    key: process.env.FIREWORKS_API_KEY,
    testUrl: 'https://api.fireworks.ai/inference/v1/completions',
    testMethod: 'post',
    testHeaders: {
      'Authorization': `Bearer ${process.env.FIREWORKS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    testData: {
      model: 'accounts/fireworks/models/llama-v2-7b',
      prompt: 'Hello, this is a test message to verify the API key.',
      max_tokens: 10
    },
    validateResponse: (response) => {
      return response.data && response.data.choices && response.data.choices.length > 0;
    }
  },
  {
    name: 'DeepInfra',
    key: process.env.DEEPINFRA_API_KEY,
    testUrl: 'https://api.deepinfra.com/v1/inference/meta-llama/Llama-2-7b-chat-hf',
    testMethod: 'post',
    testHeaders: {
      'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    testData: {
      input: 'Hello, this is a test message to verify the API key.',
      max_tokens: 10
    },
    validateResponse: (response) => {
      return response.data && response.data.results && response.data.results.length > 0;
    }
  }
];

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  summary: {
    total: API_CONFIGS.length,
    working: 0,
    failed: 0
  },
  details: []
};

/**
 * Verify all API keys
 */
async function verifyApiKeys() {
  console.log('🔑 Starting API Key Verification');
  console.log(`📊 Testing ${API_CONFIGS.length} API keys`);
  
  for (const config of API_CONFIGS) {
    try {
      console.log(`\n🔍 Testing ${config.name} API key...`);
      
      // Skip if no key is provided
      if (!config.key) {
        console.log(`⚠️ No API key found for ${config.name}`);
        results.details.push({
          name: config.name,
          status: 'MISSING',
          error: 'No API key provided'
        });
        results.summary.failed++;
        continue;
      }
      
      // Make API request
      const requestConfig = {
        method: config.testMethod || 'get',
        url: config.testUrl,
        timeout: 15000 // 15 second timeout
      };
      
      // Add headers if provided
      if (config.testHeaders) {
        requestConfig.headers = config.testHeaders;
      }
      
      // Add params for GET requests
      if (requestConfig.method === 'get' && config.testParams) {
        requestConfig.params = config.testParams;
      }
      
      // Add data for POST requests
      if (requestConfig.method === 'post' && config.testData) {
        requestConfig.data = config.testData;
      }
      
      console.log(`📡 Making ${requestConfig.method.toUpperCase()} request to ${requestConfig.url}`);
      
      const response = await axios(requestConfig);
      
      console.log(`✅ Received response: Status ${response.status}`);
      
      // Validate response
      const isValid = config.validateResponse ? config.validateResponse(response) : true;
      
      if (isValid) {
        console.log(`✅ ${config.name} API key is working properly`);
        results.details.push({
          name: config.name,
          status: 'WORKING',
          statusCode: response.status
        });
        results.summary.working++;
      } else {
        console.log(`❌ ${config.name} API key returned invalid response`);
        results.details.push({
          name: config.name,
          status: 'INVALID_RESPONSE',
          statusCode: response.status,
          error: 'Response validation failed'
        });
        results.summary.failed++;
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${config.name} API key:`, error.message);
      
      const errorDetail = {
        name: config.name,
        status: 'ERROR',
        error: error.message
      };
      
      if (error.response) {
        errorDetail.statusCode = error.response.status;
        errorDetail.responseData = error.response.data;
      }
      
      results.details.push(errorDetail);
      results.summary.failed++;
    }
    
    // Add a delay between requests to avoid rate limiting
    if (config !== API_CONFIGS[API_CONFIGS.length - 1]) {
      console.log('⏳ Waiting 2 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Save results
  const resultsFile = path.join(__dirname, 'test-results', 'api-key-verification.json');
  await fs.ensureDir(path.dirname(resultsFile));
  await fs.writeJson(resultsFile, results, { spaces: 2 });
  
  // Print summary
  console.log('\n📋 API Key Verification Summary:');
  console.log(`Total APIs: ${results.summary.total}`);
  console.log(`Working: ${results.summary.working}`);
  console.log(`Failed: ${results.summary.failed}`);
  
  console.log(`\n✅ Results saved to: ${resultsFile}`);
  
  return results;
}

// Run the verification
if (require.main === module) {
  verifyApiKeys()
    .then(() => {
      console.log('✅ API key verification completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyApiKeys };