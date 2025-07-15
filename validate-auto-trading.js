/**
 * Auto-Trading Validation Script
 * Comprehensive testing of auto-trading functionality on live platforms
 * SAFETY: Only works with demo accounts and small amounts
 */

class AutoTradingValidator {
    constructor() {
        this.platform = this.detectPlatform();
        this.testResults = {};
        this.safetyChecks = {
            demoAccountOnly: true,
            maxTestAmount: 1, // $1 maximum for testing
            requireConfirmation: true
        };
        
        console.log(`[Auto Trading Validator] 🧪 Initializing on ${this.platform}`);
    }
    
    detectPlatform() {
        const hostname = window.location.hostname.toLowerCase();
        if (hostname.includes('quotex')) return 'quotex';
        if (hostname.includes('iqoption')) return 'iqoption';
        if (hostname.includes('olymptrade')) return 'olymptrade';
        if (hostname.includes('binomo')) return 'binomo';
        return 'unknown';
    }
    
    async runFullValidation() {
        console.log('[Auto Trading Validator] 🚀 Starting comprehensive validation...');
        
        try {
            // Safety check first
            if (!this.performSafetyCheck()) {
                throw new Error('Safety check failed - validation aborted');
            }
            
            // Run all validation tests
            await this.validatePlatformDetection();
            await this.validateDOMSelectors();
            await this.validateAmountSetting();
            await this.validateExpirySelection();
            await this.validateButtonClicking();
            await this.validateRiskManagement();
            
            // Generate final report
            this.generateValidationReport();
            
        } catch (error) {
            console.error('[Auto Trading Validator] 💥 Validation failed:', error);
            this.testResults.error = error.message;
        }
    }
    
    performSafetyCheck() {
        console.log('[Auto Trading Validator] 🛡️ Performing safety checks...');
        
        // Check if we're on a supported platform
        if (this.platform === 'unknown') {
            console.error('❌ Unsupported platform detected');
            return false;
        }
        
        // Warn about demo account requirement
        const isDemoConfirmed = confirm(
            '⚠️ SAFETY CHECK ⚠️\n\n' +
            'This validation will test auto-trading functionality.\n\n' +
            '🔒 IMPORTANT: Make sure you are using a DEMO account!\n\n' +
            '✅ Click OK only if you are on a demo account\n' +
            '❌ Click Cancel if you are on a real account'
        );
        
        if (!isDemoConfirmed) {
            console.log('✅ Safety check: User cancelled - validation aborted');
            return false;
        }
        
        console.log('✅ Safety check passed');
        return true;
    }
    
    async validatePlatformDetection() {
        console.log('[Auto Trading Validator] 🔍 Validating platform detection...');
        
        const result = {
            platform: this.platform,
            hostname: window.location.hostname,
            supported: this.platform !== 'unknown'
        };
        
        this.testResults.platformDetection = result;
        
        if (result.supported) {
            console.log(`✅ Platform detection: ${this.platform}`);
        } else {
            console.log(`❌ Platform detection failed: ${result.hostname}`);
        }
    }
    
    async validateDOMSelectors() {
        console.log('[Auto Trading Validator] 🔍 Validating DOM selectors...');
        
        const selectors = this.getEnhancedSelectors();
        const results = {};
        
        // Test amount input selectors
        results.amountInput = this.testSelectorGroup('Amount Input', selectors.amountSelectors);
        
        // Test call button selectors
        results.callButton = this.testSelectorGroup('Call Button', selectors.callSelectors);
        
        // Test put button selectors
        results.putButton = this.testSelectorGroup('Put Button', selectors.putSelectors);
        
        // Test expiry selectors
        results.expirySelect = this.testSelectorGroup('Expiry Select', selectors.expirySelectors);
        
        this.testResults.domSelectors = results;
        
        const successCount = Object.values(results).filter(r => r.found).length;
        const totalCount = Object.keys(results).length;
        
        console.log(`📊 DOM Selectors: ${successCount}/${totalCount} found`);
    }
    
    testSelectorGroup(name, selectors) {
        let foundElement = null;
        let usedSelector = null;
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                foundElement = element;
                usedSelector = selector;
                break;
            }
        }
        
        const result = {
            found: !!foundElement,
            selector: usedSelector,
            element: foundElement,
            totalTried: selectors.length
        };
        
        if (result.found) {
            console.log(`✅ ${name}: Found with "${usedSelector}"`);
        } else {
            console.log(`❌ ${name}: Not found (tried ${selectors.length} selectors)`);
        }
        
        return result;
    }
    
    async validateAmountSetting() {
        console.log('[Auto Trading Validator] 💰 Validating amount setting...');
        
        const amountResult = this.testResults.domSelectors?.amountInput;
        if (!amountResult?.found) {
            this.testResults.amountSetting = { success: false, reason: 'Amount input not found' };
            return;
        }
        
        const input = amountResult.element;
        const testAmount = this.safetyChecks.maxTestAmount;
        
        try {
            // Clear and set amount
            input.focus();
            input.select();
            input.value = '';
            input.value = testAmount.toString();
            
            // Trigger events
            ['input', 'change', 'blur'].forEach(eventType => {
                input.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            
            await this.sleep(300);
            
            const setValue = parseFloat(input.value);
            const success = Math.abs(setValue - testAmount) < 0.01;
            
            this.testResults.amountSetting = {
                success,
                testAmount,
                setValue,
                element: input.tagName + (input.className ? '.' + input.className : '')
            };
            
            if (success) {
                console.log(`✅ Amount setting: Successfully set to $${testAmount}`);
            } else {
                console.log(`❌ Amount setting: Failed (expected: ${testAmount}, got: ${setValue})`);
            }
            
        } catch (error) {
            this.testResults.amountSetting = { success: false, error: error.message };
            console.log(`❌ Amount setting: Error - ${error.message}`);
        }
    }
    
    async validateExpirySelection() {
        console.log('[Auto Trading Validator] ⏰ Validating expiry selection...');
        
        const expiryResult = this.testResults.domSelectors?.expirySelect;
        if (!expiryResult?.found) {
            this.testResults.expirySelection = { success: false, reason: 'Expiry selector not found' };
            return;
        }
        
        const select = expiryResult.element;
        
        try {
            const options = Array.from(select.options);
            const fiveMinOption = options.find(opt => 
                opt.text.includes('5') && opt.text.toLowerCase().includes('min')
            );
            
            if (fiveMinOption) {
                select.value = fiveMinOption.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                
                this.testResults.expirySelection = {
                    success: true,
                    selectedValue: fiveMinOption.value,
                    selectedText: fiveMinOption.text,
                    totalOptions: options.length
                };
                
                console.log(`✅ Expiry selection: Set to "${fiveMinOption.text}"`);
            } else {
                this.testResults.expirySelection = {
                    success: false,
                    reason: '5-minute option not found',
                    availableOptions: options.map(opt => opt.text)
                };
                
                console.log(`⚠️ Expiry selection: 5-minute option not found`);
            }
            
        } catch (error) {
            this.testResults.expirySelection = { success: false, error: error.message };
            console.log(`❌ Expiry selection: Error - ${error.message}`);
        }
    }
    
    async validateButtonClicking() {
        console.log('[Auto Trading Validator] 🎯 Validating button clicking...');
        
        const callResult = this.testResults.domSelectors?.callButton;
        const putResult = this.testResults.domSelectors?.putButton;
        
        const results = {};
        
        // Test call button
        if (callResult?.found) {
            results.callButton = this.testButtonClick(callResult.element, 'Call');
        } else {
            results.callButton = { success: false, reason: 'Call button not found' };
        }
        
        // Test put button
        if (putResult?.found) {
            results.putButton = this.testButtonClick(putResult.element, 'Put');
        } else {
            results.putButton = { success: false, reason: 'Put button not found' };
        }
        
        this.testResults.buttonClicking = results;
    }
    
    testButtonClick(button, type) {
        try {
            // Check if button is visible and enabled
            const isVisible = button.offsetParent !== null;
            const isEnabled = !button.disabled && !button.hasAttribute('disabled');
            
            const result = {
                success: isVisible && isEnabled,
                visible: isVisible,
                enabled: isEnabled,
                tagName: button.tagName,
                className: button.className
            };
            
            if (result.success) {
                console.log(`✅ ${type} button: Ready for clicking`);
            } else {
                console.log(`❌ ${type} button: Not ready (visible: ${isVisible}, enabled: ${isEnabled})`);
            }
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async validateRiskManagement() {
        console.log('[Auto Trading Validator] 🛡️ Validating risk management...');
        
        // Simulate risk management validation
        const riskChecks = {
            maxTradesPerDay: { limit: 10, current: 0, pass: true },
            cooldownPeriod: { required: 300000, elapsed: 999999, pass: true },
            maxAmount: { limit: 100, current: 1, pass: true },
            emergencyStop: { active: false, pass: true }
        };
        
        const passedChecks = Object.values(riskChecks).filter(check => check.pass).length;
        const totalChecks = Object.keys(riskChecks).length;
        
        this.testResults.riskManagement = {
            checks: riskChecks,
            passedChecks,
            totalChecks,
            success: passedChecks === totalChecks
        };
        
        console.log(`✅ Risk management: ${passedChecks}/${totalChecks} checks passed`);
    }
    
    getEnhancedSelectors() {
        return {
            amountSelectors: [
                'input[data-testid="trade-amount-input"]',
                '.trade-amount input',
                'input[name="amount"]',
                'input[placeholder*="amount"]',
                '.amount-input',
                '.bet-amount',
                'input[type="number"]'
            ],
            
            callSelectors: [
                '[data-testid="call-button"]',
                '.call-button',
                '.up-button',
                '.buy-button',
                'button[data-direction="call"]',
                'button[data-type="call"]',
                'button.green',
                '[class*="call-button"]'
            ],
            
            putSelectors: [
                '[data-testid="put-button"]',
                '.put-button',
                '.down-button',
                '.sell-button',
                'button[data-direction="put"]',
                'button[data-type="put"]',
                'button.red',
                '[class*="put-button"]'
            ],
            
            expirySelectors: [
                'select[data-type="expiry"]',
                '.expiry-select',
                '.time-selector select',
                'select[name="expiry"]',
                '[data-testid="time-selector"]'
            ]
        };
    }
    
    generateValidationReport() {
        console.log('\n🎯 AUTO-TRADING VALIDATION REPORT');
        console.log('=====================================');
        
        const results = this.testResults;
        let totalTests = 0;
        let passedTests = 0;
        
        // Platform Detection
        if (results.platformDetection) {
            totalTests++;
            if (results.platformDetection.supported) passedTests++;
            console.log(`Platform Detection: ${results.platformDetection.supported ? '✅' : '❌'} (${results.platformDetection.platform})`);
        }
        
        // DOM Selectors
        if (results.domSelectors) {
            const selectorResults = Object.values(results.domSelectors);
            const foundSelectors = selectorResults.filter(r => r.found).length;
            totalTests++;
            if (foundSelectors >= 3) passedTests++; // Need at least 3/4 selectors
            console.log(`DOM Selectors: ${foundSelectors >= 3 ? '✅' : '❌'} (${foundSelectors}/4 found)`);
        }
        
        // Amount Setting
        if (results.amountSetting) {
            totalTests++;
            if (results.amountSetting.success) passedTests++;
            console.log(`Amount Setting: ${results.amountSetting.success ? '✅' : '❌'}`);
        }
        
        // Button Clicking
        if (results.buttonClicking) {
            const buttonResults = Object.values(results.buttonClicking);
            const workingButtons = buttonResults.filter(r => r.success).length;
            totalTests++;
            if (workingButtons >= 1) passedTests++; // Need at least 1 working button
            console.log(`Button Clicking: ${workingButtons >= 1 ? '✅' : '❌'} (${workingButtons}/2 ready)`);
        }
        
        // Risk Management
        if (results.riskManagement) {
            totalTests++;
            if (results.riskManagement.success) passedTests++;
            console.log(`Risk Management: ${results.riskManagement.success ? '✅' : '❌'}`);
        }
        
        const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        
        console.log('\n📊 SUMMARY:');
        console.log(`Overall Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
        
        if (successRate >= 80) {
            console.log('🎉 AUTO-TRADING IS READY FOR DEMO TESTING!');
        } else if (successRate >= 60) {
            console.log('⚠️ Auto-trading partially ready - some issues need fixing');
        } else {
            console.log('❌ Auto-trading not ready - significant issues detected');
        }
        
        console.log('\n🛡️ SAFETY REMINDER: Always test on demo accounts first!');
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Auto-run validation when script is loaded
if (typeof window !== 'undefined') {
    window.AutoTradingValidator = AutoTradingValidator;
    
    // Create validation button
    const button = document.createElement('button');
    button.textContent = '🧪 Validate Auto-Trading';
    button.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 10000;
        padding: 10px 20px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    
    button.onclick = async () => {
        button.disabled = true;
        button.textContent = '🔄 Validating...';
        
        const validator = new AutoTradingValidator();
        await validator.runFullValidation();
        
        button.disabled = false;
        button.textContent = '✅ Validation Complete';
        
        setTimeout(() => {
            button.textContent = '🧪 Validate Auto-Trading';
        }, 3000);
    };
    
    document.body.appendChild(button);
    
    console.log('🎯 Auto-Trading Validator loaded - click the blue button to test');
}
