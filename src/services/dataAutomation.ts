/* ++++++++++ DATA AUTOMATION SERVICE ++++++++++ */
import { fetchDFSProps, SUPPORTED_PLAYER_PROP_SPORTS } from './api';
import { PropEVData, calculatePropEV } from '../utils/evCalculations';
import { 
  saveHistoricalProp, 
  getHistoricalProps, 
  calculateAndSaveHitRate, 
  getHitRate,
  refreshDataAutomation 
} from './dataService';

/* ++++++++++ TYPES ++++++++++ */
interface HistoricalPropData {
  id: string;
  playerName: string;
  propType: string;
  line: number;
  actualResult: number;
  hit: boolean;
  gameDate: string;
  sport: string;
  season: string;
}

interface PropHitRateData {
  playerName: string;
  propType: string;
  line: number;
  hitRate: number;
  gameCount: number;
  lastUpdated: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AutomationConfig {
  refreshIntervalMinutes: number;
  enableAutoRefresh: boolean;
  sports: string[];
  platforms: string[];
  minGameSample: number;
}

/* ++++++++++ CONSTANTS ++++++++++ */
const DEFAULT_CONFIG: AutomationConfig = {
  refreshIntervalMinutes: 60, // Hourly refresh
  enableAutoRefresh: true,
  sports: SUPPORTED_PLAYER_PROP_SPORTS,
  platforms: ['us_dfs.prizepicks', 'us_dfs.underdog', 'us_dfs.pick6'],
  minGameSample: 10 // Minimum games for reliable hit rate
};

const STORAGE_KEYS = {
  HISTORICAL_DATA: 'oddsly_historical_prop_data',
  HIT_RATES: 'oddsly_hit_rates',
  LAST_REFRESH: 'oddsly_last_refresh',
  CONFIG: 'oddsly_automation_config'
};

/* ++++++++++ DATABASE UTILITIES ++++++++++ */
class DatabaseStore {
  static async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      // For configuration, still use localStorage as fallback
      if (key === STORAGE_KEYS.CONFIG) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    try {
      // For configuration, still use localStorage
      if (key === STORAGE_KEYS.CONFIG) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Failed to save configuration:', error);
    }
  }

  static clear(key: string): void {
    if (key === STORAGE_KEYS.CONFIG) {
      localStorage.removeItem(key);
    }
  }
}

/* ++++++++++ DATA AUTOMATION CLASS ++++++++++ */
export class DataAutomationService {
  private config: AutomationConfig;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  constructor(config?: Partial<AutomationConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...this.getStoredConfig(),
      ...config
    };
    this.saveConfig();
  }

  private getStoredConfig(): Partial<AutomationConfig> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /* ++++++++++ CONFIGURATION ++++++++++ */
  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.restartAutomation();
  }

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

  /* ++++++++++ AUTOMATION CONTROL ++++++++++ */
  startAutomation(): void {
    if (!this.config.enableAutoRefresh) return;

    this.stopAutomation();
    
    const intervalMs = this.config.refreshIntervalMinutes * 60 * 1000;
    this.refreshTimer = setInterval(() => {
      this.refreshAllData();
    }, intervalMs);

    console.log(`Data automation started - refreshing every ${this.config.refreshIntervalMinutes} minutes`);
  }

  stopAutomation(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  restartAutomation(): void {
    this.stopAutomation();
    this.startAutomation();
  }

  /* ++++++++++ DATA REFRESH ++++++++++ */
  async refreshAllData(): Promise<void> {
    if (this.isRefreshing) {
      console.log('Data refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      console.log('Starting automated data refresh...');
      
      const refreshPromises = this.config.sports.map(sport => 
        this.refreshSportData(sport)
      );

      await Promise.allSettled(refreshPromises);
      
      localStorage.setItem(STORAGE_KEYS.LAST_REFRESH, new Date().toISOString());
      
      const duration = Date.now() - startTime;
      console.log(`Data refresh completed in ${duration}ms`);
      
    } catch (error) {
      console.error('Error during data refresh:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async refreshSportData(sport: string): Promise<void> {
    try {
      const data = await fetchDFSProps(sport, undefined, this.config.platforms, true);
      
      if (data?.bookmakers?.length) {
        await this.processNewPropData(sport, data);
      }
    } catch (error) {
      console.warn(`Failed to refresh data for ${sport}:`, error);
    }
  }

  /* ++++++++++ HISTORICAL DATA MANAGEMENT ++++++++++ */
  private async processNewPropData(sport: string, data: any): Promise<void> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    for (const bookmaker of data.bookmakers) {
      for (const market of bookmaker.markets) {
        for (const outcome of market.outcomes) {
          // Store current prop for future hit rate calculation
          const propData = {
            playerName: outcome.description,
            propType: market.key,
            line: outcome.point || 0,
            gameDate: new Date(currentDate),
            sport,
            season: this.getCurrentSeason(sport),
            actualResult: null, // Will be updated when game results are available
            hit: null // Will be calculated when actualResult is available
          };
          
          try {
            await saveHistoricalProp(propData);
          } catch (error) {
            console.warn('Failed to save historical prop:', error);
          }
        }
      }
    }
  }

  async addHistoricalResult(
    playerName: string,
    propType: string,
    line: number,
    actualResult: number,
    gameDate: string,
    sport: string
  ): Promise<void> {
    const hit = this.determineHit(propType, line, actualResult);
    
    const historicalData = {
      playerName,
      propType,
      line,
      actualResult,
      hit,
      gameDate: new Date(gameDate),
      sport,
      season: this.getCurrentSeason(sport)
    };

    try {
      await saveHistoricalProp(historicalData);
      await this.updateHitRates(playerName, propType, line);
    } catch (error) {
      console.error('Failed to add historical result:', error);
    }
  }

  private determineHit(propType: string, line: number, actualResult: number): boolean {
    // For over/under props
    if (propType.includes('_over') || line > 0) {
      return actualResult > line;
    }
    
    // For yes/no props (touchdowns, etc.)
    if (propType.includes('_td') || propType.includes('anytime')) {
      return actualResult > 0;
    }
    
    // Default to over
    return actualResult > line;
  }

  /* ++++++++++ HIT RATE CALCULATIONS ++++++++++ */
  private async updateHitRates(playerName: string, propType: string, line: number): Promise<void> {
    try {
      const historicalData = await this.getHistoricalData(playerName, propType, line);
      
      if (historicalData.length < this.config.minGameSample) {
        return; // Not enough data for reliable hit rate
      }

      const hits = historicalData.filter(d => d.hit).length;
      const hitRate = hits / historicalData.length;
      const confidence = this.calculateConfidence(historicalData.length, hitRate);

      await calculateAndSaveHitRate({
        playerName,
        propType,
        line,
        hitRate,
        gameCount: historicalData.length,
        confidence
      });
    } catch (error) {
      console.error('Failed to update hit rates:', error);
    }
  }

  async getHitRate(playerName: string, propType: string, line: number): Promise<number> {
    try {
      const hitRateData = await getHitRate(playerName, propType, line);
      return hitRateData || 0.5; // Default to 50% if no data
    } catch (error) {
      console.warn('Failed to get hit rate:', error);
      return 0.5;
    }
  }

  private calculateConfidence(gameCount: number, hitRate: number): 'high' | 'medium' | 'low' {
    if (gameCount >= 20 && (hitRate >= 0.65 || hitRate <= 0.35)) return 'high';
    if (gameCount >= 15 && (hitRate >= 0.60 || hitRate <= 0.40)) return 'medium';
    return 'low';
  }

  /* ++++++++++ DATA RETRIEVAL ++++++++++ */
  async getHistoricalData(
    playerName?: string, 
    propType?: string, 
    line?: number,
    limit?: number
  ): Promise<HistoricalPropData[]> {
    try {
      const data = await getHistoricalProps({
        playerName,
        propType,
        line,
        limit
      });
      
      // Convert database format to expected format
      return data.map(prop => ({
        id: `${prop.playerName}-${prop.propType}-${prop.gameDate.toISOString().split('T')[0]}`,
        playerName: prop.playerName,
        propType: prop.propType,
        line: prop.line,
        actualResult: prop.actualResult || 0,
        hit: prop.hit || false,
        gameDate: prop.gameDate.toISOString().split('T')[0],
        sport: prop.sport,
        season: prop.season
      }));
    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
  }

  async getAllHitRates(): Promise<PropHitRateData[]> {
    try {
      // This would need to be implemented in dataService
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to get all hit rates:', error);
      return [];
    }
  }

  getLastRefreshTime(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
    } catch {
      return null;
    }
  }

  /* ++++++++++ UTILITY METHODS ++++++++++ */
  private getCurrentSeason(sport: string): string {
    const now = new Date();
    const year = now.getFullYear();
    
    switch (sport) {
      case 'basketball_nba':
      case 'basketball_wnba':
        return now.getMonth() >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      case 'americanfootball_nfl':
        return now.getMonth() >= 8 ? year.toString() : (year - 1).toString();
      case 'baseball_mlb':
        return year.toString();
      case 'icehockey_nhl':
        return now.getMonth() >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      default:
        return year.toString();
    }
  }

  /* ++++++++++ DATA MANAGEMENT ++++++++++ */
  async clearAllData(): Promise<void> {
    try {
      // Clear localStorage config
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear database data would need to be implemented in dataService
      console.log('All stored data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  async exportData(): Promise<string> {
    try {
      const data = {
        historicalData: await this.getHistoricalData(),
        hitRates: await this.getAllHitRates(),
        lastRefresh: this.getLastRefreshTime(),
        config: this.config
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return JSON.stringify({ error: 'Export failed' }, null, 2);
    }
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.historicalData) {
        // Import historical data to database
        for (const prop of data.historicalData) {
          await saveHistoricalProp({
            playerName: prop.playerName,
            propType: prop.propType,
            line: prop.line,
            actualResult: prop.actualResult,
            hit: prop.hit,
            gameDate: new Date(prop.gameDate),
            sport: prop.sport,
            platform: 'underdog' // Default platform for imported data
          });
        }
      }
      
      if (data.config) {
        this.updateConfig(data.config);
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid data format');
    }
  }

  /* ++++++++++ STATUS ++++++++++ */
  async getStatus() {
    try {
      const historicalData = await this.getHistoricalData();
      const hitRates = await this.getAllHitRates();
      const lastRefresh = this.getLastRefreshTime();
      
      return {
        isRunning: !!this.refreshTimer,
        isRefreshing: this.isRefreshing,
        config: this.config,
        dataStats: {
          historicalRecords: historicalData.length,
          hitRateRecords: hitRates.length,
          lastRefresh
        }
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        isRunning: !!this.refreshTimer,
        isRefreshing: this.isRefreshing,
        config: this.config,
        dataStats: {
          historicalRecords: 0,
          hitRateRecords: 0,
          lastRefresh: this.getLastRefreshTime()
        }
      };
    }
  }
}

/* ++++++++++ SINGLETON INSTANCE ++++++++++ */
export const dataAutomation = new DataAutomationService();

/* ++++++++++ AUTO-START ++++++++++ */
// Auto-start automation when module loads
if (typeof window !== 'undefined') {
  dataAutomation.startAutomation();
}