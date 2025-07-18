/* ++++++++++ 2FA AUTHENTICATION UI COMPONENT ++++++++++ */
import React, { useState, useEffect } from 'react';
import { AuthService, TwoFASetup } from '../../services/authClient';
import { useAuth } from '../../contexts/AuthContext';

interface TwoFactorAuthProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface TwoFactorSetupProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface TwoFactorVerifyProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// 2FA Setup Component
export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [twoFAData, setTwoFAData] = useState<TwoFASetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleSetup2FA = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const setup = await AuthService.setup2FA(user.id);
      setTwoFAData(setup);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!user || !verificationCode) return;
    
    setLoading(true);
    setError('');
    
    try {
      await AuthService.verify2FA(user.id, verificationCode);
      setShowBackupCodes(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess?.();
    onClose();
  };

  useEffect(() => {
    if (step === 'setup') {
      handleSetup2FA();
    }
  }, [step]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {showBackupCodes ? 'Backup Codes' : 'Setup Two-Factor Authentication'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {showBackupCodes ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
            </p>
            <div className="bg-gray-100 p-4 rounded mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                {twoFAData?.backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Complete Setup
              </button>
            </div>
          </div>
        ) : step === 'setup' ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Setting up two-factor authentication...
            </p>
            {loading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to verify.
            </p>
            
            {twoFAData?.qrCodeUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={twoFAData.qrCodeUrl} 
                  alt="2FA QR Code" 
                  className="border rounded"
                />
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                maxLength={6}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify2FA}
                disabled={loading || verificationCode.length !== 6}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 2FA Verification Component (for login)
export const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ onClose, onSuccess }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!verificationCode) return;
    
    setLoading(true);
    setError('');
    
    try {
      // This would be handled by the login flow
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Two-Factor Authentication
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 mb-4">
            {useBackupCode 
              ? 'Enter one of your backup codes:'
              : 'Enter the 6-digit code from your authenticator app:'}
          </p>
          
          <div className="mb-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                if (useBackupCode) {
                  setVerificationCode(e.target.value.toUpperCase().slice(0, 8));
                } else {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              placeholder={useBackupCode ? 'ABCD1234' : '000000'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
              maxLength={useBackupCode ? 8 : 6}
            />
          </div>
          
          <div className="mb-4">
            <button
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setVerificationCode('');
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
            </button>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || !verificationCode || (!useBackupCode && verificationCode.length !== 6)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2FA Management Component (for settings)
export const TwoFactorManagement: React.FC = () => {
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDisable2FA = async () => {
    if (!user || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      await AuthService.disable2FA(user.id, password);
      setSuccess('Two-factor authentication has been disabled');
      setShowDisable(false);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Two-Factor Authentication
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {user?.twoFaEnabled 
              ? 'Two-factor authentication is enabled for your account.'
              : 'Add an extra layer of security to your account.'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Status: {user?.twoFaEnabled ? (
              <span className="text-green-600 font-medium">Enabled</span>
            ) : (
              <span className="text-red-600 font-medium">Disabled</span>
            )}
          </p>
        </div>
        
        <div>
          {user?.twoFaEnabled ? (
            <button
              onClick={() => setShowDisable(true)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Enable 2FA
            </button>
          )}
        </div>
      </div>
      
      {/* Setup Modal */}
      {showSetup && (
        <TwoFactorSetup
          onClose={() => setShowSetup(false)}
          onSuccess={() => {
            setSuccess('Two-factor authentication has been enabled');
            window.location.reload(); // Refresh to update user state
          }}
        />
      )}
      
      {/* Disable Modal */}
      {showDisable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Disable Two-Factor Authentication
              </h2>
              <button
                onClick={() => {
                  setShowDisable(false);
                  setPassword('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Enter your password to disable two-factor authentication:
            </p>
            
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDisable(false);
                  setPassword('');
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={loading || !password}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorManagement;