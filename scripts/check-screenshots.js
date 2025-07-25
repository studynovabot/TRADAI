/**
 * Basic Screenshot Directory Checker
 */

const fs = require('fs');
const path = require('path');

function checkScreenshots() {
    const screenshotPath = 'C:\\Users\\thaku\\Pictures\\trading ss';
    
    console.log('🔍 Checking screenshot directory...');
    console.log(`📁 Path: ${screenshotPath}`);
    
    try {
        // Check if main directory exists
        if (!fs.existsSync(screenshotPath)) {
            console.log('❌ Main directory does not exist');
            return;
        }
        
        console.log('✅ Main directory exists');
        
        // List subdirectories
        const items = fs.readdirSync(screenshotPath);
        console.log(`📂 Found ${items.length} items:`);
        
        items.forEach(item => {
            const itemPath = path.join(screenshotPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                console.log(`  📁 Directory: ${item}`);
                
                // List files in subdirectory
                try {
                    const files = fs.readdirSync(itemPath);
                    console.log(`     Contains ${files.length} files:`);
                    
                    files.forEach(file => {
                        const filePath = path.join(itemPath, file);
                        const fileStat = fs.statSync(filePath);
                        const ext = path.extname(file).toLowerCase();
                        const sizeKB = Math.round(fileStat.size / 1024);
                        
                        if (['.png', '.jpg', '.jpeg', '.bmp', '.gif'].includes(ext)) {
                            console.log(`     📸 ${file} (${sizeKB}KB)`);
                        } else {
                            console.log(`     📄 ${file} (${sizeKB}KB)`);
                        }
                    });
                } catch (error) {
                    console.log(`     ❌ Error reading directory: ${error.message}`);
                }
            } else {
                const sizeKB = Math.round(stat.size / 1024);
                console.log(`  📄 File: ${item} (${sizeKB}KB)`);
            }
        });
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

checkScreenshots();
