/* ++++++++++ CLIENT-SIDE NOTIFICATIONS SERVICE ++++++++++ */
// This is a client-safe version of notificationService that doesn't import database dependencies

// Notification interfaces (shared with server)
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

// Default notification configuration
const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  evThreshold: 5.0, // 5% minimum EV
  confidenceThreshold: 70, // 70% minimum confidence
  platforms: ['prizepicks', 'underdog', 'pick6'],
  sports: ['nfl', 'nba', 'mlb', 'nhl'],
  propTypes: ['points', 'rebounds', 'assists', 'passing_yards', 'rushing_yards'],
  maxAlertsPerHour: 10,
  soundEnabled: true,
  emailEnabled: false,
  pushEnabled: true
};

// Storage keys for localStorage
const STORAGE_KEYS = {
  PREFERENCES: 'oddsly_notification_preferences',
  ALERTS: 'oddsly_value_alerts',
  ALERT_HISTORY: 'oddsly_alert_history'
};

// Client-side Notifications Service
export class NotificationServiceClient {
  private static instance: NotificationServiceClient;
  private subscribers: Map<string, (alert: ValueAlert) => void> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.loadStoredData();
  }

  static getInstance(): NotificationServiceClient {
    if (!NotificationServiceClient.instance) {
      NotificationServiceClient.instance = new NotificationServiceClient();
    }
    return NotificationServiceClient.instance;
  }

  private loadStoredData(): void {
    // Load any stored preferences or alerts from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        // Preferences loaded successfully
        console.log('Notification preferences loaded from storage');
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
  }

  /**
   * Get user notification preferences (Mock data for browser)
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.PREFERENCES}_${userId}`);
      if (stored) {
        const preferences = JSON.parse(stored);
        return {
          userId,
          config: { ...DEFAULT_CONFIG, ...preferences.config },
          createdAt: new Date(preferences.createdAt),
          updatedAt: new Date(preferences.updatedAt)
        };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }

    // Return default preferences
    return {
      userId,
      config: DEFAULT_CONFIG,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, config: Partial<NotificationConfig>): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      const updatedPrefs = {
        userId,
        config: { ...currentPrefs.config, ...config },
        createdAt: currentPrefs.createdAt,
        updatedAt: new Date()
      };

      localStorage.setItem(`${STORAGE_KEYS.PREFERENCES}_${userId}`, JSON.stringify(updatedPrefs));
      console.log('Notification preferences updated for user:', userId);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
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
   * Start monitoring for value alerts (Client-side simulation)
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Notification monitoring is already running');
      return;
    }

    console.log('Starting client-side notification monitoring...');
    this.isMonitoring = true;

    // In a real implementation, this would connect to a WebSocket or polling endpoint
    // For now, we'll simulate periodic checks
    this.monitoringInterval = setInterval(async () => {
      await this.simulateValueCheck();
    }, 30 * 1000); // Check every 30 seconds

    console.log('Client-side notification monitoring started');
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
   * Simulate value checking (Mock implementation)
   */
  private async simulateValueCheck(): Promise<void> {
    // In a real implementation, this would call an API endpoint
    // For now, we'll occasionally generate a mock alert
    if (Math.random() < 0.1) { // 10% chance of generating an alert
      const mockAlert: ValueAlert = {
        id: `alert_${Date.now()}`,
        userId: 'current_user', // Would get from auth context
        propId: `prop_${Math.random().toString(36).substr(2, 9)}`,
        playerName: 'LeBron James',
        propType: 'points',
        line: 25.5,
        platform: 'PrizePicks',
        sport: 'NBA',
        evPercentage: 8.5,
        confidence: 75,
        odds: -110,
        impliedProbability: 0.524,
        hitRate: 0.58,
        recommendedBet: 50,
        kellyPercentage: 2.1,
        timestamp: new Date(),
        isRead: false,
        priority: 'HIGH'
      };

      // Notify all subscribers
      this.subscribers.forEach((callback, userId) => {
        try {
          callback(mockAlert);
        } catch (error) {
          console.error(`Error notifying subscriber ${userId}:`, error);
        }
      });
    }
  }

  /**
   * Get recent alerts for a user (Mock data)
   */
  async getRecentAlerts(userId: string, limit: number = 10): Promise<ValueAlert[]> {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.ALERTS}_${userId}`);
      if (stored) {
        const alerts = JSON.parse(stored);
        return alerts.slice(0, limit).map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load recent alerts:', error);
    }

    // Return mock alerts
    return [
      {
        id: 'alert_1',
        userId,
        propId: 'prop_123',
        playerName: 'Stephen Curry',
        propType: 'points',
        line: 28.5,
        platform: 'PrizePicks',
        sport: 'NBA',
        evPercentage: 12.3,
        confidence: 82,
        odds: -110,
        impliedProbability: 0.524,
        hitRate: 0.65,
        recommendedBet: 75,
        kellyPercentage: 3.2,
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        isRead: false,
        priority: 'HIGH'
      },
      {
        id: 'alert_2',
        userId,
        propId: 'prop_456',
        playerName: 'Giannis Antetokounmpo',
        propType: 'rebounds',
        line: 11.5,
        platform: 'Underdog',
        sport: 'NBA',
        evPercentage: 7.8,
        confidence: 71,
        odds: -105,
        impliedProbability: 0.512,
        hitRate: 0.59,
        recommendedBet: 40,
        kellyPercentage: 1.8,
        timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
        isRead: true,
        priority: 'MEDIUM'
      }
    ];
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(userId: string, alertId: string): Promise<void> {
    try {
      const alerts = await this.getRecentAlerts(userId, 100);
      const updatedAlerts = alerts.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      );
      
      localStorage.setItem(`${STORAGE_KEYS.ALERTS}_${userId}`, JSON.stringify(updatedAlerts));
      console.log(`Alert ${alertId} marked as read for user ${userId}`);
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  }

  /**
   * Clear all alerts for a user
   */
  async clearAllAlerts(userId: string): Promise<void> {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.ALERTS}_${userId}`);
      console.log(`All alerts cleared for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  }

  /**
   * Get monitoring status
   */
  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  /**
   * Test notification (for debugging)
   */
  async testNotification(userId: string): Promise<void> {
    const testAlert: ValueAlert = {
      id: `test_${Date.now()}`,
      userId,
      propId: 'test_prop',
      playerName: 'Test Player',
      propType: 'points',
      line: 20.5,
      platform: 'Test Platform',
      sport: 'NBA',
      evPercentage: 15.0,
      confidence: 90,
      odds: -110,
      impliedProbability: 0.524,
      hitRate: 0.70,
      recommendedBet: 100,
      kellyPercentage: 4.0,
      timestamp: new Date(),
      isRead: false,
      priority: 'CRITICAL'
    };

    const callback = this.subscribers.get(userId);
    if (callback) {
      callback(testAlert);
      console.log('Test notification sent to user:', userId);
    } else {
      console.log('No subscriber found for user:', userId);
    }
  }
}

// Export singleton instance
export const notificationServiceClient = NotificationServiceClient.getInstance();

// Default export
export default notificationServiceClient;