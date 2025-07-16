/* ++++++++++ CLIENT-SIDE AUTHENTICATION SERVICE ++++++++++ */

// Types (shared with server)
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFaCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
  dateOfBirth?: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  dateOfBirth?: Date;
  subscriptionStatus: string;
  role: string;
  twoFaEnabled: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface TwoFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// Client-side password validation (no bcrypt)
export class PasswordUtils {
  static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }
}

// Client-side JWT utilities (decode only, no verification)
export class JWTUtils {
  // Simple JWT decode without verification (for client-side use only)
  static decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

// Import the browser-compatible mock auth service
import { AuthService as ServerAuthService } from './authMock';

// Client-side authentication service
export class AuthService {
  // Register new user
  static async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Validate password on client side
    const passwordValidation = PasswordUtils.validate(data.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    try {
      const result = await ServerAuthService.register(data);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Registration failed');
      }
    }
  }

  // Login user
  static async login(credentials: LoginCredentials): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    try {
      const result = await ServerAuthService.login(credentials);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Login failed');
      }
    }
  }

  // Refresh tokens
  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const result = await ServerAuthService.refreshTokens(refreshToken);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Token refresh failed');
      }
    }
  }

  // Get user profile
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await ServerAuthService.getProfile(userId);
      return result;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const result = await ServerAuthService.updateProfile(userId, updates);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Profile update failed');
      }
    }
  }

  // Logout
  static async logout(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    if (refreshToken) {
      try {
        await ServerAuthService.logout(refreshToken);
      } catch {
        // Ignore errors during logout API call
      }
    }
    
    TokenManager.clearTokens();
  }

  // Setup 2FA
  static async setup2FA(): Promise<TwoFASetup> {
    try {
      const result = await ServerAuthService.setup2FA();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('2FA setup failed');
      }
    }
  }

  // Enable 2FA
  static async enable2FA(token: string): Promise<{ backupCodes: string[] }> {
    try {
      const result = await ServerAuthService.enable2FA(token);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('2FA enable failed');
      }
    }
  }

  // Disable 2FA
  static async disable2FA(password: string): Promise<void> {
    try {
      await ServerAuthService.disable2FA(password);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('2FA disable failed');
      }
    }
  }

  // Forgot password
  static async forgotPassword(email: string): Promise<void> {
    try {
      await ServerAuthService.forgotPassword(email);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Password reset request failed');
      }
    }
  }

  // Reset password
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await ServerAuthService.resetPassword(token, newPassword);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Password reset failed');
      }
    }
  }
}

// Token management for client-side
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';
  private static readonly USER_PROFILE_KEY = 'user_profile';

  static setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, (Date.now() + tokens.expiresIn * 1000).toString());
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > parseInt(expiry);
  }

  static setUserProfile(user: UserProfile): void {
    localStorage.setItem(this.USER_PROFILE_KEY, JSON.stringify(user));
  }

  static getUserProfile(): UserProfile | null {
    try {
      const profile = localStorage.getItem(this.USER_PROFILE_KEY);
      return profile ? JSON.parse(profile) : null;
    } catch {
      return null;
    }
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    localStorage.removeItem(this.USER_PROFILE_KEY);
  }

  static clearUserProfile(): void {
    localStorage.removeItem(this.USER_PROFILE_KEY);
  }

  static hasValidToken(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired();
  }

  static hasStoredUser(): boolean {
    return this.getUserProfile() !== null;
  }
}