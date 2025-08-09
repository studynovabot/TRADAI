# Firebase Setup Guide for TRADAI Human-in-the-Loop System

## Prerequisites

You already have:
- ✅ Firebase project created (`tradai-64421`)
- ✅ Service account key (`tradai-firebase-privatekey.json`)
- ✅ Firebase configuration in environment files

## Required Steps

### 1. Enable Firebase Services

Visit the Firebase Console: https://console.firebase.google.com/project/tradai-64421

#### Enable Firestore Database
1. Go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in production mode** (we have security rules)
4. Select a location (preferably close to your users)
5. Click **Done**

#### Enable Firebase Storage
1. Go to **Storage** in the left sidebar
2. Click **Get started**
3. Review security rules (we'll update them)
4. Choose the same location as Firestore
5. Click **Done**

#### Enable Authentication
1. Go to **Authentication** in the left sidebar
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password**
5. Enable **Google** (optional but recommended)
6. Add your domain to authorized domains

### 2. Deploy Security Rules

#### Firestore Rules
1. Go to **Firestore Database** → **Rules**
2. Replace the default rules with content from `firestore.rules`
3. Click **Publish**

#### Storage Rules
1. Go to **Storage** → **Rules**
2. Replace the default rules with content from `storage.rules`
3. Click **Publish**

### 3. Create Required Indexes

Go to **Firestore Database** → **Indexes** → **Composite** and create:

1. **Collection**: `predictions`
   - **Fields**: `userId` (Ascending), `timestamp` (Descending)

2. **Collection**: `predictions`
   - **Fields**: `userId` (Ascending), `status` (Ascending), `timestamp` (Descending)

3. **Collection**: `predictions`
   - **Fields**: `status` (Ascending), `modelVersion` (Ascending)

4. **Collection**: `training_queue`
   - **Fields**: `processed` (Ascending), `queuedAt` (Ascending)

### 4. Set Environment Variables

#### For Production (Vercel/Server)
Set this environment variable:
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"tradai-64421",...}'
```

#### For Development
The system will automatically use `tradai-firebase-privatekey.json` file.

### 5. Initialize the System

Once Firestore is enabled, run:
```bash
npm run setup:firebase
```

This will:
- Create initial model version
- Set up collection structure
- Create sample data (development only)
- Verify the setup

### 6. Test the System

```bash
# Test the complete system
npm run test:prediction-system

# Start the development server
npm run dev
```

Then visit: http://localhost:3000/predictions

## Quick Setup Commands

After enabling Firestore in the console:

```bash
# Install dependencies (already done)
npm install

# Setup Firebase collections
npm run setup:firebase

# Test the system
npm run test:prediction-system

# Start development server
npm run dev
```

## Verification Checklist

- [ ] Firestore Database enabled and accessible
- [ ] Firebase Storage enabled and accessible
- [ ] Authentication enabled (Email/Password + Google)
- [ ] Security rules deployed for Firestore
- [ ] Security rules deployed for Storage
- [ ] Required indexes created
- [ ] Environment variables configured
- [ ] Firebase setup script runs successfully
- [ ] Application starts without errors
- [ ] Can create user accounts
- [ ] Can upload images and get predictions
- [ ] Can provide feedback on predictions

## Troubleshooting

### Common Issues

1. **"Cloud Firestore API has not been used"**
   - Enable Firestore Database in Firebase Console
   - Wait 2-3 minutes for propagation

2. **"Permission denied" errors**
   - Check security rules are deployed
   - Verify user authentication
   - Ensure service account has proper permissions

3. **"Index not found" errors**
   - Create the required composite indexes
   - Wait for index creation to complete

4. **Authentication issues**
   - Verify Firebase config in `.env.local`
   - Check authorized domains in Firebase Console
   - Ensure authentication methods are enabled

### Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs
3. Verify Firebase project settings
4. Ensure all APIs are enabled

## Next Steps

Once setup is complete:
1. Create user accounts and test the system
2. Upload chart images and verify predictions
3. Provide feedback and check data storage
4. Monitor system performance and accuracy
5. Plan for model retraining pipeline

---

**Important**: Keep your service account key secure and never commit it to version control!