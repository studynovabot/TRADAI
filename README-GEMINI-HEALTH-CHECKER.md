# 🔧 Gemini API Key Health Checker

A comprehensive Node.js tool for testing multiple Google Gemini API keys, providing health monitoring, failover capabilities, and production-ready reporting for AI trading systems.

## ✨ Features

- **Sequential Testing**: Tests multiple API keys one by one with configurable delays
- **Response Validation**: Validates both API functionality and response quality
- **Comprehensive Reporting**: JSON and table-style reports with detailed metrics
- **Failover Logic**: Production-ready failover implementation examples
- **Error Handling**: Robust timeout and error handling for all scenarios
- **Performance Monitoring**: Response time tracking and quality assessment
- **CLI Interface**: Command-line tool with multiple options
- **Module Support**: Can be imported and used in other Node.js applications

## 🚀 Quick Start

### 1. Run the Health Checker

```bash
# Basic health check
node gemini-api-health-checker.js

# Quick test with shorter timeouts
node gemini-api-health-checker.js --timeout 10 --wait 0.5

# Detailed test with report output
node gemini-api-health-checker.js --timeout 60 --wait 2 --output report.json

# Show help
node gemini-api-health-checker.js --help
```

### 2. Run the Test Suite

```bash
node test-gemini-health-checker.js
```

## 📊 Sample Output

```
🚀 Starting health check for 5 API keys...

🔍 Testing API key: AIzaSyBr9_N7QNQfxNI1J...
✅ API key working - Response time: 512ms

🔍 Testing API key: AIzaSyDvTH98GEAebeff7...
❌ API key failed - Quota exceeded

================================================================================
🔧 GEMINI API KEY HEALTH CHECK SUMMARY
================================================================================
 1. ✅ AIzaSyBr9_N7QNQfxNI1J...
    Status: Working
    Response Time: 512ms
    Sample: The stock market is volatile due to inflation data.

 2. ❌ AIzaSyDvTH98GEAebeff7...
    Status: Quota Exceeded
    Error: Quota exceeded or rate limited

📊 RESULTS: 3/5 keys working (60.0% success rate)
🎯 RECOMMENDED KEY: AIzaSyBr9_N7QNQfxNI1J...
================================================================================
```

## 🔧 Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--timeout <seconds>` | Request timeout in seconds | 30 |
| `--wait <seconds>` | Wait time between API calls | 1.0 |
| `--output <file>` | Output file for JSON report | None |
| `--test-mode` | Enable test mode | False |
| `--help` | Show help message | - |

## 📝 Using as a Module

```javascript
const { GeminiAPIHealthChecker } = require('./gemini-api-health-checker.js');

async function checkApiHealth() {
    const checker = new GeminiAPIHealthChecker({
        timeout: 15000,        // 15 seconds
        waitBetweenCalls: 500  // 0.5 seconds
    });
    
    // Run health check
    await checker.testAllKeys();
    
    // Get first working key
    const workingKey = checker.getWorkingKey();
    
    if (workingKey) {
        console.log(`Using API key: ${workingKey}`);
        // Use the key in your application
    }
    
    // Generate report
    const report = checker.generateReport('health-report.json');
    
    return checker.workingKeys; // Array of all working keys
}
```

## 🔄 Production Failover Implementation

```javascript
class ProductionGeminiClient {
    constructor(workingKeys) {
        this.apiKeys = workingKeys;
        this.currentKeyIndex = 0;
    }
    
    async makeRequest(prompt) {
        for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
            try {
                const apiKey = this.apiKeys[this.currentKeyIndex];
                const response = await this.callGeminiAPI(apiKey, prompt);
                return response;
            } catch (error) {
                console.log(`Key ${this.currentKeyIndex + 1} failed, trying next...`);
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                
                if (attempt === this.apiKeys.length - 1) {
                    throw new Error('All API keys failed');
                }
            }
        }
    }
}
```

## 📋 API Key Status Types

| Status | Description | Action |
|--------|-------------|--------|
| `working` | ✅ Key is functional and returns quality responses | Use in production |
| `quota_exceeded` | ⚠️ Key has exceeded quota or is rate limited | Wait or use backup |
| `invalid_key` | 🚫 Key is invalid or access is denied | Remove from rotation |
| `timeout` | ⏰ Request timed out | Check network or increase timeout |
| `network_error` | 🌐 Network connectivity issues | Retry later |
| `poor_quality` | ⚠️ Key works but responses are low quality | Use as last resort |

## 📊 Report Structure

```json
{
  "summary": {
    "total_keys_tested": 5,
    "working_keys": 3,
    "success_rate": "60.0%",
    "test_timestamp": "2025-07-30T10:30:00.000Z",
    "recommended_key": "AIzaSyBr9_N7QNQfxNI1J..."
  },
  "detailed_results": [
    {
      "api_key": "AIzaSyBr9_N7QNQfxNI1J...",
      "status": "working",
      "response_time": "512ms",
      "output_sample": "The stock market is volatile due to inflation data.",
      "response_length": 45,
      "timestamp": "2025-07-30T10:30:00.000Z"
    }
  ],
  "working_keys_order": [
    "AIzaSyBr9_N7QNQfxNI1J...",
    "AIzaSyD1pTVJno5wtscs...",
    "AIzaSyBusUTYXjsgXYrN..."
  ]
}
```

## 🎯 Integration with TRADAI System

This health checker is designed to integrate seamlessly with your TRADAI system:

```javascript
// In your trading system
const { GeminiAPIHealthChecker } = require('./gemini-api-health-checker.js');

class TradingAISystem {
    constructor() {
        this.geminiKeys = [];
        this.currentKeyIndex = 0;
    }
    
    async initialize() {
        // Check API health on startup
        const checker = new GeminiAPIHealthChecker();
        await checker.testAllKeys();
        
        this.geminiKeys = checker.workingKeys;
        
        if (this.geminiKeys.length === 0) {
            throw new Error('No working Gemini API keys available');
        }
        
        console.log(`✅ Trading system initialized with ${this.geminiKeys.length} working API keys`);
    }
    
    async analyzeChart(imageData) {
        // Use failover logic for chart analysis
        return await this.makeGeminiRequest(imageData);
    }
}
```

## 🛠️ Requirements

- Node.js 14.0.0 or higher
- No external dependencies (uses only Node.js built-in modules)
- Internet connection for API testing

## 📈 Performance Considerations

- **Rate Limiting**: Built-in delays between API calls to avoid rate limits
- **Timeout Handling**: Configurable timeouts to prevent hanging requests
- **Memory Efficient**: Minimal memory footprint for production use
- **Error Recovery**: Robust error handling for network issues

## 🔒 Security Notes

- API keys are only used for testing, never stored permanently
- All requests use HTTPS for secure communication
- No sensitive data is logged or saved to files
- Supports environment variable configuration for production

## 📞 Support

For issues related to the TRADAI system integration, refer to the main project documentation or create an issue in the repository.

---

**Built for TRADAI System** - Professional AI Trading Platform
