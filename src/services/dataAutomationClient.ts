/* ++++++++++ CLIENT-SIDE DATA AUTOMATION SERVICE ++++++++++ */
// This is a client-safe version of dataAutomation that doesn't import database dependencies

/* ++++++++++ TYPES ++++++++++ */
interface AutomationConfig {
  refreshIntervalMinutes: number;
  enableAutoRefresh: boolean;
  sports: string[];
  platforms: string[];
  minGameSample: number;
}

interface HitRateData {
  playerName: string;
  propType: string;
  line: number;
  hitRate: number;
  gameCount: number;
  lastUpdated: string;
  confidence: 'high' | 'medium' | 'low';
}

/* ++++++++++ CONSTANTS ++++++++++ */
const DEFAULT_CONFIG: AutomationConfig = {
  refreshIntervalMinutes: 60,
  enableAutoRefresh: true,
  sports: ['americanfootball_nfl', 'basketball_nba', 'baseball_mlb'],
  platforms: ['us_dfs.prizepicks', 'us_dfs.underdog', 'us_dfs.pick6'],
  minGameSample: 10
};

const STORAGE_KEYS = {
  HIT_RATES: 'oddsly_hit_rates_cache',
  LAST_REFRESH: 'oddsly_last_refresh',
  CONFIG: 'oddsly_automation_config'
};

/* ++++++++++ CLIENT-SIDE DATA AUTOMATION CLASS ++++++++++ */
export class DataAutomationClientService {
  private config: AutomationConfig;
  private isRefreshing = false;
  private hitRatesCache: Map<string, HitRateData> = new Map();

  constructor(config?: Partial<AutomationConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...this.getStoredConfig(),
      ...config
    };
    this.loadCachedData();
  }

  private getStoredConfig(): Partial<AutomationConfig> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private loadCachedData(): void {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.HIT_RATES);
      if (cached) {
        const data = JSON.parse(cached);
        this.hitRatesCache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load cached hit rates:', error);
    }
  }



  /* ++++++++++ PUBLIC METHODS ++++++++++ */
  
  /**
   * Get hit rate for a specific player/prop combination
   * Returns cached data or default values
   */
  getHitRate(playerName: string, propType: string, line: number): number {
    const key = `${playerName}_${propType}_${line}`;
    const cached = this.hitRatesCache.get(key);
    
    if (cached) {
      return cached.hitRate;
    }
    
    // Return default hit rate based on prop type
    const defaultRates: Record<string, number> = {
      'player_points': 0.52,
      'player_rebounds': 0.48,
      'player_assists': 0.50,
      'player_passing_yards': 0.51,
      'player_rushing_yards': 0.49,
      'player_receiving_yards': 0.50,
      'player_hits': 0.47,
      'player_strikeouts': 0.53
    };
    
    return defaultRates[propType] || 0.50;
  }

  /**
   * Get the last refresh time
   */
  getLastRefreshTime(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_REFRESH) || new Date().toISOString();
  }

  /**
   * Refresh all data - client-side version that calls API endpoints
   * instead of directly accessing the database
   */
  async refreshAllData(): Promise<void> {
    if (this.isRefreshing) {
      console.log('Data refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      console.log('Starting client-side data refresh...');
      
      // In a real implementation, this would call API endpoints
      // For now, we'll simulate the refresh and update the timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      localStorage.setItem(STORAGE_KEYS.LAST_REFRESH, new Date().toISOString());
      
      const duration = Date.now() - startTime;
      console.log(`Client-side data refresh completed in ${duration}ms`);
      
    } catch (error) {
      console.error('Error during client-side data refresh:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save automation config:', error);
    }
  }

  /**
   * Check if currently refreshing
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.hitRatesCache.clear();
    localStorage.removeItem(STORAGE_KEYS.HIT_RATES);
    localStorage.removeItem(STORAGE_KEYS.LAST_REFRESH);
  }
}

/* ++++++++++ SINGLETON INSTANCE ++++++++++ */
export const dataAutomationClient = new DataAutomationClientService();

/* ++++++++++ DEFAULT EXPORT ++++++++++ */
export default dataAutomationClient;