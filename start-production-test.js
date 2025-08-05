/**
 * 🚀 Production Test Starter
 * Starts the server and runs comprehensive API tests
 */

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORTS_TO_TRY = [3000, 3001, 3002, 8080, 8081];
const MAX_STARTUP_TIME = 30000; // 30 seconds

async function startProductionTest() {
    console.log('🚀 PRODUCTION TEST STARTER');
    console.log('==========================\n');

    try {
        // Step 1: Find available port and start server
        console.log('🔍 Step 1: Finding available port and starting server...');
        const serverInfo = await startServer();
        
        if (!serverInfo.success) {
            console.log('❌ Failed to start server:', serverInfo.error);
            console.log('\n💡 Manual startup instructions:');
            console.log('1. Open a new terminal');
            console.log('2. Navigate to the project directory');
            console.log('3. Run: npm run dev');
            console.log('4. Wait for "Server running on port XXXX"');
            console.log('5. Run: node test-enhanced-api-endpoint.js');
            return;
        }

        console.log(`✅ Server started successfully on port ${serverInfo.port}`);
        console.log(`🌐 Server URL: http://localhost:${serverInfo.port}`);

        // Step 2: Wait for server to be fully ready
        console.log('\n🔍 Step 2: Waiting for server to be ready...');
        const serverReady = await waitForServer(serverInfo.port);
        
        if (!serverReady) {
            console.log('❌ Server failed to become ready within timeout');
            serverInfo.process.kill();
            return;
        }

        console.log('✅ Server is ready and responding');

        // Step 3: Run comprehensive API tests
        console.log('\n🔍 Step 3: Running comprehensive API tests...');
        
        // Update the test configuration
        process.env.TEST_BASE_URL = `http://localhost:${serverInfo.port}`;
        
        // Run the enhanced API endpoint test
        const { testEnhancedAPIEndpoint } = require('./test-enhanced-api-endpoint');
        const testResults = await testEnhancedAPIEndpoint();

        // Step 4: Generate final report
        console.log('\n🔍 Step 4: Generating final production report...');
        await generateProductionReport(testResults, serverInfo);

        // Step 5: Cleanup
        console.log('\n🔍 Step 5: Cleaning up...');
        serverInfo.process.kill();
        console.log('✅ Server stopped');

        // Final summary
        console.log('\n🎉 PRODUCTION TEST COMPLETED');
        console.log('============================');
        
        if (testResults.overallSuccess) {
            console.log('🏆 RESULT: PRODUCTION READY');
            console.log('✅ All tests passed successfully');
            console.log('✅ Enhanced features fully implemented');
            console.log('✅ Performance metrics within acceptable range');
        } else {
            console.log('⚠️ RESULT: NEEDS ATTENTION');
            console.log('📋 Some tests failed or features missing');
            console.log('📊 Check the detailed report for specific issues');
        }

    } catch (error) {
        console.error('❌ Production test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Start the server on an available port
 */
async function startServer() {
    for (const port of PORTS_TO_TRY) {
        try {
            const isPortFree = await checkPortAvailable(port);
            if (!isPortFree) {
                console.log(`⚠️ Port ${port} is already in use, trying next...`);
                continue;
            }

            console.log(`🚀 Starting server on port ${port}...`);
            
            // Try different startup commands
            const startCommands = [
                { cmd: 'npm', args: ['run', 'dev'] },
                { cmd: 'npm', args: ['start'] },
                { cmd: 'node', args: ['server.js'] },
                { cmd: 'node', args: ['app.js'] },
                { cmd: 'node', args: ['index.js'] }
            ];

            for (const command of startCommands) {
                try {
                    const serverProcess = spawn(command.cmd, command.args, {
                        cwd: __dirname,
                        env: { ...process.env, PORT: port.toString() },
                        stdio: ['pipe', 'pipe', 'pipe']
                    });

                    // Wait a bit to see if the process starts successfully
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    if (!serverProcess.killed && serverProcess.pid) {
                        return {
                            success: true,
                            port: port,
                            process: serverProcess,
                            command: `${command.cmd} ${command.args.join(' ')}`
                        };
                    }
                } catch (cmdError) {
                    console.log(`⚠️ Command ${command.cmd} ${command.args.join(' ')} failed:`, cmdError.message);
                    continue;
                }
            }

        } catch (error) {
            console.log(`⚠️ Failed to start server on port ${port}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'No available ports or startup commands worked'
    };
}

/**
 * Check if a port is available
 */
function checkPortAvailable(port) {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        
        server.on('error', () => resolve(false));
    });
}

/**
 * Wait for server to be ready
 */
function waitForServer(port, timeout = MAX_STARTUP_TIME) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkServer = () => {
            if (Date.now() - startTime > timeout) {
                resolve(false);
                return;
            }

            const req = http.get(`http://localhost:${port}/health`, { timeout: 2000 }, (res) => {
                if (res.statusCode === 200) {
                    resolve(true);
                } else {
                    setTimeout(checkServer, 1000);
                }
            });

            req.on('error', () => {
                setTimeout(checkServer, 1000);
            });

            req.on('timeout', () => {
                req.destroy();
                setTimeout(checkServer, 1000);
            });
        };

        // Start checking after a brief delay
        setTimeout(checkServer, 1000);
    });
}

/**
 * Generate production report
 */
async function generateProductionReport(testResults, serverInfo) {
    const productionReport = {
        timestamp: new Date().toISOString(),
        serverInfo: {
            port: serverInfo.port,
            command: serverInfo.command,
            startupTime: 'N/A'
        },
        testResults: testResults,
        productionReadiness: {
            serverStartup: serverInfo.success,
            apiEndpoints: testResults.overallSuccess,
            enhancedFeatures: testResults.enhancedFeatures?.overallScore >= 80,
            performance: testResults.performanceMetrics?.averageResponseTime < 5000,
            overall: testResults.overallSuccess
        },
        recommendations: generateRecommendations(testResults)
    };

    const reportPath = path.join(__dirname, `production-test-report-${Date.now()}.json`);
    require('fs').writeFileSync(reportPath, JSON.stringify(productionReport, null, 2));
    
    console.log(`📊 Production report saved: ${reportPath}`);
    return reportPath;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testResults) {
    const recommendations = [];

    if (!testResults.overallSuccess) {
        recommendations.push('❌ Fix failing API endpoint tests before production deployment');
    }

    if (testResults.enhancedFeatures?.overallScore < 80) {
        recommendations.push('⚠️ Improve enhanced features implementation (currently ' + testResults.enhancedFeatures.overallScore + '%)');
    }

    if (testResults.performanceMetrics?.averageResponseTime > 5000) {
        recommendations.push('⚡ Optimize response times (currently ' + testResults.performanceMetrics.averageResponseTime + 'ms)');
    }

    if (recommendations.length === 0) {
        recommendations.push('🎉 System is production ready! All tests passed successfully.');
    }

    return recommendations;
}

// Run if called directly
if (require.main === module) {
    startProductionTest().catch(console.error);
}

module.exports = { startProductionTest };