import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from './database';
import type { User, UserSession } from '@prisma/client';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
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

// Password utilities
export class PasswordUtils {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

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

// JWT utilities
export class JWTUtils {
  static generateTokens(userId: string): AuthTokens {
    const payload = { userId, type: 'access' };
    const refreshPayload = { userId, type: 'refresh' };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

    // Calculate expiration time in seconds
    const expiresIn = this.getExpirationTime(JWT_EXPIRES_IN);

    return { accessToken, refreshToken, expiresIn };
  }

  static verifyAccessToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.type !== 'access') return null;
      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      if (decoded.type !== 'refresh') return null;
      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }

  private static getExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 86400; // Default 24 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 86400;
    }
  }
}

// 2FA utilities
export class TwoFAUtils {
  static generateSecret(): string {
    return speakeasy.generateSecret({
      name: TWO_FA_SERVICE_NAME,
      issuer: TWO_FA_ISSUER,
      length: 32,
    }).base32;
  }

  static async generateQRCode(secret: string, userEmail: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: userEmail,
      issuer: TWO_FA_ISSUER,
      encoding: 'base32',
    });

    return QRCode.toDataURL(otpauthUrl);
  }

  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });
  }

  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFaBackupCodes: true },
    });

    if (!user || !user.twoFaBackupCodes.includes(code)) {
      return false;
    }

    // Remove used backup code
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFaBackupCodes: user.twoFaBackupCodes.filter(c => c !== code),
      },
    });

    return true;
  }
}

// Main Authentication Service
export class AuthService {
  // Register new user
  static async register(data: RegisterData): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Validate password
    const passwordValidation = PasswordUtils.validate(data.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hash(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
      },
    });

    // Generate tokens
    const tokens = JWTUtils.generateTokens(user.id);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.formatUserProfile(user),
      tokens,
    };
  }

  // Login user
  static async login(credentials: LoginCredentials): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordValid = await PasswordUtils.verify(credentials.password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Check 2FA if enabled
    if (user.twoFaEnabled) {
      if (!credentials.twoFaCode) {
        throw new Error('2FA code required');
      }

      const twoFaValid = user.twoFaSecret && 
        TwoFAUtils.verifyToken(user.twoFaSecret, credentials.twoFaCode);
      
      const backupCodeValid = await TwoFAUtils.verifyBackupCode(user.id, credentials.twoFaCode);

      if (!twoFaValid && !backupCodeValid) {
        throw new Error('Invalid 2FA code');
      }
    }

    // Generate tokens
    const tokens = JWTUtils.generateTokens(user.id);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.formatUserProfile(user),
      tokens,
    };
  }

  // Refresh tokens
  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const decoded = JWTUtils.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Verify session exists
    const session = await prisma.userSession.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || !session.user.isActive || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired session');
    }

    // Generate new tokens
    const tokens = JWTUtils.generateTokens(session.userId);

    // Update session with new refresh token
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return tokens;
  }

  // Logout user
  static async logout(refreshToken: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { token: refreshToken },
    });
  }

  // Get user profile
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    return user ? this.formatUserProfile(user) : null;
  }

  // Setup 2FA
  static async setup2FA(userId: string): Promise<TwoFASetup> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const secret = TwoFAUtils.generateSecret();
    const qrCodeUrl = await TwoFAUtils.generateQRCode(secret, user.email);
    const backupCodes = TwoFAUtils.generateBackupCodes();

    return { secret, qrCodeUrl, backupCodes };
  }

  // Enable 2FA
  static async enable2FA(userId: string, secret: string, token: string, backupCodes: string[]): Promise<void> {
    if (!TwoFAUtils.verifyToken(secret, token)) {
      throw new Error('Invalid 2FA token');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFaEnabled: true,
        twoFaSecret: secret,
        twoFaBackupCodes: backupCodes,
      },
    });
  }

  // Disable 2FA
  static async disable2FA(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const passwordValid = await PasswordUtils.verify(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Invalid password');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFaEnabled: false,
        twoFaSecret: null,
        twoFaBackupCodes: [],
      },
    });
  }

  // Helper methods
  private static async createSession(userId: string, refreshToken: string): Promise<UserSession> {
    // Clean up expired sessions
    await prisma.userSession.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });

    // Create new session
    return prisma.userSession.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  private static formatUserProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth,
      subscriptionStatus: user.subscriptionStatus,
      role: user.role,
      twoFaEnabled: user.twoFaEnabled,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}

export default AuthService;