#!/usr/bin/env node

/**
 * 🔧 Gemini API Key Health Checker with Failover Testing (Node.js)
 * ================================================================
 * 
 * This script tests multiple Google Gemini API keys for health, quota, and response quality.
 * Provides comprehensive reporting and failover capabilities for production AI pipelines.
 * 
 * Features:
 * - Sequential testing of multiple API keys
 * - Response validation and quality assessment
 * - Detailed JSON and table-style reporting
 * - Timeout and error handling
 * - Production-ready failover logic
 * - Response time monitoring
 * 
 * Author: AI Coder Assistant
 * Date: 2025-07-30
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class GeminiAPIHealthChecker {
    constructor(options = {}) {
        this.timeout = options.timeout || 30000; // 30 seconds
        this.waitBetweenCalls = options.waitBetweenCalls || 1000; // 1 second
        this.baseUrl = 'generativelanguage.googleapis.com';
        this.testPrompt = "Summarize this sentence: The stock market is volatile today due to inflation data.";
        this.modelName = 'gemini-1.5-flash'; // Updated to current model name
        
        // Test results storage
        this.results = [];
        this.workingKeys = [];
        
        // API keys to test
        this.apiKeys = [
            "AIzaSyBr9_N7QNQfxNI1JIEjd-l0qnyN61IfulE",
            "AIzaSyDvTH98GEAebeff7iUx7NQuIYK68dqz4Ek",
            "AIzaSyD1pTVJno5wtscsglp4jCLA9r3aodByPa8",
            "AIzaSyBusUTYXjsgXYrNMMQinAVsrrIiaJZfTtA",
            "AIzaSyCgSvIzxbRWwIlae90z1-SlcS15npl33gU"
        ];
    }

    /**
     * Test a single API key for functionality and response quality
     */
    async testApiKey(apiKey) {
        console.log(`🔍 Testing API key: ${apiKey.substring(0, 20)}...`);
        
        const startTime = Date.now();
        const result = {
            api_key: apiKey,
            status: "unknown",
            response_time: null,
            error: null,
            output_sample: null,
            response_length: 0,
            timestamp: new Date().toISOString()
        };

        try {
            const payload = {
                contents: [{
                    parts: [{
                        text: this.testPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 100
                }
            };

            const response = await this.makeHttpsRequest(apiKey, payload);
            const responseTime = Date.now() - startTime;
            result.response_time = `${responseTime}ms`;

            if (response.statusCode === 200) {
                const responseData = JSON.parse(response.body);
                
                if (responseData.candidates && responseData.candidates.length > 0) {
                    const content = responseData.candidates[0].content.parts[0].text;
                    result.output_sample = content.length > 100 ? content.substring(0, 100) + "..." : content;
                    result.response_length = content.length;
                    
                    if (this.validateResponseQuality(content)) {
                        result.status = "working";
                        console.log(`✅ API key working - Response time: ${responseTime}ms`);
                        this.workingKeys.push(apiKey);
                    } else {
                        result.status = "poor_quality";
                        result.error = "Response quality below threshold";
                        console.log(`⚠️ API key working but poor quality response`);
                    }
                } else {
                    result.status = "error";
                    result.error = "No content in response";
                    console.log(`❌ API key failed - No content in response`);
                }
            } else if (response.statusCode === 429) {
                result.status = "quota_exceeded";
                result.error = "Quota exceeded or rate limited";
                console.log(`❌ API key failed - Quota exceeded`);
            } else if (response.statusCode === 403) {
                result.status = "invalid_key";
                result.error = "Invalid API key or access denied";
                console.log(`❌ API key failed - Invalid or access denied`);
            } else {
                result.status = "error";
                result.error = `HTTP ${response.statusCode}: ${response.body.substring(0, 200)}`;
                console.log(`❌ API key failed - HTTP ${response.statusCode}`);
            }

        } catch (error) {
            if (error.code === 'TIMEOUT') {
                result.status = "timeout";
                result.error = `Request timeout after ${this.timeout}ms`;
                console.log(`❌ API key failed - Timeout`);
            } else {
                result.status = "network_error";
                result.error = `Network error: ${error.message}`;
                console.log(`❌ API key failed - Network error: ${error.message}`);
            }
        }

        return result;
    }

    /**
     * Make HTTPS request to Gemini API
     */
    makeHttpsRequest(apiKey, payload) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            const path = `/v1beta/models/${this.modelName}:generateContent?key=${apiKey}`;
            
            const options = {
                hostname: this.baseUrl,
                port: 443,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: this.timeout
            };

            const req = https.request(options, (res) => {
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        body: body
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                const timeoutError = new Error('Request timeout');
                timeoutError.code = 'TIMEOUT';
                reject(timeoutError);
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Validate the quality of the API response
     */
    validateResponseQuality(content) {
        if (!content || content.trim().length < 10) {
            return false;
        }

        const lowerContent = content.toLowerCase();
        const qualityIndicators = [
            lowerContent.includes("stock market"),
            lowerContent.includes("volatile") || lowerContent.includes("volatility"),
            lowerContent.includes("inflation"),
            content.split(' ').length >= 5 // At least 5 words
        ];

        return qualityIndicators.filter(Boolean).length >= 2;
    }

    /**
     * Test all API keys sequentially
     */
    async testAllKeys() {
        console.log(`🚀 Starting health check for ${this.apiKeys.length} API keys...\n`);
        
        for (let i = 0; i < this.apiKeys.length; i++) {
            console.log(`Testing key ${i + 1}/${this.apiKeys.length}`);
            
            const result = await this.testApiKey(this.apiKeys[i]);
            this.results.push(result);
            
            // Wait between calls to avoid rate limiting
            if (i < this.apiKeys.length - 1) {
                await this.sleep(this.waitBetweenCalls);
            }
            
            console.log(''); // Empty line for readability
        }
        
        console.log(`✅ Health check completed. ${this.workingKeys.length} working keys found.\n`);
        return this.results;
    }

    /**
     * Get the first working API key
     */
    getWorkingKey() {
        return this.workingKeys.length > 0 ? this.workingKeys[0] : null;
    }

    /**
     * Generate comprehensive health check report
     */
    generateReport(outputFile = null) {
        const workingCount = this.workingKeys.length;
        const totalCount = this.results.length;
        
        const report = {
            summary: {
                total_keys_tested: totalCount,
                working_keys: workingCount,
                success_rate: totalCount > 0 ? `${(workingCount/totalCount*100).toFixed(1)}%` : "0%",
                test_timestamp: new Date().toISOString(),
                recommended_key: this.getWorkingKey()
            },
            detailed_results: this.results,
            working_keys_order: this.workingKeys
        };

        // Save to file if specified
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
            console.log(`📄 Report saved to ${outputFile}`);
        }

        return report;
    }

    /**
     * Print a formatted summary table to console
     */
    printSummaryTable() {
        console.log("=".repeat(80));
        console.log("🔧 GEMINI API KEY HEALTH CHECK SUMMARY");
        console.log("=".repeat(80));

        this.results.forEach((result, index) => {
            const statusEmoji = {
                "working": "✅",
                "error": "❌",
                "quota_exceeded": "⚠️",
                "invalid_key": "🚫",
                "timeout": "⏰",
                "network_error": "🌐",
                "poor_quality": "⚠️"
            }[result.status] || "❓";

            const keyDisplay = result.api_key.length > 20 ? 
                result.api_key.substring(0, 20) + "..." : result.api_key;

            console.log(`${(index + 1).toString().padStart(2)}. ${statusEmoji} ${keyDisplay}`);
            console.log(`    Status: ${result.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);

            if (result.response_time) {
                console.log(`    Response Time: ${result.response_time}`);
            }

            if (result.error) {
                console.log(`    Error: ${result.error}`);
            } else if (result.output_sample) {
                console.log(`    Sample: ${result.output_sample}`);
            }

            console.log('');
        });

        const workingCount = this.workingKeys.length;
        const totalCount = this.results.length;
        const successRate = totalCount > 0 ? (workingCount/totalCount*100).toFixed(1) : 0;

        console.log(`📊 RESULTS: ${workingCount}/${totalCount} keys working (${successRate}% success rate)`);

        if (this.workingKeys.length > 0) {
            console.log(`🎯 RECOMMENDED KEY: ${this.workingKeys[0].substring(0, 20)}...`);
        } else {
            console.log("⚠️  NO WORKING KEYS FOUND");
        }

        console.log("=".repeat(80));
    }

    /**
     * Sleep utility function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Main function to run the API health checker
 */
async function main() {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--timeout':
                options.timeout = parseInt(args[++i]) * 1000; // Convert to milliseconds
                break;
            case '--wait':
                options.waitBetweenCalls = parseFloat(args[++i]) * 1000; // Convert to milliseconds
                break;
            case '--output':
                options.outputFile = args[++i];
                break;
            case '--test-mode':
                options.testMode = true;
                break;
            case '--help':
                console.log(`
🔧 Gemini API Key Health Checker

Usage: node gemini-api-health-checker.js [options]

Options:
  --timeout <seconds>    Request timeout in seconds (default: 30)
  --wait <seconds>       Wait time between API calls (default: 1.0)
  --output <file>        Output file for JSON report
  --test-mode           Enable test mode
  --help                Show this help message

Example:
  node gemini-api-health-checker.js --timeout 60 --wait 2 --output report.json
                `);
                process.exit(0);
        }
    }

    // Initialize health checker
    const checker = new GeminiAPIHealthChecker(options);

    try {
        // Run health check
        const results = await checker.testAllKeys();
        
        // Generate and display report
        const report = checker.generateReport(options.outputFile);
        checker.printSummaryTable();

        // Return appropriate exit code
        const workingKeys = checker.workingKeys.length;
        if (workingKeys === 0) {
            console.error("❌ No working API keys found!");
            process.exit(1);
        } else if (workingKeys < checker.apiKeys.length / 2) {
            console.warn("⚠️ Less than half of the API keys are working");
            process.exit(2);
        } else {
            console.log("✅ Health check completed successfully");
            process.exit(0);
        }

    } catch (error) {
        console.error(`💥 Unexpected error during health check: ${error.message}`);
        process.exit(1);
    }
}

// Handle process interruption
process.on('SIGINT', () => {
    console.log('\n🛑 Health check interrupted by user');
    process.exit(130);
});

// Run the main function if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error(`💥 Fatal error: ${error.message}`);
        process.exit(1);
    });
}

// Export for use as a module
module.exports = { GeminiAPIHealthChecker };
