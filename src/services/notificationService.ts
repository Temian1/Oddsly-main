/* ++++++++++ REAL-TIME NOTIFICATIONS SERVICE ++++++++++ */
import { prisma } from './database';
import type { User } from '@prisma/client';

// Notification interfaces
export interface NotificationConfig {
  enabled: boolean;
  evThreshold: number; // Minimum EV percentage for alerts
  confidenceThreshold: number; // Minimum confidence for alerts
  platforms: string[]; // Platforms to monitor
  sports: string[]; // Sports to monitor
  propTypes: string[]; // Prop types to monitor
  maxAlertsPerHour: number; // Rate limiting
  soundEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface ValueAlert {
  id: string;
  userId: string;
  propId: string;
  playerName: string;
  propType: string;
  line: number;
  platform: string;
  sport: string;
  evPercentage: number;
  confidence: number;
  odds: number;
  impliedProbability: number;
  hitRate: number;
  recommendedBet: number;
  kellyPercentage: number;
  timestamp: Date;
  isRead: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface NotificationPreferences {
  userId: string;
  config: NotificationConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertHistory {
  userId: string;
  alertsSent: number;
  lastAlertTime: Date;
  hourlyCount: number;
}

// Real-time Notifications Service
export class NotificationService {
  private static instance: NotificationService;
  private alertHistory: Map<string, AlertHistory> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (alert: ValueAlert) => void> = new Map();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Start monitoring for value alerts
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Notification monitoring is already running');
      return;
    }

    console.log('Starting notification monitoring...');
    this.isMonitoring = true;

    // Monitor every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.checkForValueAlerts();
    }, 5 * 60 * 1000);

    // Initial check
    await this.checkForValueAlerts();

    console.log('Notification monitoring started');
  }

  /**
   * Stop monitoring for value alerts
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('Notification monitoring is not running');
      return;
    }

    console.log('Stopping notification monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Notification monitoring stopped');
  }

  /**
   * Subscribe to real-time alerts
   */
  subscribe(userId: string, callback: (alert: ValueAlert) => void): void {
    this.subscribers.set(userId, callback);
    console.log(`User ${userId} subscribed to real-time alerts`);
  }

  /**
   * Unsubscribe from real-time alerts
   */
  unsubscribe(userId: string): void {
    this.subscribers.delete(userId);
    console.log(`User ${userId} unsubscribed from real-time alerts`);
  }

  /**
   * Check for value alerts across all users
   */
  private async checkForValueAlerts(): Promise<void> {
    try {
      console.log('Checking for value alerts...');

      // Get all active users with notification preferences
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          subscriptionStatus: { not: 'cancelled' }
        }
      });

      for (const user of users) {
        try {
          await this.checkUserAlerts(user);
        } catch (error) {
          console.error(`Error checking alerts for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log('Value alert check completed');
    } catch (error) {
      console.error(`Error in value alert monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check alerts for a specific user
   */
  private async checkUserAlerts(user: User): Promise<void> {
    // Get user's notification preferences
    const preferences = await this.getUserPreferences(user.id);
    
    if (!preferences.config.enabled) {
      return;
    }

    // Check rate limiting
    if (!this.canSendAlert(user.id, preferences.config.maxAlertsPerHour)) {
      return;
    }

    // Get recent props that match user's criteria
    const recentProps = await prisma.historicalProp.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        },
        platform: {
          key: { in: preferences.config.platforms }
        },
        sport: {
          key: { in: preferences.config.sports }
        },
        propType: { in: preferences.config.propTypes }
      },
      include: {
        platform: true,
        sport: true
      },
      orderBy: { createdAt: 'desc' }
    });

    for (const prop of recentProps) {
      try {
        const alert = await this.evaluatePropForAlert(user.id, prop, preferences.config);
        if (alert) {
          await this.sendAlert(alert);
        }
      } catch (error) {
        console.error(`Error evaluating prop ${prop.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Evaluate if a prop should trigger an alert
   */
  private async evaluatePropForAlert(
    userId: string,
    prop: any,
    config: NotificationConfig
  ): Promise<ValueAlert | null> {
    // Calculate EV and confidence (simplified - would use actual calculation services)
    const hitRate = 0.6; // Would get from DataService
    const impliedProbability = 1 / prop.odds;
    const evPercentage = ((hitRate - impliedProbability) / impliedProbability) * 100;
    const confidence = 0.8; // Would get from ConfidenceScoring
    const kellyPercentage = Math.max(0, (hitRate * (prop.odds - 1) - (1 - hitRate)) / (prop.odds - 1));

    // Check if meets alert criteria
    if (evPercentage < config.evThreshold || confidence < config.confidenceThreshold) {
      return null;
    }

    // Check if alert already sent for this prop
    const existingAlert = await this.checkExistingAlert(userId, prop.id);
    if (existingAlert) {
      return null;
    }

    // Determine priority
    const priority = this.determinePriority(evPercentage, confidence);

    const alert: ValueAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      propId: prop.id,
      playerName: prop.playerName,
      propType: prop.propType,
      line: prop.line,
      platform: prop.platform.name,
      sport: prop.sport.name,
      evPercentage,
      confidence,
      odds: prop.odds,
      impliedProbability,
      hitRate,
      recommendedBet: 0, // Would calculate using Kelly Criterion
      kellyPercentage,
      timestamp: new Date(),
      isRead: false,
      priority
    };

    return alert;
  }

  /**
   * Send an alert to the user
   */
  private async sendAlert(alert: ValueAlert): Promise<void> {
    try {
      // Save alert to database
      await this.saveAlert(alert);

      // Update alert history
      this.updateAlertHistory(alert.userId);

      // Send real-time notification to subscriber
      const subscriber = this.subscribers.get(alert.userId);
      if (subscriber) {
        subscriber(alert);
      }

      // Send push notification (if enabled)
      await this.sendPushNotification(alert);

      // Send email notification (if enabled)
      await this.sendEmailNotification(alert);

      console.log(`Alert sent to user ${alert.userId}: ${alert.playerName} ${alert.propType} (${alert.evPercentage.toFixed(1)}% EV)`);

    } catch (error) {
      console.error(`Error sending alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save alert to database
   */
  private async saveAlert(alert: ValueAlert): Promise<void> {
    // This would save to a notifications table in the database
    console.log('Saving alert to database:', alert.id);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(alert: ValueAlert): Promise<void> {
    const preferences = await this.getUserPreferences(alert.userId);
    
    if (!preferences.config.pushEnabled) {
      return;
    }

    // Implementation would depend on push notification service (Firebase, etc.)
    console.log(`Push notification: ${alert.playerName} ${alert.propType} - ${alert.evPercentage.toFixed(1)}% EV`);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: ValueAlert): Promise<void> {
    const preferences = await this.getUserPreferences(alert.userId);
    
    if (!preferences.config.emailEnabled) {
      return;
    }

    // Implementation would depend on email service (SendGrid, etc.)
    console.log(`Email notification: ${alert.playerName} ${alert.propType} - ${alert.evPercentage.toFixed(1)}% EV`);
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // This would fetch from database, returning default if not found
    return {
      userId,
      config: {
        enabled: true,
        evThreshold: 5, // 5% minimum EV
        confidenceThreshold: 0.7, // 70% minimum confidence
        platforms: ['underdog', 'prizepicks', 'pick6'],
        sports: ['nfl', 'nba', 'mlb', 'nhl'],
        propTypes: ['player_points', 'player_rebounds', 'player_assists', 'player_passing_yards'],
        maxAlertsPerHour: 10,
        soundEnabled: true,
        emailEnabled: false,
        pushEnabled: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Check if user can receive another alert (rate limiting)
   */
  private canSendAlert(userId: string, maxAlertsPerHour: number): boolean {
    const history = this.alertHistory.get(userId);
    
    if (!history) {
      return true;
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (history.lastAlertTime < hourAgo) {
      // Reset hourly count
      history.hourlyCount = 0;
    }

    return history.hourlyCount < maxAlertsPerHour;
  }

  /**
   * Update alert history for rate limiting
   */
  private updateAlertHistory(userId: string): void {
    const now = new Date();
    const history = this.alertHistory.get(userId) || {
      userId,
      alertsSent: 0,
      lastAlertTime: now,
      hourlyCount: 0
    };

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (history.lastAlertTime < hourAgo) {
      history.hourlyCount = 1;
    } else {
      history.hourlyCount++;
    }

    history.alertsSent++;
    history.lastAlertTime = now;
    
    this.alertHistory.set(userId, history);
  }

  /**
   * Check if alert already exists for this prop
   */
  private async checkExistingAlert(_userId: string, _propId: string): Promise<boolean> {
    // This would check the database for existing alerts
    // For now, return false (no existing alert)
    return false;
  }

  /**
   * Determine alert priority based on EV and confidence
   */
  private determinePriority(evPercentage: number, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (evPercentage >= 20 && confidence >= 0.9) return 'CRITICAL';
    if (evPercentage >= 15 && confidence >= 0.8) return 'HIGH';
    if (evPercentage >= 10 && confidence >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get user's alert history
   */
  async getUserAlerts(_userId: string, _limit: number = 50): Promise<ValueAlert[]> {
    // This would fetch from database
    return [];
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(userId: string, alertId: string): Promise<void> {
    // This would update the database
    console.log(`Marking alert ${alertId} as read for user ${userId}`);
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, config: Partial<NotificationConfig>): Promise<void> {
    // This would update the database
    console.log(`Updating notification preferences for user ${userId}:`, config);
  }

  /**
   * Test alert system
   */
  async sendTestAlert(userId: string): Promise<void> {
    const testAlert: ValueAlert = {
      id: `test_${Date.now()}`,
      userId,
      propId: 'test_prop',
      playerName: 'Test Player',
      propType: 'player_points',
      line: 25.5,
      platform: 'Test Platform',
      sport: 'NBA',
      evPercentage: 12.5,
      confidence: 0.85,
      odds: 1.91,
      impliedProbability: 0.52,
      hitRate: 0.65,
      recommendedBet: 25,
      kellyPercentage: 0.08,
      timestamp: new Date(),
      isRead: false,
      priority: 'MEDIUM'
    };

    await this.sendAlert(testAlert);
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    subscriberCount: number;
    alertHistorySize: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      subscriberCount: this.subscribers.size,
      alertHistorySize: this.alertHistory.size
    };
  }
}

export default NotificationService;