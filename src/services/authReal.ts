/* ++++++++++ REAL DATABASE AUTHENTICATION SERVICE ++++++++++ */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from './database';
import type { UserSession } from '@prisma/client';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
// const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
const TWO_FA_SERVICE_NAME = process.env.TWO_FA_SERVICE_NAME || 'Oddsly EV Platform';
const TWO_FA_ISSUER = process.env.TWO_FA_ISSUER || 'Oddsly';

// Types
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

// JWT Utilities
class JWTUtils {
  static generateAccessToken(userId: string, role: string): string {
    return jwt.sign(
      { userId, role, type: 'access' },
      JWT_SECRET as string,
      { expiresIn: '24h' }
    );
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );
  }

  static verifyAccessToken(token: string): { userId: string; role: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as any;
      if (decoded.type === 'access') {
        return { userId: decoded.userId, role: decoded.role };
      }
      return null;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET as string) as any;
      if (decoded.type === 'refresh') {
        return { userId: decoded.userId };
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Password Utilities
class PasswordUtils {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

// 2FA Utilities
class TwoFAUtils {
  static generateSecret(): string {
    return speakeasy.generateSecret({
      name: TWO_FA_SERVICE_NAME,
      issuer: TWO_FA_ISSUER,
      length: 32
    }).base32;
  }

  static async generateQRCode(secret: string, email: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: email,
      issuer: TWO_FA_ISSUER
    });
    return QRCode.toDataURL(otpauthUrl);
  }

  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2 // Allow 2 time steps (60 seconds) of variance
    });
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}

// Session Management
class SessionManager {
  static async createSession(userId: string, refreshToken: string): Promise<UserSession> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return prisma.userSession.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt
      }
    });
  }

  static async validateSession(refreshToken: string): Promise<UserSession | null> {
    return prisma.userSession.findFirst({
      where: {
        token: refreshToken,
        expiresAt: { gt: new Date() }
      }
    });
  }

  static async deleteSession(refreshToken: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { token: refreshToken }
    });
  }

  static async deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { userId }
    });
  }
}

// Main Authentication Service
export class AuthService {
  // Register new user
  static async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        role: 'user',
        subscriptionStatus: 'free'
      }
    });

    // Generate tokens
    const accessToken = JWTUtils.generateAccessToken(user.id, user.role);
    const refreshToken = JWTUtils.generateRefreshToken(user.id);

    // Create session
    await SessionManager.createSession(user.id, refreshToken);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: 86400 // 24 hours
    };

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      twoFaEnabled: user.twoFaEnabled,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };

    return { user: userProfile, tokens };
  }

  // Login user
  static async login(credentials: LoginCredentials): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await PasswordUtils.verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check 2FA if enabled
    if (user.twoFaEnabled) {
      if (!credentials.twoFaCode) {
        throw new Error('2FA code required');
      }

      if (!user.twoFaSecret) {
        throw new Error('2FA not properly configured');
      }

      const isValid2FA = TwoFAUtils.verifyToken(user.twoFaSecret, credentials.twoFaCode);
      if (!isValid2FA) {
        // Check backup codes
        const backupCodes = user.twoFaBackupCodes || [];
        if (!backupCodes.includes(credentials.twoFaCode)) {
          throw new Error('Invalid 2FA code');
        }

        // Remove used backup code
        const updatedBackupCodes = backupCodes.filter(code => code !== credentials.twoFaCode);
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFaBackupCodes: updatedBackupCodes }
        });
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const accessToken = JWTUtils.generateAccessToken(user.id, user.role);
    const refreshToken = JWTUtils.generateRefreshToken(user.id);

    // Create session
    await SessionManager.createSession(user.id, refreshToken);

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: 86400 // 24 hours
    };

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      twoFaEnabled: user.twoFaEnabled,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };

    return { user: userProfile, tokens };
  }

  // Refresh tokens
  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const decoded = JWTUtils.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Validate session
    const session = await SessionManager.validateSession(refreshToken);
    if (!session) {
      throw new Error('Session expired or invalid');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const newAccessToken = JWTUtils.generateAccessToken(user.id, user.role);
    const newRefreshToken = JWTUtils.generateRefreshToken(user.id);

    // Delete old session and create new one
    await SessionManager.deleteSession(refreshToken);
    await SessionManager.createSession(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 86400 // 24 hours
    };
  }

  // Logout
  static async logout(refreshToken: string): Promise<void> {
    await SessionManager.deleteSession(refreshToken);
  }

  // Get user profile
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      twoFaEnabled: user.twoFaEnabled,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };
  }

  // Setup 2FA
  static async setup2FA(userId: string): Promise<TwoFASetup> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const secret = TwoFAUtils.generateSecret();
    const qrCodeUrl = await TwoFAUtils.generateQRCode(secret, user.email);
    const backupCodes = TwoFAUtils.generateBackupCodes();

    // Store secret temporarily (not enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFaSecret: secret,
        twoFaBackupCodes: backupCodes
      }
    });

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  // Verify and enable 2FA
  static async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFaSecret) {
      throw new Error('2FA setup not found');
    }

    const isValid = TwoFAUtils.verifyToken(user.twoFaSecret, token);
    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: true }
    });

    return true;
  }

  // Disable 2FA
  static async disable2FA(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await PasswordUtils.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFaEnabled: false,
        twoFaSecret: null,
        twoFaBackupCodes: []
      }
    });

    return true;
  }

  // Admin: Get all users
  static async getAllUsers(adminUserId: string): Promise<UserProfile[]> {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      twoFaEnabled: user.twoFaEnabled,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    }));
  }

  // Admin: Update user role
  static async updateUserRole(adminUserId: string, targetUserId: string, newRole: string): Promise<boolean> {
    const admin = await prisma.user.findUnique({
      where: { id: adminUserId }
    });

    if (!admin || admin.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole }
    });

    return true;
  }
}

export { JWTUtils, PasswordUtils, TwoFAUtils, SessionManager };