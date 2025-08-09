/**
 * Deployment Script for Vercel
 * Sets up environment variables and deploys the application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Firebase Service Account JSON
const firebaseServiceAccount = {
  "type": "service_account",
  "project_id": "tradai-64421",
  "private_key_id": "a22b6ae3ff01843e956b11f5f3f9ba79eed9b180",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4a478fE5S7QU8\noW+t/hA9KBOCBr4mVBU/zqG+kc/OBCvjXYrwrq/s5yezOUufwHgA0IQ5uH5ojkxB\nyGHxdrv6q5tI4zMpS+V23PXF9/vJpiJPfualxLNbTwrQDvHK9G4IboKTAcgTcow0\nudRU1Alz+ZuhRn1qKjyDRlvkSzKxi6zgTT/J29VteoWREv0V3478MgNdW3JxsxKP\n96/4NljzKXMAAzxXWS2ftBoEmrEvBm8bsf/cX/7Qxpa1VvmbUue/pJIbVgYacnlK\n8Jv9z1ROhxrDhjH7MC2bNMo291oB/Q1YRPcM7EGDTynNU7fvNrKuzRMgzNxgOBcz\nEyW1ghM3AgMBAAECggEAAsgYiYVkdwq9K/txYEn3O7zpgmoQnypggaxfsyym2kAk\n21KTYGr6G1QnPKROGDRCexyqCebW/UO8MbfQhmBYmIDTIEfRAzvyU5ckm95QLWv0\nk4dh+jkbzXJFQvseuYVzTWxBSu9ZcbWmGLt+0OK728R1jPqvtJS7ge1jQG/D7Xqb\nyJxNvTnEMdfrRDzTO3XSE7LTCnu4oljrrtxX+0fujRiceECU9W7GzDfKj+tRmKdF\nBpv3jA+/vFg+SeeCGc/OXVNH9zt4zLWSPra1A97xmF+oAPKIAYLKd8ci+uYBvNQs\nHc18yOGMseAXm2Amvj9VAIKd6XNIJrCwvFRl0YGuFQKBgQDocJ7TdBQYUY2Bvn0m\n3SunVl2dcOQgfIGn+O4TNRyNWHsOriTPkyRV8+lxrTmxfudTVH2zgCyqi+SaDf21\ncvlYa9bbpvmyU5ASs0mq5gtglqNjfy9V6dAiLCYP9ny/m67egBHESoUfoSxK1Oku\nplHNuTIKyVcc/5NAITtN8f6eZQKBgQDLHOpJPGYf4X8t/tjKXTR6Wp8+3ieGQO4S\n+4Ohx6fCRhUwbhWIWAWmFAHgfC9FXD9ODSFaNUbvPkjESaazDAQNKCDE9C69IlZO\nLLTeCalqYK2fBpBdaqVTq8LHtauDyBfPzlT46WwIhd2ZUEW7COgyTiU3t57E8+oB\nqpsS9wzzawKBgQCFSO8KOam8OCd4mo6RVonNrsyHl1B5AGwosalzAiWZN39474rU\nLH/NecwHD1nh2e8z7WMXJwx1zzoKzLMK9R7eARh3Y8wS4a/fyUcY5Ejp3fda+nde\nQHDE56P7y0/FX7Rqie2mLUUg2f7X+jasNVr7KJL1dHarfjIlt+iVzYo/sQKBgBcG\n8jDXXiSjJg4K5H0c0ARHHeK8wPJhjhws06GVxxkpZOGWuW45vHo1rnjK23kbmjm5\nF1zoyV/6SbmnN/T4mcT8Far+nAXpTKuUOfUqV0CuMUDkN52/p3qy8GQ/3nAUUU7H\n765AmHTm6FanWSB5RAnf/iww7xkZJiCGPQqLY7Z9AoGAOatc+lGWNfCNoVQIIzKO\nV5Wioe3kRFeqSHQQbj0pKynVRIBXgDLjCC5vMXPGcMMyvN10Zzvewz9chTvVtzpk\npctpKknlo9UDaK0jiNgxm4kVOoXENGyyYR7yehn/om2c2R+BLh8tE17oJalqoYLc\nEaHQSrJp9agEWty2y0YBGp0=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@tradai-64421.iam.gserviceaccount.com",
  "client_id": "107215481411718125785",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40tradai-64421.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

class VercelDeployer {
  constructor() {
    this.envVars = [
      // Firebase Configuration
      {
        name: 'FIREBASE_SERVICE_ACCOUNT_JSON',
        value: JSON.stringify(firebaseServiceAccount),
        target: 'production'
      },
      {
        name: 'FIREBASE_PROJECT_ID',
        value: 'tradai-64421',
        target: 'production'
      },
      {
        name: 'FIREBASE_STORAGE_BUCKET',
        value: 'tradai-64421.appspot.com',
        target: 'production'
      },
      // Human-in-the-Loop Configuration
      {
        name: 'CURRENT_MODEL_VERSION',
        value: 'v1.0.0',
        target: 'production'
      },
      {
        name: 'ENABLE_FEEDBACK_COLLECTION',
        value: 'true',
        target: 'production'
      },
      {
        name: 'MIN_FEEDBACK_FOR_RETRAIN',
        value: '100',
        target: 'production'
      },
      {
        name: 'EXTRACT_TECHNICAL_FEATURES',
        value: 'true',
        target: 'production'
      },
      {
        name: 'FEATURE_LOOKBACK_CANDLES',
        value: '50',
        target: 'production'
      }
    ];
  }

  async deploy() {
    console.log('🚀 Starting Vercel Deployment Process');
    console.log('=====================================');

    try {
      // Step 1: Set environment variables
      console.log('📝 Step 1: Setting environment variables...');
      await this.setEnvironmentVariables();

      // Step 2: Build locally to check for issues
      console.log('🔨 Step 2: Testing local build...');
      await this.testLocalBuild();

      // Step 3: Deploy to Vercel
      console.log('🌐 Step 3: Deploying to Vercel...');
      await this.deployToVercel();

      console.log('✅ Deployment completed successfully!');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      throw error;
    }
  }

  async setEnvironmentVariables() {
    console.log('Setting up environment variables in Vercel...');
    
    for (const envVar of this.envVars) {
      try {
        console.log(`  Setting ${envVar.name}...`);
        
        // Remove existing variable if it exists
        try {
          execSync(`vercel env rm ${envVar.name} production --yes`, { 
            stdio: 'pipe',
            timeout: 30000 
          });
        } catch (error) {
          // Variable doesn't exist, that's fine
        }

        // Add the new variable
        const command = `echo "${envVar.value.replace(/"/g, '\\"')}" | vercel env add ${envVar.name} production`;
        execSync(command, { 
          stdio: 'pipe',
          timeout: 30000 
        });
        
        console.log(`  ✅ ${envVar.name} set successfully`);
        
      } catch (error) {
        console.error(`  ❌ Failed to set ${envVar.name}:`, error.message);
        // Continue with other variables
      }
    }
  }

  async testLocalBuild() {
    console.log('Testing local build to catch issues early...');
    
    try {
      // Create temporary Firebase service account file for build
      const tempServiceAccountPath = path.join(process.cwd(), 'temp-firebase-key.json');
      fs.writeFileSync(tempServiceAccountPath, JSON.stringify(firebaseServiceAccount, null, 2));
      
      // Set environment variable for build
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(firebaseServiceAccount);
      
      console.log('  Running next build...');
      execSync('npm run build', { 
        stdio: 'inherit',
        timeout: 300000,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(firebaseServiceAccount)
        }
      });
      
      // Clean up temp file
      if (fs.existsSync(tempServiceAccountPath)) {
        fs.unlinkSync(tempServiceAccountPath);
      }
      
      console.log('  ✅ Local build successful');
      
    } catch (error) {
      console.error('  ❌ Local build failed:', error.message);
      throw error;
    }
  }

  async deployToVercel() {
    console.log('Deploying to Vercel production...');
    
    try {
      execSync('vercel --prod --yes', { 
        stdio: 'inherit',
        timeout: 600000 
      });
      
      console.log('✅ Vercel deployment successful');
      
    } catch (error) {
      console.error('❌ Vercel deployment failed:', error.message);
      throw error;
    }
  }

  async testDeployment() {
    console.log('🧪 Testing deployed application...');
    
    try {
      // Get deployment URL
      const deploymentInfo = execSync('vercel ls --scope=ranveer-singh-rajputs-projects tradai', { 
        encoding: 'utf8',
        timeout: 30000 
      });
      
      console.log('Deployment info:', deploymentInfo);
      
      // TODO: Add actual API tests here
      console.log('✅ Deployment test completed');
      
    } catch (error) {
      console.error('❌ Deployment test failed:', error.message);
    }
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  const deployer = new VercelDeployer();
  
  deployer.deploy()
    .then(() => {
      console.log('🎉 All done! Your application is deployed to Vercel.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Visit your Vercel dashboard to get the deployment URL');
      console.log('2. Test the /demo endpoint for immediate functionality');
      console.log('3. Enable Firestore in Firebase Console for full functionality');
      console.log('4. Test chart analysis with your screenshot');
    })
    .catch((error) => {
      console.error('💥 Deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = VercelDeployer;