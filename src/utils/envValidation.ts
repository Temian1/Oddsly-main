/**
 * Environment Variable Validation Utility
 * Ensures all required environment variables are available in production
 */

export interface EnvConfig {
  VITE_ODDS_API_KEY?: string;
  VITE_BACKEND_URL?: string;
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(key: string, fallback?: string): string {
  const value = import.meta.env[key] || fallback;
  if (!value) {
    console.warn(`Missing environment variable: ${key}`);
    return '';
  }
  return value;
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for required environment variables
  const requiredVars = [
    'VITE_ODDS_API_KEY'
  ];
  
  const optionalVars = [
    'VITE_BACKEND_URL'
  ];
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });
  
  // Warn about missing optional variables
  optionalVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      console.warn(`Optional environment variable not set: ${varName}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get environment configuration object
 */
export function getEnvConfig(): EnvConfig {
  return {
    VITE_ODDS_API_KEY: getEnvVar('VITE_ODDS_API_KEY'),
    VITE_BACKEND_URL: getEnvVar('VITE_BACKEND_URL', '/api')
  };
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Log environment status (development only)
 */
export function logEnvironmentStatus(): void {
  if (isDevelopment()) {
    console.log('🔧 Environment Status:');
    console.log('Mode:', import.meta.env.MODE);
    console.log('DEV:', import.meta.env.DEV);
    console.log('PROD:', import.meta.env.PROD);
    
    const validation = validateEnvironment();
    if (validation.valid) {
      console.log('✅ All required environment variables are set');
    } else {
      console.warn('⚠️ Environment validation issues:', validation.errors);
    }
    
    const config = getEnvConfig();
    console.log('📋 Environment Config:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`${key}:`, value ? '✅ Set' : '❌ Missing');
    });
  }
}