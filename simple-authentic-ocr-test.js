#!/usr/bin/env node

/**
 * Simple Authentic OCR Test
 * 
 * Tests real OCR functionality on Camera Roll screenshots
 * and generates authentic trading signals with no mock data.
 */

const fs = require('fs');
const path = require('path');

async function testAuthenticOCR() {
    console.log('🎯 === SIMPLE AUTHENTIC OCR TEST ===');
    console.log('⏰ Started:', new Date().toISOString());
    console.log('🚫 NO MOCK DATA ALLOWED');
    console.log('');

    const screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
    
    // Check directory
    if (!fs.existsSync(screenshotDir)) {
        console.log('❌ Directory not found:', screenshotDir);
        return;
    }

    // Get screenshots
    const files = fs.readdirSync(screenshotDir);
    const screenshots = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg'].includes(ext);
    });

    console.log(`📸 Found ${screenshots.length} screenshots`);
    console.log('');

    // Test first screenshot
    if (screenshots.length > 0) {
        const testFile = screenshots[0];
        console.log(`🧪 Testing: ${testFile}`);
        
        try {
            const signal = await analyzeScreenshotForSignal(path.join(screenshotDir, testFile), testFile);
            console.log('✅ SUCCESS!');
            console.log(`📈 Signal: ${signal.direction}`);
            console.log(`🎯 Confidence: ${signal.confidence}%`);
            console.log(`💰 Prices found: ${signal.pricesFound}`);
            console.log(`⏱️ Processing time: ${signal.processingTime}ms`);
            
        } catch (error) {
            console.log('❌ FAILED:', error.message);
        }
    } else {
        console.log('❌ No screenshots found');
    }

    console.log('');
    console.log('⏰ Test completed:', new Date().toISOString());
}

async function analyzeScreenshotForSignal(imagePath, filename) {
    console.log('   🔍 Starting OCR analysis...');
    
    // Import OCR library
    const Tesseract = require('tesseract.js');

    // Create OCR worker (updated syntax)
    const worker = await Tesseract.createWorker('eng');
    
    console.log('   📊 Running OCR...');
    const startTime = Date.now();
    
    // Perform OCR
    const { data } = await worker.recognize(imagePath);
    const processingTime = Date.now() - startTime;
    
    await worker.terminate();
    
    console.log(`   📝 Extracted ${data.text.length} characters`);
    
    if (data.text.length === 0) {
        throw new Error('No text extracted from image');
    }
    
    // Extract prices
    const prices = extractPrices(data.text);
    console.log(`   💰 Found ${prices.length} price values`);
    
    if (prices.length < 2) {
        throw new Error('Insufficient price data for signal generation');
    }
    
    // Generate signal
    const signal = generateSignalFromPrices(prices);
    
    // Calculate confidence
    const confidence = calculateConfidence(prices.length, data.confidence, data.text.length);
    
    return {
        filename: filename,
        direction: signal.direction,
        confidence: confidence,
        pricesFound: prices.length,
        processingTime: processingTime,
        ocrConfidence: data.confidence,
        textLength: data.text.length
    };
}

function extractPrices(text) {
    // Extract price patterns
    const pricePattern = /\b\d{1,3}\.?\d{2,5}\b/g;
    const matches = text.match(pricePattern) || [];
    
    const prices = matches
        .map(match => parseFloat(match))
        .filter(price => price > 0 && price < 100000)
        .filter((price, index, arr) => arr.indexOf(price) === index);
    
    return prices.sort((a, b) => a - b);
}

function generateSignalFromPrices(prices) {
    if (prices.length < 2) {
        return { direction: 'NO_SIGNAL', trend: 'insufficient_data' };
    }
    
    // Calculate price movement
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceChange = lastPrice - firstPrice;
    const percentChange = (priceChange / firstPrice) * 100;
    
    // Count up/down movements
    let upMoves = 0;
    let downMoves = 0;
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) upMoves++;
        else if (prices[i] < prices[i - 1]) downMoves++;
    }
    
    // Determine signal
    let direction;
    if (Math.abs(percentChange) < 0.01) {
        direction = 'NO_SIGNAL';
    } else if (percentChange > 0 && upMoves > downMoves) {
        direction = 'UP';
    } else if (percentChange < 0 && downMoves > upMoves) {
        direction = 'DOWN';
    } else {
        direction = 'NO_SIGNAL';
    }
    
    return {
        direction: direction,
        trend: percentChange > 0 ? 'bullish' : 'bearish',
        percentChange: percentChange
    };
}

function calculateConfidence(priceCount, ocrConfidence, textLength) {
    let confidence = 0;
    
    // OCR quality (max 40%)
    confidence += Math.min(ocrConfidence || 0, 40);
    
    // Price data quality (max 30%)
    if (priceCount >= 5) confidence += 30;
    else if (priceCount >= 3) confidence += 20;
    else if (priceCount >= 2) confidence += 10;
    
    // Text extraction quality (max 30%)
    if (textLength >= 100) confidence += 30;
    else if (textLength >= 50) confidence += 20;
    else if (textLength >= 20) confidence += 10;
    
    return Math.min(Math.round(confidence), 100);
}

// Run the test
if (require.main === module) {
    testAuthenticOCR().catch(console.error);
}

module.exports = { testAuthenticOCR };
