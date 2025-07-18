/**
 * Supabase Test Component
 * 
 * This component demonstrates the Supabase integration by testing
 * the connection and displaying database information.
 * 
 * Usage: Import and use this component anywhere in your app to verify
 * that Supabase is properly configured and connected.
 */

import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

interface TestResult {
  success: boolean;
  error: string | null;
  data: any;
  message?: string;
}

interface DatabaseHealth {
  timestamp: string;
  tables: {
    users: { accessible: boolean; count: number; error?: string };
    sports: { accessible: boolean; count: number; error?: string };
    platforms: { accessible: boolean; count: number; error?: string };
  };
  overall: boolean;
}

const SupabaseTest: React.FC = () => {
  const [connectionTest, setConnectionTest] = useState<TestResult | null>(null);
  const [healthCheck, setHealthCheck] = useState<{ success: boolean; data: DatabaseHealth | null; error: string | null } | null>(null);
  const [sportsData, setSportsData] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  const runTests = async () => {
    setLoading(true);
    
    try {
      // Test 1: Basic connection test
      console.log('Running Supabase connection test...');
      const connectionResult = await supabaseService.testConnection();
      setConnectionTest(connectionResult);

      // Test 2: Database health check
      console.log('Running database health check...');
      const healthResult = await supabaseService.getDatabaseHealth();
      setHealthCheck(healthResult);

      // Test 3: Fetch sports data
      console.log('Fetching sports data...');
      const sportsResult = await supabaseService.getSports();
      setSportsData(sportsResult);

    } catch (error) {
      console.error('Error running Supabase tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetTests = () => {
    setConnectionTest(null);
    setHealthCheck(null);
    setSportsData(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Supabase Integration Test</h2>
        
        {/* Configuration Status */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Configuration Status</h3>
          <div className={`p-3 rounded-md ${configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {configured ? (
              <span>✅ Supabase environment variables are configured</span>
            ) : (
              <span>❌ Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)</span>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={loading || !configured}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mr-2"
          >
            {loading ? 'Running Tests...' : 'Run Supabase Tests'}
          </button>
          <button
            onClick={resetTests}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>

        {/* Test Results */}
        {(connectionTest || healthCheck || sportsData) && (
          <div className="space-y-6">
            {/* Connection Test Result */}
            {connectionTest && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Connection Test</h3>
                <div className={`p-3 rounded-md ${connectionTest.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {connectionTest.success ? (
                    <div>
                      <span>✅ {connectionTest.message}</span>
                      {connectionTest.data && connectionTest.data.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm">Sample users found:</p>
                          <ul className="text-xs mt-1">
                            {connectionTest.data.slice(0, 3).map((user: any, index: number) => (
                              <li key={index}>• {user.email} (ID: {user.id})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>❌ Connection failed: {connectionTest.error}</span>
                  )}
                </div>
              </div>
            )}

            {/* Health Check Result */}
            {healthCheck && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Database Health Check</h3>
                {healthCheck.success && healthCheck.data ? (
                  <div className="space-y-2">
                    <div className={`p-2 rounded-md ${healthCheck.data.overall ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {healthCheck.data.overall ? '✅ All tables accessible' : '⚠️ Some tables have issues'}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(healthCheck.data.tables).map(([tableName, tableInfo]) => (
                        <div key={tableName} className={`p-2 rounded border ${tableInfo.accessible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="font-medium">{tableName}</div>
                          <div className="text-xs">
                            {tableInfo.accessible ? (
                              <span className="text-green-600">✅ {tableInfo.count} records</span>
                            ) : (
                              <span className="text-red-600">❌ {tableInfo.error}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">Last checked: {new Date(healthCheck.data.timestamp).toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="p-3 rounded-md bg-red-100 text-red-800">
                    ❌ Health check failed: {healthCheck.error}
                  </div>
                )}
              </div>
            )}

            {/* Sports Data Result */}
            {sportsData && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Sports Data Test</h3>
                <div className={`p-3 rounded-md ${sportsData.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {sportsData.success ? (
                    <div>
                      <span>✅ Successfully fetched sports data</span>
                      {sportsData.data && sportsData.data.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm">Found {sportsData.data.length} sports:</p>
                          <ul className="text-xs mt-1 grid grid-cols-2 gap-1">
                            {sportsData.data.map((sport: any, index: number) => (
                              <li key={index}>• {sport.display_name} ({sport.key})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>❌ Failed to fetch sports: {sportsData.error}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Setup Instructions</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>1. Update your .env file with actual Supabase credentials:</p>
            <code className="block bg-blue-100 p-2 rounded text-xs">
              VITE_SUPABASE_URL="https://your-project-id.supabase.co"<br/>
              VITE_SUPABASE_ANON_KEY="your-public-anon-key"
            </code>
            <p>2. Update DATABASE_URL to point to your Supabase PostgreSQL instance</p>
            <p>3. Run Prisma migrations: <code className="bg-blue-100 px-1 rounded">npm run db:migrate</code></p>
            <p>4. Test the connection using the button above</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseTest;