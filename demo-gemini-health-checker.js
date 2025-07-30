#!/usr/bin/env node

/**
 * Demo Gemini API Health Checker
 * ==============================
 * 
 * Demonstrates the health checker functionality with mock responses
 * Perfect for testing the logic without making actual API calls
 */

const { GeminiAPIHealthChecker } = require('./gemini-api-health-checker.js');

// Mock the HTTPS request for demonstration
function createMockChecker() {
    const checker = new GeminiAPIHealthChecker({
        timeout: 5000,
        waitBetweenCalls: 100
    });
    
    // Override the makeHttpsRequest method for demo purposes
    checker.makeHttpsRequest = async function(apiKey, payload) {
        // Simulate different responses based on API key
        const keyIndex = this.apiKeys.indexOf(apiKey);
        
        // Simulate response delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
        
        switch (keyIndex) {
            case 0: // First key - working
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        candidates: [{
                            content: {
                                parts: [{
                                    text: "The stock market is experiencing volatility today due to recent inflation data releases, which have created uncertainty among investors."
                                }]
                            }
                        }]
                    })
                };
            
            case 1: // Second key - quota exceeded
                return {
                    statusCode: 429,
                    body: JSON.stringify({
                        error: {
                            code: 429,
                            message: "Quota exceeded"
                        }
                    })
                };
            
            case 2: // Third key - working but slower
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        candidates: [{
                            content: {
                                parts: [{
                                    text: "Stock market volatility is linked to inflation concerns."
                                }]
                            }
                        }]
                    })
                };
            
            case 3: // Fourth key - invalid
                return {
                    statusCode: 403,
                    body: JSON.stringify({
                        error: {
                            code: 403,
                            message: "API key not valid"
                        }
                    })
                };
            
            case 4: // Fifth key - working
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        candidates: [{
                            content: {
                                parts: [{
                                    text: "Today's stock market shows volatility due to inflation data affecting investor sentiment and trading patterns."
                                }]
                            }
                        }]
                    })
                };
            
            default:
                throw new Error('Network error');
        }
    };
    
    return checker;
}

async function runDemo() {
    console.log('🎭 Gemini API Health Checker Demo');
    console.log('==================================\n');
    console.log('This demo simulates API responses to show how the health checker works.\n');
    
    try {
        const checker = createMockChecker();
        
        // Run the health check
        console.log('🚀 Starting simulated health check...\n');
        await checker.testAllKeys();
        
        // Generate and display report
        const report = checker.generateReport('demo-health-report.json');
        checker.printSummaryTable();
        
        // Show working keys
        console.log('\n🔄 Working Keys for Failover:');
        if (checker.workingKeys.length > 0) {
            checker.workingKeys.forEach((key, index) => {
                console.log(`${index + 1}. ${key.substring(0, 20)}... (Priority: ${index === 0 ? 'Primary' : 'Backup'})`);
            });
        } else {
            console.log('❌ No working keys found');
        }
        
        // Show example integration code
        console.log('\n💡 Example Production Integration:');
        console.log('```javascript');
        console.log('const { GeminiAPIHealthChecker } = require("./gemini-api-health-checker.js");');
        console.log('');
        console.log('async function initializeAI() {');
        console.log('    const checker = new GeminiAPIHealthChecker();');
        console.log('    await checker.testAllKeys();');
        console.log('    ');
        console.log('    const workingKey = checker.getWorkingKey();');
        console.log('    if (!workingKey) {');
        console.log('        throw new Error("No working Gemini API keys available");');
        console.log('    }');
        console.log('    ');
        console.log('    return workingKey;');
        console.log('}');
        console.log('```');
        
        console.log('\n✅ Demo completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Run: node gemini-api-health-checker.js (for real API testing)');
        console.log('2. Check: demo-health-report.json (for detailed results)');
        console.log('3. Integrate: Use the working keys in your TRADAI system');
        
    } catch (error) {
        console.error(`💥 Demo failed: ${error.message}`);
    }
}

// Show usage instructions
function showUsage() {
    console.log('\n📚 Usage Instructions:');
    console.log('======================');
    console.log('');
    console.log('1. Demo Mode (simulated responses):');
    console.log('   node demo-gemini-health-checker.js');
    console.log('');
    console.log('2. Real API Testing:');
    console.log('   node gemini-api-health-checker.js');
    console.log('');
    console.log('3. Quick Test (single key):');
    console.log('   node quick-gemini-test.js');
    console.log('');
    console.log('4. Custom Options:');
    console.log('   node gemini-api-health-checker.js --timeout 60 --wait 2 --output report.json');
    console.log('');
    console.log('5. Module Usage:');
    console.log('   const { GeminiAPIHealthChecker } = require("./gemini-api-health-checker.js");');
    console.log('');
}

if (require.main === module) {
    runDemo().then(() => {
        showUsage();
    });
}
