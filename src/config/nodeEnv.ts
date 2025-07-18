/**
 * Node.js Environment Configuration
 * Provides environment variable access for Node.js scripts (like seed.ts)
 * that cannot use Vite's import.meta.env
 */

export const getNodeEnvVar = (key: string, fallback?: string): string => {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const NODE_CONFIG = {
  // API Configuration
  ODDS_API_KEY: getNodeEnvVar('VITE_ODDS_API_KEY'),
  API_BASE_URL: getNodeEnvVar('VITE_API_BASE_URL', 'https://api.the-odds-api.com/v4'),
  
  // Database Configuration
  DATABASE_URL: getNodeEnvVar('DATABASE_URL'),
  
  // Admin Configuration
  ADMIN_EMAIL: getNodeEnvVar('ADMIN_EMAIL', 'admin@oddsly.com'),
  ADMIN_PASSWORD: getNodeEnvVar('ADMIN_PASSWORD', 'Admin123!@#'),
  
  // Feature Flags
  SEED_SAMPLE_DATA: getNodeEnvVar('SEED_SAMPLE_DATA', 'false') === 'true',
};

/**
 * Validates that all required environment variables are present
 * Call this at the start of Node.js scripts
 */
export const validateNodeEnvironment = (): void => {
  try {
    // Test access to all required variables
    NODE_CONFIG.ODDS_API_KEY;
    NODE_CONFIG.DATABASE_URL;
    console.log('✅ Node.js environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
};