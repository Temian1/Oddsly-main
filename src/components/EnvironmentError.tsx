import React from 'react';
import { validateEnvironment } from '../utils/envValidation';

interface EnvironmentErrorProps {
  errors: string[];
}

const EnvironmentError: React.FC<EnvironmentErrorProps> = ({ errors }) => {
  return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center p-4">
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">Configuration Error</h2>
        <p className="text-gray-300 mb-4">
          The application is missing required environment variables. Please check your deployment configuration.
        </p>
        <div className="bg-gray-800 rounded p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">Missing Variables:</h3>
          <ul className="list-disc list-inside text-gray-300">
            {errors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">How to fix:</h3>
          <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1">
            <li>Create a <code className="bg-gray-700 px-1 rounded">.env</code> file in your project root</li>
            <li>Copy the contents from <code className="bg-gray-700 px-1 rounded">.env.example</code></li>
            <li>Fill in the required values for your environment</li>
            <li>For Vercel deployment, add these variables in your Vercel dashboard under Settings → Environment Variables</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

// Component that checks environment and renders error if needed
export const EnvironmentGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const validation = validateEnvironment();
  
  if (!validation.valid) {
    return <EnvironmentError errors={validation.errors} />;
  }
  
  return <>{children}</>;
};

export default EnvironmentError;