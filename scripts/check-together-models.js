#!/usr/bin/env node

const axios = require('axios');

async function checkTogetherModels() {
  try {
    const response = await axios.get('https://api.together.xyz/v1/models', {
      headers: {
        'Authorization': 'Bearer ef4e211e6928ea6a284a38d0a34421b02f4eab6151471d244689a572ebd2f1da'
      }
    });
    
    const models = response.data.data || response.data;
    
    // Filter for chat models that are available
    const chatModels = models.filter(model => 
      model.type === 'chat' && 
      model.display_name && 
      !model.display_name.toLowerCase().includes('deprecated')
    );
    
    console.log('Available Together AI Chat Models:');
    console.log('=================================');
    
    chatModels.slice(0, 20).forEach(model => {
      console.log(`Name: ${model.display_name}`);
      console.log(`ID: ${model.id}`);
      console.log(`Context: ${model.context_length || 'N/A'}`);
      console.log(`Pricing: $${model.pricing?.input || 'N/A'} input, $${model.pricing?.output || 'N/A'} output`);
      console.log('---');
    });
    
    // Look for Llama models specifically
    const llamaModels = chatModels.filter(model => 
      model.display_name.toLowerCase().includes('llama') ||
      model.id.toLowerCase().includes('llama')
    );
    
    console.log('\nLlama Models Available:');
    console.log('======================');
    llamaModels.forEach(model => {
      console.log(`${model.display_name} - ${model.id}`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkTogetherModels();
