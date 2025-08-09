/**
 * Firebase Admin SDK Configuration
 * Server-side only - handles secure operations
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App} Firebase Admin App instance
 */
function initializeFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    let serviceAccount;
    
    // Try to get service account from environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log('✅ Using Firebase service account from environment variable');
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError.message);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format');
      }
    } else {
      // Fallback to local file (development only)
      const serviceAccountPath = path.join(process.cwd(), 'tradai-firebase-privatekey.json');
      if (fs.existsSync(serviceAccountPath)) {
        try {
          serviceAccount = require(serviceAccountPath);
          console.warn('⚠️  Using local service account file. This should only be used in development!');
        } catch (requireError) {
          console.error('❌ Failed to load service account file:', requireError.message);
          throw new Error('Invalid service account file format');
        }
      } else {
        // For build time or when no credentials are available, create a mock configuration
        console.warn('⚠️  No Firebase credentials found, using mock configuration');
        serviceAccount = {
          type: "service_account",
          project_id: "tradai-64421",
          private_key_id: "mock-key-id",
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4a478fE5S7QU8\noW+t/hA9KBOCBr4mVBU/zqG+kc/OBCvjXYrwrq/s5yezOUufwHgA0IQ5uH5ojkxB\nyGHxdrv6q5tI4zMpS+V23PXF9/vJpiJPfualxLNbTwrQDvHK9G4IboKTAcgTcow0\nudRU1Alz+ZuhRn1qKjyDRlvkSzKxi6zgTT/J29VteoWREv0V3478MgNdW3JxsxKP\n96/4NljzKXMAAzxXWS2ftBoEmrEvBm8bsf/cX/7Qxpa1VvmbUue/pJIbVgYacnlK\n8Jv9z1ROhxrDhjH7MC2bNMo291oB/Q1YRPcM7EGDTynNU7fvNrKuzRMgzNxgOBcz\nEyW1ghM3AgMBAAECggEAAsgYiYVkdwq9K/txYEn3O7zpgmoQnypggaxfsyym2kAk\n21KTYGr6G1QnPKROGDRCexyqCebW/UO8MbfQhmBYmIDTIEfRAzvyU5ckm95QLWv0\nk4dh+jkbzXJFQvseuYVzTWxBSu9ZcbWmGLt+0OK728R1jPqvtJS7ge1jQG/D7Xqb\nyJxNvTnEMdfrRDzTO3XSE7LTCnu4oljrrtxX+0fujRiceECU9W7GzDfKj+tRmKdF\nBpv3jA+/vFg+SeeCGc/OXVNH9zt4zLWSPra1A97xmF+oAPKIAYLKd8ci+uYBvNQs\nHc18yOGMseAXm2Amvj9VAIKd6XNIJrCwvFRl0YGuFQKBgQDocJ7TdBQYUY2Bvn0m\n3SunVl2dcOQgfIGn+O4TNRyNWHsOriTPkyRV8+lxrTmxfudTVH2zgCyqi+SaDf21\ncvlYa9bbpvmyU5ASs0mq5gtglqNjfy9V6dAiLCYP9ny/m67egBHESoUfoSxK1Oku\nplHNuTIKyVcc/5NAITtN8f6eZQKBgQDLHOpJPGYf4X8t/tjKXTR6Wp8+3ieGQO4S\n+4Ohx6fCRhUwbhWIWAWmFAHgfC9FXD9ODSFaNUbvPkjESaazDAQNKCDE9C69IlZO\nLLTeCalqYK2fBpBdaqVTq8LHtauDyBfPzlT46WwIhd2ZUEW7COgyTiU3t57E8+oB\nqpsS9wzzawKBgQCFSO8KOam8OCd4mo6RVonNrsyHl1B5AGwosalzAiWZN39474rU\nLH/NecwHD1nh2e8z7WMXJwx1zzoKzLMK9R7eARh3Y8wS4a/fyUcY5Ejp3fda+nde\nQHDE56P7y0/FX7Rqie2mLUUg2f7X+jasNVr7KJL1dHarfjIlt+iVzYo/sQKBgBcG\n8jDXXiSjJg4K5H0c0ARHHeK8wPJhjhws06GVxxkpZOGWuW45vHo1rnjK23kbmjm5\nF1zoyV/6SbmnN/T4mcT8Far+nAXpTKuUOfUqV0CuMUDkN52/p3qy8GQ/3nAUUU7H\n765AmHTm6FanWSB5RAnf/iww7xkZJiCGPQqLY7Z9AoGAOatc+lGWNfCNoVQIIzKO\nV5Wioe3kRFeqSHQQbj0pKynVRIBXgDLjCC5vMXPGcMMyvN10Zzvewz9chTvVtzpk\npctpKknlo9UDaK0jiNgxm4kVOoXENGyyYR7yehn/om2c2R+BLh8tE17oJalqoYLc\nEaHQSrJp9agEWty2y0YBGp0=\n-----END PRIVATE KEY-----\n",
          client_email: "firebase-adminsdk-fbsvc@tradai-64421.iam.gserviceaccount.com",
          client_id: "107215481411718125785",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token"
        };
      }
    }

    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Service account is missing required fields (project_id, private_key, client_email)');
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });

    console.log('✅ Firebase Admin initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    
    // For build time, don't throw error, just log it
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
      console.warn('🔧 Firebase initialization failed during build, this is expected');
      return null;
    }
    
    throw error;
  }
}

/**
 * Get Firestore database instance
 * @returns {admin.firestore.Firestore}
 */
function getFirestore() {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase not initialized. Check your configuration.');
  }
  return admin.firestore(app);
}

/**
 * Get Firebase Storage bucket
 * @returns {admin.storage.Bucket}
 */
function getStorageBucket() {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase not initialized. Check your configuration.');
  }
  return admin.storage(app).bucket();
}

/**
 * Get Firebase Auth instance
 * @returns {admin.auth.Auth}
 */
function getAuth() {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase not initialized. Check your configuration.');
  }
  return admin.auth(app);
}

/**
 * Check if Firebase is properly configured
 * @returns {boolean}
 */
function isFirebaseConfigured() {
  try {
    return !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 
             fs.existsSync(path.join(process.cwd(), 'tradai-firebase-privatekey.json')));
  } catch {
    return false;
  }
}

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
async function verifyIdToken(idToken) {
  const auth = getAuth();
  return await auth.verifyIdToken(idToken);
}

/**
 * Middleware to verify Firebase authentication
 * @param {import('next').NextApiRequest} req 
 * @param {import('next').NextApiResponse} res 
 * @param {Function} next 
 */
async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    
    // Add user info to request
    req.user = decodedToken;
    
    if (next) {
      next();
    }
    return decodedToken;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Check if user has admin privileges
 * @param {admin.auth.DecodedIdToken} user 
 * @returns {boolean}
 */
function isAdmin(user) {
  return user.admin === true || user.role === 'admin';
}

module.exports = {
  initializeFirebaseAdmin,
  getFirestore,
  getStorageBucket,
  getAuth,
  verifyIdToken,
  verifyAuth,
  isAdmin,
  isFirebaseConfigured,
  admin
};