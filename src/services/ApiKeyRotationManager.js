/**
 * API Key Rotation Manager for Gemini Vision Analysis
 * Manages multiple Google API keys with intelligent rotation, failover, and usage tracking
 */

class ApiKeyRotationManager {
    constructor(config = {}) {
        this.config = {
            // API Keys (should be provided via environment or config)
            apiKeys: config.apiKeys || this.loadApiKeysFromEnv(),
            
            // Rotation Strategy
            rotationStrategy: config.rotationStrategy || 'round-robin', // 'round-robin', 'least-used', 'random'
            
            // Rate Limiting
            maxRequestsPerKeyPerMinute: config.maxRequestsPerKeyPerMinute || 15,
            maxRequestsPerKeyPerHour: config.maxRequestsPerKeyPerHour || 300,
            maxRequestsPerKeyPerDay: config.maxRequestsPerKeyPerDay || 1500,
            
            // Failover Settings
            maxConsecutiveErrors: config.maxConsecutiveErrors || 3,
            keyRecoveryTimeMinutes: config.keyRecoveryTimeMinutes || 5,
            enableAutoRecovery: config.enableAutoRecovery !== false,
            
            // Health Monitoring
            healthCheckIntervalMinutes: config.healthCheckIntervalMinutes || 10,
            enableHealthMonitoring: config.enableHealthMonitoring !== false,
            
            ...config
        };

        // Key management state
        this.keyStates = new Map();
        this.currentKeyIndex = 0;
        this.lastRotationTime = Date.now();
        
        // Usage tracking
        this.usageStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            keyRotations: 0,
            lastResetTime: Date.now()
        };
        
        // Health monitoring
        this.healthCheckTimer = null;
        
        this.initialize();
    }

    /**
     * Load API keys from environment variables
     */
    loadApiKeysFromEnv() {
        const keys = [];
        
        // Primary key
        if (process.env.GOOGLE_VISION_API_KEY) {
            keys.push(process.env.GOOGLE_VISION_API_KEY);
        }
        
        // Additional keys (GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, etc.)
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GOOGLE_API_KEY_${i}`] || process.env[`GEMINI_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }
        
        console.log(`🔑 Loaded ${keys.length} API keys from environment`);
        return keys;
    }

    /**
     * Initialize key states and health monitoring
     */
    initialize() {
        console.log('🔄 Initializing API Key Rotation Manager...');
        
        if (this.config.apiKeys.length === 0) {
            throw new Error('No API keys provided for rotation');
        }
        
        // Initialize state for each key
        this.config.apiKeys.forEach((key, index) => {
            this.keyStates.set(index, {
                apiKey: key,
                index: index,
                isActive: true,
                isHealthy: true,
                
                // Usage counters
                requestsThisMinute: 0,
                requestsThisHour: 0,
                requestsThisDay: 0,
                totalRequests: 0,
                
                // Error tracking
                consecutiveErrors: 0,
                totalErrors: 0,
                lastError: null,
                lastErrorTime: null,
                
                // Timing
                lastUsed: 0,
                lastHealthCheck: 0,
                deactivatedUntil: 0,
                
                // Performance metrics
                averageResponseTime: 0,
                totalResponseTime: 0,
                successfulRequests: 0
            });
        });
        
        // Start health monitoring
        if (this.config.enableHealthMonitoring) {
            this.startHealthMonitoring();
        }
        
        console.log(`✅ API Key Rotation Manager initialized with ${this.config.apiKeys.length} keys`);
    }

    /**
     * Get next available API key using configured rotation strategy
     */
    getNextApiKey() {
        const availableKeys = this.getAvailableKeys();
        
        if (availableKeys.length === 0) {
            throw new Error('No available API keys for rotation');
        }
        
        let selectedKey;
        
        switch (this.config.rotationStrategy) {
            case 'least-used':
                selectedKey = this.getLeastUsedKey(availableKeys);
                break;
            case 'random':
                selectedKey = this.getRandomKey(availableKeys);
                break;
            case 'round-robin':
            default:
                selectedKey = this.getRoundRobinKey(availableKeys);
                break;
        }
        
        // Update usage and rotation stats
        this.updateKeyUsage(selectedKey);
        this.usageStats.keyRotations++;
        this.lastRotationTime = Date.now();
        
        console.log(`🔑 Selected API Key ${selectedKey.index + 1} (${this.config.rotationStrategy})`);
        return selectedKey.apiKey;
    }

    /**
     * Get available (active and healthy) keys
     */
    getAvailableKeys() {
        const now = Date.now();
        const availableKeys = [];
        
        for (const [index, keyState] of this.keyStates.entries()) {
            // Check if key is active and healthy
            if (!keyState.isActive || !keyState.isHealthy) {
                continue;
            }
            
            // Check if key is temporarily deactivated
            if (keyState.deactivatedUntil > now) {
                continue;
            }
            
            // Check rate limits
            if (this.isKeyRateLimited(keyState)) {
                continue;
            }
            
            availableKeys.push(keyState);
        }
        
        return availableKeys;
    }

    /**
     * Check if key is rate limited
     */
    isKeyRateLimited(keyState) {
        const now = Date.now();
        const oneMinute = 60 * 1000;
        const oneHour = 60 * 60 * 1000;
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Reset counters if time periods have passed
        if (now - keyState.lastUsed > oneMinute) {
            keyState.requestsThisMinute = 0;
        }
        if (now - keyState.lastUsed > oneHour) {
            keyState.requestsThisHour = 0;
        }
        if (now - keyState.lastUsed > oneDay) {
            keyState.requestsThisDay = 0;
        }
        
        // Check limits
        return (
            keyState.requestsThisMinute >= this.config.maxRequestsPerKeyPerMinute ||
            keyState.requestsThisHour >= this.config.maxRequestsPerKeyPerHour ||
            keyState.requestsThisDay >= this.config.maxRequestsPerKeyPerDay
        );
    }

    /**
     * Round-robin key selection
     */
    getRoundRobinKey(availableKeys) {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length;
        return availableKeys[this.currentKeyIndex];
    }

    /**
     * Least-used key selection
     */
    getLeastUsedKey(availableKeys) {
        return availableKeys.reduce((least, current) => 
            current.totalRequests < least.totalRequests ? current : least
        );
    }

    /**
     * Random key selection
     */
    getRandomKey(availableKeys) {
        const randomIndex = Math.floor(Math.random() * availableKeys.length);
        return availableKeys[randomIndex];
    }

    /**
     * Update key usage statistics
     */
    updateKeyUsage(keyState) {
        const now = Date.now();
        
        keyState.lastUsed = now;
        keyState.requestsThisMinute++;
        keyState.requestsThisHour++;
        keyState.requestsThisDay++;
        keyState.totalRequests++;
        
        this.usageStats.totalRequests++;
    }

    /**
     * Report successful request
     */
    reportSuccess(apiKey, responseTime = 0) {
        const keyState = this.findKeyState(apiKey);
        if (keyState) {
            keyState.consecutiveErrors = 0;
            keyState.successfulRequests++;
            keyState.totalResponseTime += responseTime;
            keyState.averageResponseTime = keyState.totalResponseTime / keyState.successfulRequests;
            
            this.usageStats.successfulRequests++;
        }
    }

    /**
     * Report failed request and handle failover
     */
    reportError(apiKey, error) {
        const keyState = this.findKeyState(apiKey);
        if (!keyState) return;
        
        keyState.consecutiveErrors++;
        keyState.totalErrors++;
        keyState.lastError = error;
        keyState.lastErrorTime = Date.now();
        
        this.usageStats.failedRequests++;
        
        console.log(`❌ API Key ${keyState.index + 1} error: ${error.message}`);
        
        // Check if key should be temporarily deactivated
        if (keyState.consecutiveErrors >= this.config.maxConsecutiveErrors) {
            this.deactivateKey(keyState);
        }
        
        // Handle specific error types
        if (error.message.includes('quota') || error.message.includes('rate limit')) {
            this.handleRateLimitError(keyState);
        }
    }

    /**
     * Temporarily deactivate a key
     */
    deactivateKey(keyState) {
        const recoveryTime = this.config.keyRecoveryTimeMinutes * 60 * 1000;
        keyState.deactivatedUntil = Date.now() + recoveryTime;
        keyState.isHealthy = false;
        
        console.log(`⚠️ Temporarily deactivated API Key ${keyState.index + 1} for ${this.config.keyRecoveryTimeMinutes} minutes`);
        
        // Schedule reactivation
        if (this.config.enableAutoRecovery) {
            setTimeout(() => {
                this.reactivateKey(keyState);
            }, recoveryTime);
        }
    }

    /**
     * Reactivate a key
     */
    reactivateKey(keyState) {
        keyState.isHealthy = true;
        keyState.consecutiveErrors = 0;
        keyState.deactivatedUntil = 0;
        
        console.log(`🔄 Reactivated API Key ${keyState.index + 1}`);
    }

    /**
     * Handle rate limit specific errors
     */
    handleRateLimitError(keyState) {
        // Reset rate limit counters to prevent immediate reuse
        keyState.requestsThisMinute = this.config.maxRequestsPerKeyPerMinute;
        keyState.requestsThisHour = this.config.maxRequestsPerKeyPerHour;
        
        console.log(`🚫 Rate limit hit for API Key ${keyState.index + 1}`);
    }

    /**
     * Find key state by API key
     */
    findKeyState(apiKey) {
        for (const [index, keyState] of this.keyStates.entries()) {
            if (keyState.apiKey === apiKey) {
                return keyState;
            }
        }
        return null;
    }
    /**
     * Start health monitoring for all keys
     */
    startHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        const intervalMs = this.config.healthCheckIntervalMinutes * 60 * 1000;
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, intervalMs);

        console.log(`🏥 Started health monitoring (every ${this.config.healthCheckIntervalMinutes} minutes)`);
    }

    /**
     * Perform health checks on all keys
     */
    async performHealthChecks() {
        console.log('🏥 Performing API key health checks...');

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const healthPromises = [];

        for (const [index, keyState] of this.keyStates.entries()) {
            if (!keyState.isActive) continue;

            const healthPromise = this.checkKeyHealth(keyState);
            healthPromises.push(healthPromise);
        }

        const results = await Promise.allSettled(healthPromises);
        const healthyKeys = results.filter(r => r.status === 'fulfilled' && r.value).length;

        console.log(`🏥 Health check complete: ${healthyKeys}/${this.config.apiKeys.length} keys healthy`);
    }

    /**
     * Check health of individual key
     */
    async checkKeyHealth(keyState) {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(keyState.apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const result = await model.generateContent('Health check. Reply "OK".');
            const response = await result.response;
            const text = response.text();

            if (text && text.includes('OK')) {
                keyState.isHealthy = true;
                keyState.lastHealthCheck = Date.now();
                return true;
            } else {
                throw new Error('Invalid health check response');
            }
        } catch (error) {
            console.log(`❌ Health check failed for API Key ${keyState.index + 1}: ${error.message}`);
            keyState.isHealthy = false;
            keyState.lastError = error.message;
            keyState.lastErrorTime = Date.now();
            return false;
        }
    }

    /**
     * Get comprehensive statistics
     */
    getStats() {
        const stats = {
            manager: {
                totalKeys: this.config.apiKeys.length,
                activeKeys: Array.from(this.keyStates.values()).filter(k => k.isActive).length,
                healthyKeys: Array.from(this.keyStates.values()).filter(k => k.isHealthy).length,
                availableKeys: this.getAvailableKeys().length,
                rotationStrategy: this.config.rotationStrategy
            },
            usage: {
                ...this.usageStats,
                successRate: this.usageStats.totalRequests > 0 ?
                    (this.usageStats.successfulRequests / this.usageStats.totalRequests * 100).toFixed(2) + '%' : '0%'
            },
            keys: []
        };

        // Add individual key statistics
        for (const [index, keyState] of this.keyStates.entries()) {
            stats.keys.push({
                index: index + 1,
                isActive: keyState.isActive,
                isHealthy: keyState.isHealthy,
                isAvailable: this.getAvailableKeys().includes(keyState),
                totalRequests: keyState.totalRequests,
                successfulRequests: keyState.successfulRequests,
                totalErrors: keyState.totalErrors,
                consecutiveErrors: keyState.consecutiveErrors,
                averageResponseTime: Math.round(keyState.averageResponseTime),
                requestsThisDay: keyState.requestsThisDay,
                lastUsed: keyState.lastUsed ? new Date(keyState.lastUsed).toISOString() : null,
                lastError: keyState.lastError,
                deactivatedUntil: keyState.deactivatedUntil > Date.now() ?
                    new Date(keyState.deactivatedUntil).toISOString() : null
            });
        }

        return stats;
    }

    /**
     * Manually activate/deactivate a key
     */
    setKeyActive(keyIndex, isActive) {
        const keyState = this.keyStates.get(keyIndex);
        if (keyState) {
            keyState.isActive = isActive;
            if (isActive) {
                keyState.consecutiveErrors = 0;
                keyState.deactivatedUntil = 0;
            }
            console.log(`🔧 API Key ${keyIndex + 1} ${isActive ? 'activated' : 'deactivated'} manually`);
            return true;
        }
        return false;
    }

    /**
     * Reset usage statistics
     */
    resetStats() {
        this.usageStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            keyRotations: 0,
            lastResetTime: Date.now()
        };

        // Reset individual key stats
        for (const [index, keyState] of this.keyStates.entries()) {
            keyState.requestsThisMinute = 0;
            keyState.requestsThisHour = 0;
            keyState.requestsThisDay = 0;
            keyState.totalRequests = 0;
            keyState.successfulRequests = 0;
            keyState.totalErrors = 0;
            keyState.consecutiveErrors = 0;
            keyState.totalResponseTime = 0;
            keyState.averageResponseTime = 0;
        }

        console.log('📊 Usage statistics reset');
    }

    /**
     * Add new API key to rotation
     */
    addApiKey(apiKey) {
        const newIndex = this.config.apiKeys.length;
        this.config.apiKeys.push(apiKey);

        this.keyStates.set(newIndex, {
            apiKey: apiKey,
            index: newIndex,
            isActive: true,
            isHealthy: true,
            requestsThisMinute: 0,
            requestsThisHour: 0,
            requestsThisDay: 0,
            totalRequests: 0,
            consecutiveErrors: 0,
            totalErrors: 0,
            lastError: null,
            lastErrorTime: null,
            lastUsed: 0,
            lastHealthCheck: 0,
            deactivatedUntil: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            successfulRequests: 0
        });

        console.log(`➕ Added new API Key ${newIndex + 1} to rotation`);
        return newIndex;
    }

    /**
     * Remove API key from rotation
     */
    removeApiKey(keyIndex) {
        if (this.keyStates.has(keyIndex)) {
            this.keyStates.delete(keyIndex);
            this.config.apiKeys.splice(keyIndex, 1);
            console.log(`➖ Removed API Key ${keyIndex + 1} from rotation`);
            return true;
        }
        return false;
    }

    /**
     * Cleanup and stop monitoring
     */
    cleanup() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }

        console.log('🧹 API Key Rotation Manager cleaned up');
    }
}

module.exports = ApiKeyRotationManager;
