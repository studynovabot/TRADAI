/**
 * This file provides a mock implementation of opencv4nodejs for Vercel deployment
 * It will be used when the real opencv4nodejs cannot be loaded
 */

// Create a mock object that will be used when opencv4nodejs is not available
const mockOpenCV = {
  // Add any methods that your code might use
  imreadAsync: async () => {
    throw new Error('OpenCV not available in this environment');
  },
  COLOR_BGR2GRAY: 'COLOR_BGR2GRAY',
  // Add other constants and methods as needed
};

// Export the mock
module.exports = mockOpenCV;