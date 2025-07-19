/**
 * OTC Setup Validation Script
 * 
 * Final validation to ensure OTC mode is ready for production
 */

const fs = require('fs');
const path = require('path');

class OTCSetupValidator {
    constructor() {
        this.basePath = 'e:/Ranveer/TRADAI';
        this.errors = [];
        this.warnings = [];
        this.validations = [];
    }
    
    /**
     * Run all validations
     */
    validate() {
        console.log('🔍 Validating OTC Setup...\n');
        
        this.validateFileStructure();
        this.validateManifest();
        this.validatePopupFiles();
        this.validateContentScript();
        this.validateUtilityFiles();
        this.validateBackgroundScript();
        this.validateCSSIntegrity();
        this.validateJSIntegrity();
        
        this.generateReport();
    }
    
    /**
     * Validate file structure
     */
    validateFileStructure() {
        console.log('📁 Validating file structure...');
        
        const requiredFiles = [
            'otc-content.js',
            'popup-otc.html',
            'popup-otc.css',
            'popup-otc.js',
            'utils/otc-data-extractor.js',
            'utils/otc-error-handler.js',
            'utils/otc-data-validator.js',
            'utils/otc-test-suite.js',
            'utils/otc-status-monitor.js',
            'utils/otc-historical-data.js'
        ];
        
        let missingFiles = [];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.basePath, file);
            if (!fs.existsSync(filePath)) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length === 0) {
            this.validations.push('✅ All required OTC files exist');
        } else {
            this.errors.push(`❌ Missing files: ${missingFiles.join(', ')}`);
        }
    }
    
    /**
     * Validate manifest.json
     */
    validateManifest() {
        console.log('📋 Validating manifest.json...');
        
        try {
            const manifestPath = path.join(this.basePath, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            // Check web accessible resources
            const resources = manifest.web_accessible_resources[0].resources;
            const requiredOTCFiles = [
                'otc-content.js',
                'popup-otc.html',
                'popup-otc.css',
                'popup-otc.js',
                'utils/otc-data-extractor.js',
                'utils/otc-error-handler.js',
                'utils/otc-data-validator.js',
                'utils/otc-test-suite.js',
                'utils/otc-status-monitor.js',
                'utils/otc-historical-data.js'
            ];
            
            let missingInManifest = [];
            for (const file of requiredOTCFiles) {
                if (!resources.includes(file)) {
                    missingInManifest.push(file);
                }
            }
            
            if (missingInManifest.length === 0) {
                this.validations.push('✅ All OTC files included in manifest');
            } else {
                this.errors.push(`❌ Missing in manifest: ${missingInManifest.join(', ')}`);
            }
            
        } catch (error) {
            this.errors.push(`❌ Manifest validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate popup files
     */
    validatePopupFiles() {
        console.log('🖼️ Validating popup files...');
        
        try {
            // Check HTML
            const htmlPath = path.join(this.basePath, 'popup-otc.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            const requiredElements = [
                'activate-otc',
                'deactivate-otc',
                'asset-list',
                'timeframe-list',
                'generate-signal',
                'place-trade',
                'otc-status',
                'broker-name',
                'last-update'
            ];
            
            let missingElements = [];
            for (const elementId of requiredElements) {
                if (!htmlContent.includes(`id="${elementId}"`)) {
                    missingElements.push(elementId);
                }
            }
            
            if (missingElements.length === 0) {
                this.validations.push('✅ All required HTML elements present');
            } else {
                this.errors.push(`❌ Missing HTML elements: ${missingElements.join(', ')}`);
            }
            
            // Check CSS
            const cssPath = path.join(this.basePath, 'popup-otc.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            
            const requiredCSSClasses = [
                '.otc-mode',
                '.status-panel',
                '.control-panel',
                '.selection-panel',
                '.signal-panel',
                '.btn-primary',
                '.btn-danger',
                '.btn-success'
            ];
            
            let missingClasses = [];
            for (const className of requiredCSSClasses) {
                if (!cssContent.includes(className)) {
                    missingClasses.push(className);
                }
            }
            
            if (missingClasses.length === 0) {
                this.validations.push('✅ All required CSS classes present');
            } else {
                this.warnings.push(`⚠️ Missing CSS classes: ${missingClasses.join(', ')}`);
            }
            
        } catch (error) {
            this.errors.push(`❌ Popup validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate content script
     */
    validateContentScript() {
        console.log('📄 Validating content script...');
        
        try {
            const contentPath = path.join(this.basePath, 'otc-content.js');
            const contentScript = fs.readFileSync(contentPath, 'utf8');
            
            const requiredFunctions = [
                'initializeOTCExtractor',
                'loadOTCErrorHandler',
                'loadOTCDataValidator',
                'loadOTCStatusMonitor',
                'loadOTCTestSuite'
            ];
            
            let missingFunctions = [];
            for (const func of requiredFunctions) {
                if (!contentScript.includes(func)) {
                    missingFunctions.push(func);
                }
            }
            
            if (missingFunctions.length === 0) {
                this.validations.push('✅ All required content script functions present');
            } else {
                this.errors.push(`❌ Missing content script functions: ${missingFunctions.join(', ')}`);
            }
            
        } catch (error) {
            this.errors.push(`❌ Content script validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate utility files
     */
    validateUtilityFiles() {
        console.log('🔧 Validating utility files...');
        
        const utilityFiles = [
            'utils/otc-data-extractor.js',
            'utils/otc-error-handler.js',
            'utils/otc-data-validator.js',
            'utils/otc-test-suite.js',
            'utils/otc-status-monitor.js',
            'utils/otc-historical-data.js'
        ];
        
        let validFiles = 0;
        
        for (const file of utilityFiles) {
            try {
                const filePath = path.join(this.basePath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Basic validation - check if file has meaningful content
                if (content.length > 100 && content.includes('function')) {
                    validFiles++;
                } else {
                    this.warnings.push(`⚠️ ${file} seems incomplete`);
                }
                
            } catch (error) {
                this.errors.push(`❌ Cannot validate ${file}: ${error.message}`);
            }
        }
        
        if (validFiles === utilityFiles.length) {
            this.validations.push('✅ All utility files are valid');
        } else {
            this.warnings.push(`⚠️ ${validFiles}/${utilityFiles.length} utility files validated`);
        }
    }
    
    /**
     * Validate background script
     */
    validateBackgroundScript() {
        console.log('🔧 Validating background script...');
        
        try {
            const backgroundPath = path.join(this.basePath, 'background.js');
            const backgroundScript = fs.readFileSync(backgroundPath, 'utf8');
            
            const requiredOTCHandlers = [
                'handleActivateOTCMode',
                'handleDeactivateOTCMode',
                'handleGetOTCStatus',
                'handleGetAvailableOTCPairs',
                'handleGenerateOTCSignal',
                'handlePlaceOTCTrade'
            ];
            
            let missingHandlers = [];
            for (const handler of requiredOTCHandlers) {
                if (!backgroundScript.includes(handler)) {
                    missingHandlers.push(handler);
                }
            }
            
            if (missingHandlers.length === 0) {
                this.validations.push('✅ All OTC message handlers present in background script');
            } else {
                this.errors.push(`❌ Missing background handlers: ${missingHandlers.join(', ')}`);
            }
            
        } catch (error) {
            this.errors.push(`❌ Background script validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate CSS integrity
     */
    validateCSSIntegrity() {
        console.log('🎨 Validating CSS integrity...');
        
        try {
            const cssPath = path.join(this.basePath, 'popup-otc.css');
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            
            // Check for syntax errors (basic validation)
            const openBraces = (cssContent.match(/{/g) || []).length;
            const closeBraces = (cssContent.match(/}/g) || []).length;
            
            if (openBraces === closeBraces) {
                this.validations.push('✅ CSS syntax appears valid');
            } else {
                this.errors.push('❌ CSS syntax error: mismatched braces');
            }
            
        } catch (error) {
            this.errors.push(`❌ CSS validation failed: ${error.message}`);
        }
    }
    
    /**
     * Validate JavaScript integrity
     */
    validateJSIntegrity() {
        console.log('📜 Validating JavaScript integrity...');
        
        const jsFiles = [
            'popup-otc.js',
            'otc-content.js'
        ];
        
        let validJSFiles = 0;
        
        for (const file of jsFiles) {
            try {
                const filePath = path.join(this.basePath, file);
                const jsContent = fs.readFileSync(filePath, 'utf8');
                
                // Basic syntax validation
                const openParens = (jsContent.match(/\(/g) || []).length;
                const closeParens = (jsContent.match(/\)/g) || []).length;
                const openBraces = (jsContent.match(/{/g) || []).length;
                const closeBraces = (jsContent.match(/}/g) || []).length;
                
                if (openParens === closeParens && openBraces === closeBraces) {
                    validJSFiles++;
                } else {
                    this.warnings.push(`⚠️ ${file} may have syntax issues`);
                }
                
            } catch (error) {
                this.errors.push(`❌ Cannot validate ${file}: ${error.message}`);
            }
        }
        
        if (validJSFiles === jsFiles.length) {
            this.validations.push('✅ JavaScript files appear syntactically valid');
        }
    }
    
    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\n📊 OTC Setup Validation Report');
        console.log('===============================\n');
        
        // Show validations
        if (this.validations.length > 0) {
            console.log('✅ Successful Validations:');
            this.validations.forEach(validation => console.log(`  ${validation}`));
            console.log('');
        }
        
        // Show warnings
        if (this.warnings.length > 0) {
            console.log('⚠️ Warnings:');
            this.warnings.forEach(warning => console.log(`  ${warning}`));
            console.log('');
        }
        
        // Show errors
        if (this.errors.length > 0) {
            console.log('❌ Errors:');
            this.errors.forEach(error => console.log(`  ${error}`));
            console.log('');
        }
        
        // Summary
        console.log('📈 Summary:');
        console.log(`✅ Validations: ${this.validations.length}`);
        console.log(`⚠️ Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        if (this.errors.length === 0) {
            console.log('\n🎉 OTC Mode Setup Complete!');
            console.log('🚀 Ready for production use.');
            console.log('\nTo use OTC mode:');
            console.log('1. Load the extension in Chrome');
            console.log('2. Navigate to popup-otc.html');
            console.log('3. Click "Activate OTC Mode"');
            console.log('4. Select asset and timeframe');
            console.log('5. Generate signals and place trades');
        } else {
            console.log('\n🔧 Please fix the errors above before using OTC mode.');
        }
    }
}

// Run validation
const validator = new OTCSetupValidator();
validator.validate();