/**
 * Token Optimization Engine for Gemini Vision Analysis
 * Implements comprehensive strategies to minimize token usage while maintaining analysis quality
 */

const crypto = require('crypto');
const sharp = require('sharp');

class TokenOptimizationEngine {
    constructor(config = {}) {
        this.config = {
            // Image Optimization
            maxImageWidth: config.maxImageWidth || 1024,
            maxImageHeight: config.maxImageHeight || 768,
            imageQuality: config.imageQuality || 85,
            enableImageCompression: config.enableImageCompression !== false,
            
            // Prompt Optimization
            enablePromptCompression: config.enablePromptCompression !== false,
            maxPromptLength: config.maxPromptLength || 1000,
            useAbbreviations: config.useAbbreviations !== false,
            
            // Response Optimization
            enableResponseCaching: config.enableResponseCaching !== false,
            cacheExpiryMinutes: config.cacheExpiryMinutes || 10,
            maxCacheSize: config.maxCacheSize || 100,
            
            // Batch Processing
            enableBatchProcessing: config.enableBatchProcessing !== false,
            maxBatchSize: config.maxBatchSize || 3,
            batchTimeoutMs: config.batchTimeoutMs || 5000,
            
            // Token Tracking
            enableTokenTracking: config.enableTokenTracking !== false,
            dailyTokenLimit: config.dailyTokenLimit || 50000,
            warningThreshold: config.warningThreshold || 0.8,
            
            ...config
        };

        // Caching system
        this.responseCache = new Map();
        this.imageCache = new Map();
        
        // Token tracking
        this.tokenUsage = {
            daily: 0,
            hourly: 0,
            lastReset: Date.now(),
            requests: 0,
            averageTokensPerRequest: 0
        };
        
        // Batch processing queue
        this.batchQueue = [];
        this.batchTimer = null;
        
        // Abbreviation dictionary for prompt compression
        this.abbreviations = {
            'technical analysis': 'TA',
            'resistance': 'R',
            'support': 'S',
            'moving average': 'MA',
            'exponential moving average': 'EMA',
            'simple moving average': 'SMA',
            'relative strength index': 'RSI',
            'stochastic': 'STOCH',
            'bollinger bands': 'BB',
            'candlestick': 'CS',
            'bullish': 'BULL',
            'bearish': 'BEAR',
            'consolidation': 'CONSOL',
            'breakout': 'BO',
            'confidence': 'CONF',
            'prediction': 'PRED',
            'timeframe': 'TF',
            'analysis': 'ANAL'
        };
    }

    /**
     * Optimize image for minimal token usage
     */
    async optimizeImage(imageBuffer, options = {}) {
        if (!this.config.enableImageCompression) {
            return imageBuffer;
        }

        try {
            console.log('🖼️ Optimizing image for token efficiency...');
            
            const cacheKey = this.generateImageCacheKey(imageBuffer);
            const cached = this.imageCache.get(cacheKey);
            if (cached) {
                console.log('📋 Using cached optimized image');
                return cached;
            }

            const optimized = await sharp(imageBuffer)
                .resize({
                    width: this.config.maxImageWidth,
                    height: this.config.maxImageHeight,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: this.config.imageQuality,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();

            const originalSize = imageBuffer.length;
            const optimizedSize = optimized.length;
            const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
            
            console.log(`📉 Image optimized: ${originalSize} → ${optimizedSize} bytes (${reduction}% reduction)`);
            
            // Cache the optimized image
            this.imageCache.set(cacheKey, optimized);
            this.cleanImageCache();
            
            return optimized;
            
        } catch (error) {
            console.warn('⚠️ Image optimization failed, using original:', error.message);
            return imageBuffer;
        }
    }

    /**
     * Compress and optimize analysis prompt
     */
    optimizePrompt(basePrompt, options = {}) {
        if (!this.config.enablePromptCompression) {
            return basePrompt;
        }

        let optimized = basePrompt;
        
        // Apply abbreviations
        if (this.config.useAbbreviations) {
            for (const [full, abbrev] of Object.entries(this.abbreviations)) {
                const regex = new RegExp(full, 'gi');
                optimized = optimized.replace(regex, abbrev);
            }
        }
        
        // Remove redundant words and phrases
        optimized = optimized
            .replace(/\b(please|kindly|could you|would you)\b/gi, '')
            .replace(/\b(very|really|quite|extremely)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Ensure critical information is preserved
        const criticalTerms = ['UP', 'DOWN', 'NO_TRADE', 'confidence', 'JSON', 'candle'];
        criticalTerms.forEach(term => {
            if (!optimized.includes(term) && basePrompt.includes(term)) {
                optimized = optimized + ` ${term}`;
            }
        });
        
        // Truncate if too long
        if (optimized.length > this.config.maxPromptLength) {
            optimized = optimized.substring(0, this.config.maxPromptLength - 3) + '...';
        }
        
        const reduction = ((basePrompt.length - optimized.length) / basePrompt.length * 100).toFixed(1);
        console.log(`📝 Prompt optimized: ${basePrompt.length} → ${optimized.length} chars (${reduction}% reduction)`);
        
        return optimized;
    }

    /**
     * Generate ultra-compact analysis prompt
     */
    generateCompactPrompt(options = {}) {
        const timeframe = options.timeframe || '5m';
        const asset = options.asset || 'USD/BRL';
        
        return this.optimizePrompt(`
Analyze ${timeframe} ${asset} chart. Return JSON only:
{
  "predictions": [
    {"candle": 1, "direction": "UP/DOWN/NO_TRADE", "confidence": 85},
    {"candle": 2, "direction": "UP/DOWN/NO_TRADE", "confidence": 78},
    {"candle": 3, "direction": "UP/DOWN/NO_TRADE", "confidence": 72}
  ],
  "indicators": {
    "rsi": 65,
    "macd": "bullish",
    "ema": "up",
    "stoch": 45
  },
  "patterns": ["doji"],
  "levels": {
    "support": [1.234],
    "resistance": [1.245]
  },
  "trend": "bullish",
  "confidence": 82,
  "reason": "Brief reason"
}
No explanations. JSON only.`, options);
    }

    /**
     * Check if response is cached
     */
    getCachedResponse(imageBuffer, prompt) {
        if (!this.config.enableResponseCaching) {
            return null;
        }

        const cacheKey = this.generateCacheKey(imageBuffer, prompt);
        const cached = this.responseCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.config.cacheExpiryMinutes * 60 * 1000) {
            console.log('📋 Using cached analysis response');
            return cached.data;
        }
        
        if (cached) {
            this.responseCache.delete(cacheKey);
        }
        
        return null;
    }

    /**
     * Cache analysis response
     */
    cacheResponse(imageBuffer, prompt, response) {
        if (!this.config.enableResponseCaching) {
            return;
        }

        const cacheKey = this.generateCacheKey(imageBuffer, prompt);
        this.responseCache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
        });
        
        this.cleanResponseCache();
    }

    /**
     * Track token usage
     */
    trackTokenUsage(usage) {
        if (!this.config.enableTokenTracking || !usage) {
            return;
        }

        const tokens = usage.totalTokens || 0;
        this.tokenUsage.daily += tokens;
        this.tokenUsage.hourly += tokens;
        this.tokenUsage.requests++;
        this.tokenUsage.averageTokensPerRequest = this.tokenUsage.daily / this.tokenUsage.requests;
        
        // Reset hourly counter
        const now = Date.now();
        if (now - this.tokenUsage.lastReset > 60 * 60 * 1000) {
            this.tokenUsage.hourly = 0;
            this.tokenUsage.lastReset = now;
        }
        
        // Check limits
        const usagePercentage = this.tokenUsage.daily / this.config.dailyTokenLimit;
        if (usagePercentage > this.config.warningThreshold) {
            console.warn(`⚠️ Token usage warning: ${(usagePercentage * 100).toFixed(1)}% of daily limit used`);
        }
        
        console.log(`📊 Token usage: ${tokens} tokens (Daily: ${this.tokenUsage.daily}/${this.config.dailyTokenLimit})`);
    }

    /**
     * Add request to batch processing queue
     */
    addToBatch(request) {
        if (!this.config.enableBatchProcessing) {
            return null;
        }

        return new Promise((resolve, reject) => {
            this.batchQueue.push({
                request,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            // Start batch timer if not already running
            if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => {
                    this.processBatch();
                }, this.config.batchTimeoutMs);
            }
            
            // Process immediately if batch is full
            if (this.batchQueue.length >= this.config.maxBatchSize) {
                clearTimeout(this.batchTimer);
                this.batchTimer = null;
                this.processBatch();
            }
        });
    }

    /**
     * Process batch of requests
     */
    async processBatch() {
        if (this.batchQueue.length === 0) {
            return;
        }

        const batch = this.batchQueue.splice(0, this.config.maxBatchSize);
        console.log(`📦 Processing batch of ${batch.length} requests`);
        
        // Process all requests in parallel
        const promises = batch.map(async (item) => {
            try {
                const result = await this.processSingleRequest(item.request);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
        });
        
        await Promise.allSettled(promises);
        
        // Schedule next batch if queue is not empty
        if (this.batchQueue.length > 0) {
            this.batchTimer = setTimeout(() => {
                this.processBatch();
            }, this.config.batchTimeoutMs);
        }
    }

    /**
     * Generate cache key for response caching
     */
    generateCacheKey(imageBuffer, prompt) {
        const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 16);
        const promptHash = crypto.createHash('md5').update(prompt).digest('hex').substring(0, 16);
        return `${imageHash}_${promptHash}`;
    }

    /**
     * Generate cache key for image optimization
     */
    generateImageCacheKey(imageBuffer) {
        return crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 16);
    }

    /**
     * Clean response cache
     */
    cleanResponseCache() {
        if (this.responseCache.size > this.config.maxCacheSize) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
    }

    /**
     * Clean image cache
     */
    cleanImageCache() {
        if (this.imageCache.size > 50) {
            const oldestKey = this.imageCache.keys().next().value;
            this.imageCache.delete(oldestKey);
        }
    }
    /**
     * Get optimization statistics
     */
    getOptimizationStats() {
        return {
            tokenUsage: {
                ...this.tokenUsage,
                dailyLimitPercentage: (this.tokenUsage.daily / this.config.dailyTokenLimit * 100).toFixed(1) + '%',
                estimatedRequestsRemaining: Math.floor((this.config.dailyTokenLimit - this.tokenUsage.daily) / this.tokenUsage.averageTokensPerRequest)
            },
            caching: {
                responseCacheSize: this.responseCache.size,
                imageCacheSize: this.imageCache.size,
                maxCacheSize: this.config.maxCacheSize
            },
            batching: {
                queueLength: this.batchQueue.length,
                maxBatchSize: this.config.maxBatchSize,
                batchTimeoutMs: this.config.batchTimeoutMs
            },
            optimization: {
                imageCompressionEnabled: this.config.enableImageCompression,
                promptCompressionEnabled: this.config.enablePromptCompression,
                responseCachingEnabled: this.config.enableResponseCaching,
                batchProcessingEnabled: this.config.enableBatchProcessing
            }
        };
    }

    /**
     * Reset daily token usage
     */
    resetDailyUsage() {
        this.tokenUsage.daily = 0;
        this.tokenUsage.requests = 0;
        this.tokenUsage.averageTokensPerRequest = 0;
        this.tokenUsage.lastReset = Date.now();
        console.log('🔄 Daily token usage reset');
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.responseCache.clear();
        this.imageCache.clear();
        console.log('🧹 All caches cleared');
    }

    /**
     * Estimate token usage for a request
     */
    estimateTokenUsage(imageSize, promptLength) {
        // Rough estimation based on typical usage patterns
        const imageTokens = Math.ceil(imageSize / 1000); // ~1 token per KB
        const promptTokens = Math.ceil(promptLength / 4); // ~4 chars per token
        const responseTokens = 200; // Estimated response size

        return {
            imageTokens,
            promptTokens,
            responseTokens,
            totalEstimated: imageTokens + promptTokens + responseTokens
        };
    }

    /**
     * Check if request should be processed based on token limits
     */
    shouldProcessRequest(estimatedTokens) {
        const remainingTokens = this.config.dailyTokenLimit - this.tokenUsage.daily;

        if (estimatedTokens > remainingTokens) {
            console.warn(`⚠️ Request would exceed daily token limit (${estimatedTokens} > ${remainingTokens})`);
            return false;
        }

        return true;
    }

    /**
     * Get cache hit rate
     */
    getCacheHitRate() {
        const totalRequests = this.tokenUsage.requests;
        if (totalRequests === 0) return 0;

        // This would need to be tracked separately in a real implementation
        return 0; // Placeholder
    }

    /**
     * Optimize for specific use case
     */
    optimizeForUseCase(useCase) {
        switch (useCase) {
            case 'high-frequency':
                this.config.enableResponseCaching = true;
                this.config.cacheExpiryMinutes = 15;
                this.config.enableBatchProcessing = true;
                this.config.maxBatchSize = 5;
                break;

            case 'token-conservative':
                this.config.enableImageCompression = true;
                this.config.imageQuality = 70;
                this.config.enablePromptCompression = true;
                this.config.maxPromptLength = 500;
                break;

            case 'quality-focused':
                this.config.enableImageCompression = false;
                this.config.enablePromptCompression = false;
                this.config.enableResponseCaching = false;
                break;

            default:
                console.log('Unknown use case, using default optimization');
        }

        console.log(`🎯 Optimized for ${useCase} use case`);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        this.clearCaches();
        this.batchQueue = [];

        console.log('🧹 Token Optimization Engine cleaned up');
    }
}

module.exports = TokenOptimizationEngine;
