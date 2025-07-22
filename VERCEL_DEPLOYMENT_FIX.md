# Vercel Deployment Fix

This document explains the changes made to fix the deployment issues on Vercel.

## Problem

The deployment was failing on Vercel because the `opencv4nodejs` package requires `cmake` to build during installation, but Vercel's serverless environment doesn't have `cmake` installed.

Error message:
```
npm error ERR! Error: failed to execute cmake --version, cmake is required to build opencv, error is: Error: Command failed: cmake --version
npm error /bin/sh: line 1: cmake: command not found
```

## Solution

The following changes were made to fix the deployment:

1. **Modified package.json**:
   - Added `OPENCV4NODEJS_DISABLE_AUTOBUILD=1` to the `vercel-build` script to prevent OpenCV from trying to build during installation.

2. **Created a mock implementation**:
   - Added `vercel-opencv-fix.js` to provide a mock implementation of OpenCV when running in the Vercel environment.

3. **Updated code to handle Vercel environment**:
   - Modified `src/automation/ChartDataExtractor.js` to use the mock implementation when in Vercel.
   - Modified `src/core/OTCSignalGenerator.js` to use simplified pattern recognition when in Vercel.
   - Updated `scripts/setup-browser-automation.js` to handle the Vercel environment.

4. **Added a health check endpoint**:
   - Created `pages/api/vercel-health.js` to verify that the application is running correctly on Vercel.

5. **Updated vercel.json**:
   - Changed `buildCommand` to use `vercel-build` script.
   - Added environment variables `VERCEL=1` and `OPENCV4NODEJS_DISABLE_AUTOBUILD=1`.
   - Added the health check endpoint to the functions and routes.

## Testing

After deploying to Vercel, you can verify that the application is running correctly by accessing the health check endpoint:

```
https://your-vercel-app.vercel.app/api/health
```

## Local Development

For local development, the application will continue to use OpenCV if it's installed. If not, it will fall back to simplified pattern recognition.

## Notes

- The simplified pattern recognition may not be as accurate as the OpenCV-based recognition, but it should be sufficient for basic functionality.
- If you need to use OpenCV-specific features, consider using a different deployment platform that supports native dependencies or use a pre-built OpenCV package.