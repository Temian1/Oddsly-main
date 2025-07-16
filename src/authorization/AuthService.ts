/* ++++++++++++++++++++ AUTHENTICATION SERVICE ++++++++++++++++++++ */
import { AuthService } from '../services/authMock';

/* ++++++++++ SIGN UP ++++++++++ */
export const signUp = async (
  email: string,
  password: string,
  additionalData?: { fullName: string; dateOfBirth: string }
) => {
  try {
    const registerData = {
      email,
      password,
      fullName: additionalData?.fullName,
      dateOfBirth: additionalData?.dateOfBirth ? new Date(additionalData.dateOfBirth) : undefined,
    };
    
    const result = await AuthService.register(registerData);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to sign up");
    }
  }
};


/* ++++++++++ SIGN IN ++++++++++ */

export const signIn = async (email: string, password: string, twoFaCode?: string) => {
  try {
    const credentials = {
      email,
      password,
      twoFaCode,
    };
    
    const result = await AuthService.login(credentials);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to sign in');
    }
  }
};

/* ++++++++++ SIGN OUT ++++++++++ */
export const signOut = async (refreshToken: string) => {
  try {
    await AuthService.logout(refreshToken);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to sign out');
    }
  }
};

/* ++++++++++ FORGOT PASSWORD ++++++++++ */
export const forgotPassword = async (email: string) => {
  try {
    // For now, return a success message since password reset functionality
    // would require email service setup
    console.log('Password reset requested for:', email);
    return { message: 'Password reset functionality not implemented yet' };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to send password reset email');
    }
  }
};

/* ++++++++++ GET USER PROFILE ++++++++++ */
export const getUserProfile = async (userId: string) => {
  try {
    const profile = await AuthService.getProfile(userId);
    return profile;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to fetch user profile');
    }
  }
};

/* ++++++++++ UPDATE USER PROFILE ++++++++++ */
export const updateUserProfile = async (profileData: unknown) => {
  try {
    // This would need to be implemented in the AuthService class
    console.log('Update profile requested:', profileData);
    return { message: 'Profile update functionality not implemented yet' };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to update user profile');
    }
  }
};