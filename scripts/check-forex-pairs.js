#!/usr/bin/env node

const axios = require('axios');

async function checkForexPairs() {
  try {
    const response = await axios.get('https://api.twelvedata.com/forex_pairs', {
      params: {
        apikey: '72ada78cc4484a7cad2acec5c5b8097c'
      }
    });
    
    const pairs = response.data.data;
    const usdInrPairs = pairs.filter(pair => 
      (pair.symbol.includes('USD') && pair.symbol.includes('INR')) ||
      (pair.currency_base === 'US Dollar' && pair.currency_quote === 'Indian Rupee') ||
      (pair.currency_base === 'Indian Rupee' && pair.currency_quote === 'US Dollar')
    );
    
    console.log('USD/INR related pairs found:');
    console.log(JSON.stringify(usdInrPairs, null, 2));
    
    // Also check for common patterns
    const commonPairs = pairs.filter(pair => 
      pair.symbol.includes('USD') && 
      ['INR', 'BRL', 'PKR', 'MXN', 'ARS', 'EGP', 'BDT', 'DZD'].some(curr => pair.symbol.includes(curr))
    );
    
    console.log('\nAll USD pairs with our target currencies:');
    console.log(JSON.stringify(commonPairs, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkForexPairs();
