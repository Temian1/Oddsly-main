import React, { useState, useEffect } from 'react';
import { useAuth } from '../../authorization/AuthContext';
// import { useAuth, usePremium } from '../../authorization/AuthContext';
import { AuthService } from '../../services/authClient';
import UserAwareApiService from '../../services/userAwareApi';
// Icons removed as they are not currently used in this component

interface UserProfileData {
  fullName: string;
  dateOfBirth: string;
  subscriptionStatus: string;
  oddsApiKey: string;
  apiKeyActive: boolean;
  apiUsageCount?: number;
}

const UserProfile: React.FC = () => {
  const { user, refreshAuth } = useAuth();
  // const isPremium = usePremium(); // Unused variable
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  
  // API key validation state
  const [validatingApiKey, setValidatingApiKey] = useState(false);
  const [apiKeyValidation, setApiKeyValidation] = useState<{
    valid?: boolean;
    error?: string;
    remainingRequests?: number;
  } | null>(null);

  // 2FA State - Currently unused
  // const [show2FASetup, setShow2FASetup] = useState(false);
  // const [twoFASecret, setTwoFASecret] = useState('');
  // const [qrCodeUrl, setQrCodeUrl] = useState('');
  // const [backupCodes, setBackupCodes] = useState<string[]>([]);
  // const [verificationCode, setVerificationCode] = useState('');
  // const [disablePassword, setDisablePassword] = useState('');

  // Initialize profile from user data
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        subscriptionStatus: user.subscriptionStatus || 'free',
        oddsApiKey: user.oddsApiKey || '',
        apiKeyActive: user.apiKeyActive || false,
      });
    }
    setLoading(false);
  }, [user]);

  // Handle API key validation
  const handleValidateApiKey = async () => {
    if (!profile?.oddsApiKey) {
      setApiKeyValidation({ valid: false, error: 'Please enter an API key first' });
      return;
    }

    setValidatingApiKey(true);
    setApiKeyValidation(null);

    try {
      const validation = await UserAwareApiService.validateApiKey(profile.oddsApiKey);
      setApiKeyValidation(validation);
    } catch (error) {
      setApiKeyValidation({
        valid: false,
        error: 'Failed to validate API key. Please try again.',
      });
    } finally {
      setValidatingApiKey(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    if (!user || !profile) {
      setError('User data not available');
      setSaving(false);
      return;
    }

    try {
      await AuthService.updateProfile(user.id, {
        fullName: profile.fullName,
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
        oddsApiKey: profile.oddsApiKey || undefined,
        apiKeyActive: profile.apiKeyActive,
      });
      
      await refreshAuth();
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>

      {success && <div className="mb-4 text-green-500">{success}</div>}
      {error && <div className="mb-4 text-red-500">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            value={profile?.fullName || ''}
            onChange={(e) => setProfile(profile ? { ...profile, fullName: e.target.value } : null)}
            disabled={!editing}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            value={profile?.dateOfBirth || ''}
            onChange={(e) => setProfile(profile ? { ...profile, dateOfBirth: e.target.value } : null)}
            disabled={!editing}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
          />
        </div>

        {/* Subscription Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Subscription Status</label>
          <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100">
            {profile?.subscriptionStatus === 'active' ? (
              <span className="text-green-600">Active Subscription</span>
            ) : (
              <span className="text-gray-600">No Active Subscription</span>
            )}
          </div>
        </div>

        {/* API Key Management */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">API Configuration</h3>
          
          {/* Personal API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Personal Odds API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={profile?.oddsApiKey || ''}
                onChange={(e) => {
                  setProfile(profile ? { ...profile, oddsApiKey: e.target.value } : null);
                  setApiKeyValidation(null); // Clear validation when key changes
                }}
                disabled={!editing}
                placeholder="Enter your personal Odds API key (optional)"
                className="mt-1 flex-1 border border-gray-300 rounded-md shadow-sm p-2"
              />
              {editing && profile?.oddsApiKey && (
                <button
                  type="button"
                  onClick={handleValidateApiKey}
                  disabled={validatingApiKey}
                  className="mt-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {validatingApiKey ? 'Validating...' : 'Validate'}
                </button>
              )}
            </div>
            
            {/* API Key Validation Status */}
            {apiKeyValidation && (
              <div className={`mt-2 p-2 rounded-md text-sm ${
                apiKeyValidation.valid 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {apiKeyValidation.valid ? (
                  <div>
                    ✅ API key is valid!
                    {apiKeyValidation.remainingRequests && (
                      <span className="block mt-1">
                        Remaining requests: {apiKeyValidation.remainingRequests}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    ❌ {apiKeyValidation.error || 'API key is invalid'}
                  </div>
                )}
              </div>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              Optional: Use your own Odds API key for higher rate limits. Get one from{' '}
              <a href="https://the-odds-api.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                the-odds-api.com
              </a>
            </p>
          </div>

          {/* Use Personal API Key Toggle */}
          <div className="mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={profile?.apiKeyActive || false}
                onChange={(e) => setProfile(profile ? { ...profile, apiKeyActive: e.target.checked } : null)}
                disabled={!editing || !profile?.oddsApiKey}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Use my personal API key
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              When enabled, your personal API key will be used instead of the shared one.
              {profile?.apiUsageCount !== undefined && (
                <span className="block mt-1">
                  Current month usage: {profile.apiUsageCount} requests
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Edit and Save Buttons */}
        <div className="flex items-center justify-between">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="py-2 px-4 bg-neon text-white rounded-lg"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                type="submit"
                className="py-2 px-4 bg-neon text-white rounded-lg"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  // Reset profile to original user data
                  if (user) {
                    setProfile({
                      fullName: user.fullName || '',
                      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
                      subscriptionStatus: user.subscriptionStatus || 'free',
                      oddsApiKey: user.oddsApiKey || '',
                      apiKeyActive: user.apiKeyActive || false,
                    });
                  }
                }}
                className="py-2 px-4 bg-gray-500 text-white rounded-lg"
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default UserProfile;
