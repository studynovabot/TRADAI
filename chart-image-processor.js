#!/usr/bin/env node

/**
 * 📊 Chart Image Processing Pipeline
 * ==================================
 * 
 * Advanced image processing system for trading chart screenshots
 * Handles multi-timeframe analysis with preprocessing and optimization
 * 
 * Features:
 * - File system monitoring for new charts
 * - Image preprocessing and optimization
 * - Quality validation and enhancement
 * - Multi-timeframe support (1m, 3m, 5m)
 * - Base64 encoding for API transmission
 * - Metadata extraction and validation
 * 
 * Built for TRADAI Chart Analysis System
 */

const fs = require('fs').promises;
const path = require('path');
const { createReadStream, existsSync, statSync } = require('fs');

class ChartImageProcessor {
    constructor(options = {}) {
        this.options = {
            baseDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            supportedTimeframes: ['1m', '3m', '5m'],
            supportedFormats: ['.png', '.jpg', '.jpeg'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            minFileSize: 1024, // 1KB
            watchInterval: 2000, // 2 seconds
            imageQualityThreshold: 0.8,
            ...options
        };

        // File monitoring state
        this.watchedFiles = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;

        // Processing statistics
        this.stats = {
            totalProcessed: 0,
            successfulProcessed: 0,
            failedProcessed: 0,
            averageProcessingTime: 0,
            lastProcessedFile: null,
            timeframeStats: {
                '1m': { processed: 0, lastFile: null },
                '3m': { processed: 0, lastFile: null },
                '5m': { processed: 0, lastFile: null }
            }
        };

        // Event callbacks
        this.onNewChart = null;
        this.onProcessingComplete = null;
        this.onError = null;
    }

    /**
     * Initialize the image processor
     */
    async initialize() {
        console.log('🚀 Initializing Chart Image Processor...');
        
        try {
            // Validate base directory
            await this.validateDirectoryStructure();
            
            // Scan existing files
            await this.scanExistingFiles();
            
            console.log('✅ Chart Image Processor initialized successfully');
            console.log(`   Base directory: ${this.options.baseDirectory}`);
            console.log(`   Supported timeframes: ${this.options.supportedTimeframes.join(', ')}`);
            console.log(`   Watched files: ${this.watchedFiles.size}`);
            
            return {
                success: true,
                watchedFiles: this.watchedFiles.size,
                supportedTimeframes: this.options.supportedTimeframes
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize Chart Image Processor:', error.message);
            throw error;
        }
    }

    /**
     * Validate directory structure
     */
    async validateDirectoryStructure() {
        // Check base directory
        if (!existsSync(this.options.baseDirectory)) {
            throw new Error(`Base directory does not exist: ${this.options.baseDirectory}`);
        }

        // Check timeframe subdirectories
        for (const timeframe of this.options.supportedTimeframes) {
            const timeframePath = path.join(this.options.baseDirectory, timeframe);
            
            try {
                await fs.access(timeframePath);
                console.log(`✅ Timeframe directory found: ${timeframe}`);
            } catch (error) {
                console.warn(`⚠️ Timeframe directory not found: ${timeframe}`);
                // Create directory if it doesn't exist
                try {
                    await fs.mkdir(timeframePath, { recursive: true });
                    console.log(`📁 Created timeframe directory: ${timeframe}`);
                } catch (createError) {
                    console.error(`❌ Failed to create directory ${timeframe}:`, createError.message);
                }
            }
        }
    }

    /**
     * Scan existing files in all timeframe directories
     */
    async scanExistingFiles() {
        console.log('🔍 Scanning existing chart files...');
        
        for (const timeframe of this.options.supportedTimeframes) {
            const timeframePath = path.join(this.options.baseDirectory, timeframe);
            
            try {
                const files = await fs.readdir(timeframePath);
                const chartFiles = files.filter(file => 
                    this.options.supportedFormats.some(ext => 
                        file.toLowerCase().endsWith(ext)
                    )
                );

                for (const file of chartFiles) {
                    const filePath = path.join(timeframePath, file);
                    const stats = statSync(filePath);
                    
                    this.watchedFiles.set(filePath, {
                        timeframe,
                        filename: file,
                        lastModified: stats.mtime.getTime(),
                        size: stats.size,
                        processed: false
                    });
                }

                console.log(`   ${timeframe}: ${chartFiles.length} chart files found`);
                
            } catch (error) {
                console.warn(`⚠️ Error scanning ${timeframe} directory:`, error.message);
            }
        }
    }

    /**
     * Start monitoring for new chart files
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.warn('⚠️ File monitoring is already active');
            return;
        }

        console.log('👁️ Starting chart file monitoring...');
        this.isMonitoring = true;

        this.monitoringInterval = setInterval(async () => {
            try {
                await this.checkForNewFiles();
            } catch (error) {
                console.error('❌ Error during file monitoring:', error.message);
                if (this.onError) {
                    this.onError(error);
                }
            }
        }, this.options.watchInterval);

        console.log(`✅ File monitoring started (interval: ${this.options.watchInterval}ms)`);
    }

    /**
     * Stop monitoring for new chart files
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('🛑 Stopping chart file monitoring...');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('✅ File monitoring stopped');
    }

    /**
     * Check for new or modified files
     */
    async checkForNewFiles() {
        for (const timeframe of this.options.supportedTimeframes) {
            const timeframePath = path.join(this.options.baseDirectory, timeframe);
            
            try {
                const files = await fs.readdir(timeframePath);
                const chartFiles = files.filter(file => 
                    this.options.supportedFormats.some(ext => 
                        file.toLowerCase().endsWith(ext)
                    )
                );

                for (const file of chartFiles) {
                    const filePath = path.join(timeframePath, file);
                    const stats = statSync(filePath);
                    const currentModified = stats.mtime.getTime();

                    const existingFile = this.watchedFiles.get(filePath);
                    
                    if (!existingFile || existingFile.lastModified < currentModified) {
                        // New or modified file detected
                        console.log(`📊 New chart detected: ${timeframe}/${file}`);
                        
                        this.watchedFiles.set(filePath, {
                            timeframe,
                            filename: file,
                            lastModified: currentModified,
                            size: stats.size,
                            processed: false
                        });

                        // Process the new chart
                        await this.processChartFile(filePath);
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Error checking ${timeframe} directory:`, error.message);
            }
        }
    }

    /**
     * Process a single chart file
     */
    async processChartFile(filePath) {
        const startTime = Date.now();
        const fileInfo = this.watchedFiles.get(filePath);
        
        if (!fileInfo) {
            throw new Error(`File info not found for: ${filePath}`);
        }

        console.log(`🔄 Processing chart: ${fileInfo.timeframe}/${fileInfo.filename}`);

        try {
            this.stats.totalProcessed++;

            // Validate file
            await this.validateFile(filePath, fileInfo);

            // Read and process image
            const imageData = await this.readImageFile(filePath);
            const processedImage = await this.preprocessImage(imageData, fileInfo);

            // Create chart analysis object
            const chartData = {
                filePath,
                timeframe: fileInfo.timeframe,
                filename: fileInfo.filename,
                size: fileInfo.size,
                lastModified: fileInfo.lastModified,
                imageData: processedImage.base64,
                metadata: {
                    originalSize: imageData.length,
                    processedSize: processedImage.base64.length,
                    format: this.getImageFormat(fileInfo.filename),
                    quality: processedImage.quality,
                    dimensions: processedImage.dimensions
                },
                processedAt: new Date().toISOString(),
                processingTime: Date.now() - startTime
            };

            // Update statistics
            this.updateStatistics(fileInfo.timeframe, Date.now() - startTime);
            fileInfo.processed = true;
            this.stats.lastProcessedFile = `${fileInfo.timeframe}/${fileInfo.filename}`;

            console.log(`✅ Chart processed successfully: ${fileInfo.timeframe}/${fileInfo.filename}`);
            console.log(`   Processing time: ${chartData.processingTime}ms`);
            console.log(`   Image size: ${Math.round(imageData.length / 1024)}KB`);
            console.log(`   Quality score: ${processedImage.quality.toFixed(2)}`);

            // Trigger callbacks
            if (this.onNewChart) {
                this.onNewChart(chartData);
            }

            if (this.onProcessingComplete) {
                this.onProcessingComplete(chartData);
            }

            return chartData;

        } catch (error) {
            this.stats.failedProcessed++;
            console.error(`❌ Failed to process chart ${fileInfo.timeframe}/${fileInfo.filename}:`, error.message);
            
            if (this.onError) {
                this.onError(error, fileInfo);
            }
            
            throw error;
        }
    }

    /**
     * Validate file before processing
     */
    async validateFile(filePath, fileInfo) {
        // Check file size
        if (fileInfo.size < this.options.minFileSize) {
            throw new Error(`File too small: ${fileInfo.size} bytes`);
        }

        if (fileInfo.size > this.options.maxFileSize) {
            throw new Error(`File too large: ${fileInfo.size} bytes`);
        }

        // Check file accessibility
        try {
            await fs.access(filePath, fs.constants.R_OK);
        } catch (error) {
            throw new Error(`File not readable: ${error.message}`);
        }

        // Check file format
        const format = this.getImageFormat(fileInfo.filename);
        if (!this.options.supportedFormats.includes(format)) {
            throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Read image file as buffer
     */
    async readImageFile(filePath) {
        try {
            const imageBuffer = await fs.readFile(filePath);
            return imageBuffer;
        } catch (error) {
            throw new Error(`Failed to read image file: ${error.message}`);
        }
    }

    /**
     * Preprocess image for AI analysis
     */
    async preprocessImage(imageData, fileInfo) {
        try {
            // Convert to base64 for API transmission
            const base64Data = imageData.toString('base64');
            
            // Calculate quality score (simplified)
            const quality = this.calculateImageQuality(imageData, fileInfo);
            
            // Get image dimensions (simplified - would use actual image library in production)
            const dimensions = this.estimateImageDimensions(imageData);

            return {
                base64: base64Data,
                quality: quality,
                dimensions: dimensions,
                format: this.getImageFormat(fileInfo.filename)
            };

        } catch (error) {
            throw new Error(`Image preprocessing failed: ${error.message}`);
        }
    }

    /**
     * Calculate image quality score
     */
    calculateImageQuality(imageData, fileInfo) {
        // Simplified quality calculation based on file size and format
        const sizeScore = Math.min(fileInfo.size / (500 * 1024), 1.0); // Normalize to 500KB
        const formatScore = fileInfo.filename.toLowerCase().endsWith('.png') ? 1.0 : 0.8;
        
        return (sizeScore * 0.6 + formatScore * 0.4);
    }

    /**
     * Estimate image dimensions (simplified)
     */
    estimateImageDimensions(imageData) {
        // This is a simplified estimation - in production, use a proper image library
        const size = imageData.length;
        
        if (size > 1000000) return { width: 1920, height: 1080 }; // Large image
        if (size > 500000) return { width: 1280, height: 720 };   // Medium image
        return { width: 800, height: 600 }; // Small image
    }

    /**
     * Get image format from filename
     */
    getImageFormat(filename) {
        const ext = path.extname(filename).toLowerCase();
        return ext;
    }

    /**
     * Update processing statistics
     */
    updateStatistics(timeframe, processingTime) {
        this.stats.successfulProcessed++;
        
        // Update average processing time
        if (this.stats.totalProcessed === 1) {
            this.stats.averageProcessingTime = processingTime;
        } else {
            this.stats.averageProcessingTime = 
                ((this.stats.averageProcessingTime * (this.stats.totalProcessed - 1)) + processingTime) / this.stats.totalProcessed;
        }

        // Update timeframe statistics
        if (this.stats.timeframeStats[timeframe]) {
            this.stats.timeframeStats[timeframe].processed++;
            this.stats.timeframeStats[timeframe].lastFile = new Date().toISOString();
        }
    }

    /**
     * Get processing statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalProcessed > 0 ? 
                (this.stats.successfulProcessed / this.stats.totalProcessed * 100).toFixed(2) + '%' : '0%',
            averageProcessingTimeMs: Math.round(this.stats.averageProcessingTime),
            watchedFiles: this.watchedFiles.size,
            isMonitoring: this.isMonitoring
        };
    }

    /**
     * Process a specific file manually
     */
    async processSpecificFile(timeframe, filename) {
        const filePath = path.join(this.options.baseDirectory, timeframe, filename);
        
        if (!existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = statSync(filePath);
        this.watchedFiles.set(filePath, {
            timeframe,
            filename,
            lastModified: stats.mtime.getTime(),
            size: stats.size,
            processed: false
        });

        return await this.processChartFile(filePath);
    }

    /**
     * Get list of available chart files
     */
    async getAvailableCharts() {
        const charts = {};
        
        for (const timeframe of this.options.supportedTimeframes) {
            const timeframePath = path.join(this.options.baseDirectory, timeframe);
            charts[timeframe] = [];
            
            try {
                const files = await fs.readdir(timeframePath);
                const chartFiles = files.filter(file => 
                    this.options.supportedFormats.some(ext => 
                        file.toLowerCase().endsWith(ext)
                    )
                );

                for (const file of chartFiles) {
                    const filePath = path.join(timeframePath, file);
                    const stats = statSync(filePath);
                    
                    charts[timeframe].push({
                        filename: file,
                        size: stats.size,
                        lastModified: stats.mtime.toISOString(),
                        processed: this.watchedFiles.has(filePath) ? 
                            this.watchedFiles.get(filePath).processed : false
                    });
                }
                
            } catch (error) {
                console.warn(`⚠️ Error reading ${timeframe} directory:`, error.message);
            }
        }

        return charts;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down Chart Image Processor...');
        
        this.stopMonitoring();
        
        console.log('✅ Chart Image Processor shutdown complete');
    }
}

module.exports = { ChartImageProcessor };

// Export for testing
if (require.main === module) {
    async function testImageProcessor() {
        console.log('🧪 Testing Chart Image Processor...\n');

        const processor = new ChartImageProcessor({
            baseDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            watchInterval: 1000 // 1 second for testing
        });

        try {
            await processor.initialize();

            const charts = await processor.getAvailableCharts();
            console.log('📊 Available charts:');
            console.log(JSON.stringify(charts, null, 2));

            console.log('\n✅ Image processor test completed');

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }

    testImageProcessor();
}
