import React, { useState, useEffect } from 'react';
import { useAuth } from '../../authorization/AuthContext';
// import { useAuth, usePremium } from '../../authorization/AuthContext';
import { AuthService } from '../../services/authClient';
// Icons removed as they are not currently used in this component

interface UserProfileData {
  fullName: string;
  dateOfBirth: string;
  subscriptionStatus: string;
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
      });
    }
    setLoading(false);
  }, [user]);

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
