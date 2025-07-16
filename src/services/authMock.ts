/* ++++++++++ BROWSER-COMPATIBLE MOCK AUTH SERVICE ++++++++++ */

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

// Mock user storage using localStorage
class MockUserStorage {
  private static readonly USERS_KEY = 'mock_users';
  private static readonly SESSIONS_KEY = 'mock_sessions';

  static getUsers(): UserProfile[] {
    const users = localStorage.getItem(this.USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  static saveUsers(users: UserProfile[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  static findUserByEmail(email: string): UserProfile | null {
    const users = this.getUsers();
    return users.find(user => user.email === email) || null;
  }

  static findUserById(id: string): UserProfile | null {
    const users = this.getUsers();
    return users.find(user => user.id === id) || null;
  }

  static createUser(userData: RegisterData): UserProfile {
    const users = this.getUsers();
    const newUser: UserProfile = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      email: userData.email,
      fullName: userData.fullName,
      dateOfBirth: userData.dateOfBirth,
      subscriptionStatus: 'free',
      role: 'user',
      twoFaEnabled: false,
      isVerified: false,
      createdAt: new Date(),
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  static updateUser(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const users = this.getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    users[userIndex] = { ...users[userIndex], ...updates };
    this.saveUsers(users);
    return users[userIndex];
  }
}

// Mock password storage (in real app, this would be hashed)
class MockPasswordStorage {
  private static readonly PASSWORDS_KEY = 'mock_passwords';

  static getPasswords(): Record<string, string> {
    const passwords = localStorage.getItem(this.PASSWORDS_KEY);
    return passwords ? JSON.parse(passwords) : {};
  }

  static savePassword(email: string, password: string): void {
    const passwords = this.getPasswords();
    passwords[email] = password; // In real app, this would be hashed
    localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(passwords));
  }

  static verifyPassword(email: string, password: string): boolean {
    const passwords = this.getPasswords();
    return passwords[email] === password;
  }
}

// Mock JWT utilities
class MockJWTUtils {
  static generateTokens(userId: string): AuthTokens {
    const accessToken = `mock_access_${userId}_${Date.now()}`;
    const refreshToken = `mock_refresh_${userId}_${Date.now()}`;
    const expiresIn = 86400; // 24 hours

    return { accessToken, refreshToken, expiresIn };
  }

  static verifyAccessToken(token: string): { userId: string } | null {
    if (token.startsWith('mock_access_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        return { userId: parts[2] };
      }
    }
    return null;
  }

  static verifyRefreshToken(token: string): { userId: string } | null {
    if (token.startsWith('mock_refresh_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        return { userId: parts[2] };
      }
    }
    return null;
  }
}

// Mock Authentication Service
export class AuthService {
  // Register new user
  static async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = MockUserStorage.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create new user
    const user = MockUserStorage.createUser(data);
    
    // Store password
    MockPasswordStorage.savePassword(data.email, data.password);
    
    // Generate tokens
    const tokens = MockJWTUtils.generateTokens(user.id);

    return { user, tokens };
  }

  // Login user
  static async login(credentials: LoginCredentials): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const user = MockUserStorage.findUserByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = MockPasswordStorage.verifyPassword(credentials.email, credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = MockJWTUtils.generateTokens(user.id);

    return { user, tokens };
  }

  // Refresh tokens
  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const decoded = MockJWTUtils.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    const user = MockUserStorage.findUserById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return MockJWTUtils.generateTokens(user.id);
  }

  // Get user profile
  static async getProfile(userId: string): Promise<UserProfile | null> {
    return MockUserStorage.findUserById(userId);
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const updatedUser = MockUserStorage.updateUser(userId, updates);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return updatedUser;
  }

  // Logout (mock implementation)
  static async logout(refreshToken: string): Promise<void> {
    // In a real implementation, this would invalidate the token
    console.log('User logged out');
  }

  // Setup 2FA (mock implementation)
  static async setup2FA(): Promise<TwoFASetup> {
    return {
      secret: 'mock_secret_' + Math.random().toString(36).substr(2, 16),
      qrCodeUrl: 'data:image/png;base64,mock_qr_code',
      backupCodes: Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      ),
    };
  }

  // Enable 2FA (mock implementation)
  static async enable2FA(token: string): Promise<{ backupCodes: string[] }> {
    return {
      backupCodes: Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      ),
    };
  }

  // Disable 2FA (mock implementation)
  static async disable2FA(password: string): Promise<void> {
    console.log('2FA disabled');
  }

  // Forgot password (mock implementation)
  static async forgotPassword(email: string): Promise<void> {
    console.log(`Password reset email sent to ${email}`);
  }

  // Reset password (mock implementation)
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    console.log('Password reset successfully');
  }
}

export default AuthService;