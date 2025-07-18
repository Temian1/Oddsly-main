/* ++++++++++ DATA AUTOMATION SERVICE ++++++++++ */
import { fetchDFSProps } from './api';

// Data automation interfaces
export interface AutomationConfig {
  enabled: boolean;
  intervalMinutes: number;
  sports: string[];
  platforms: string[];
  maxRetries: number;
  retryDelayMs: number;
}

export interface DataPullResult {
  success: boolean;
  propsUpdated: number;
  oddsUpdated: number;
  errors: string[];
  timestamp: Date;
  executionTimeMs: number;
}

export interface LineMovementData {
  propId: string;
  platform: string;
  oldLine: number;
  newLine: number;
  oldOdds: number;
  newOdds: number;
  changePercent: number;
  timestamp: Date;
}

export interface GameResult {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameDate: Date;
  status: 'FINAL' | 'POSTPONED' | 'CANCELLED';
}

export interface PropResult {
  propId: string;
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  actualValue: number;
  result: 'HIT' | 'MISS' | 'PUSH';
  gameId: string;
}

export interface HistoricalPropData {
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

export interface PropHitRateData {
  playerName: string;
  propType: string;
  line: number;
  hitRate: number;
  gameCount: number;
  confidence: 'high' | 'medium' | 'low';
}

// Data Automation Service
export class DataAutomationService {
  private static instance: DataAutomationService;
  private automationConfig: AutomationConfig;
  // private isRunning: boolean = false;
  // private intervalId: NodeJS.Timeout | null = null;
  // private lastRunTime: Date | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;

  constructor() {
    this.automationConfig = {
      enabled: process.env.DATA_AUTOMATION_ENABLED === 'true',
      intervalMinutes: parseInt(process.env.DATA_AUTOMATION_INTERVAL_MINUTES || '60'),
      sports: (process.env.DATA_AUTOMATION_SPORTS || 'nfl,nba,mlb,nhl,wnba').split(','),
      platforms: (process.env.DATA_AUTOMATION_PLATFORMS || 'underdog,prizepicks,pick6').split(','),
      maxRetries: parseInt(process.env.DATA_AUTOMATION_MAX_RETRIES || '3'),
      retryDelayMs: parseInt(process.env.DATA_AUTOMATION_RETRY_DELAY_MS || '5000')
    };
  }

  static getInstance(): DataAutomationService {
    if (!DataAutomationService.instance) {
      DataAutomationService.instance = new DataAutomationService();
    }
    return DataAutomationService.instance;
  }

  /* ++++++++++ CONFIGURATION ++++++++++ */
  updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.automationConfig = { ...this.automationConfig, ...newConfig };
    this.saveConfig();
    this.restartAutomation();
  }

  getConfig(): AutomationConfig {
    return { ...this.automationConfig };
  }

  private saveConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('AUTOMATION_CONFIG', JSON.stringify(this.automationConfig));
      }
    } catch (error) {
      console.warn('Failed to save automation config:', error);
    }
  }

  /* ++++++++++ AUTOMATION CONTROL ++++++++++ */
  startAutomation(): void {
    if (!this.automationConfig.enabled) return;

    this.stopAutomation();
    
    const intervalMs = this.automationConfig.intervalMinutes * 60 * 1000;
    this.refreshTimer = setInterval(() => {
      this.refreshAllData();
    }, intervalMs);

    console.log(`Data automation started - refreshing every ${this.automationConfig.intervalMinutes} minutes`);
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
      
      const refreshPromises = this.automationConfig.sports.map(sport => 
        this.refreshSportData(sport)
      );

      await Promise.allSettled(refreshPromises);
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('LAST_REFRESH', new Date().toISOString());
      }
      
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
      const data = await fetchDFSProps(sport, undefined, this.automationConfig.platforms, true);
      
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
            platform: bookmaker.key,
            sport,
            gameDate: new Date(currentDate),
            actualResult: undefined, // Will be updated when game results are available
            hit: undefined // Will be calculated when actualResult is available
          };
          
          try {
            // TODO: Implement saveHistoricalProp function
            console.log('Would save historical prop:', propData);
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
      platform: 'manual', // Default platform for manually added results
      sport,
      gameDate: new Date(gameDate),
      actualResult,
      hit
    };

    try {
      // TODO: Implement saveHistoricalProp function
      console.log('Would save historical data:', historicalData);
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
      
      const minGameSample = 10; // Default minimum sample size
      if (historicalData.length < minGameSample) {
        return; // Not enough data for reliable hit rate
      }

      const hits = historicalData.filter(d => d.hit).length;
      const hitRate = hits / historicalData.length;
      const confidence = this.calculateConfidence(historicalData.length, hitRate);

      // TODO: Implement calculateAndSaveHitRate function
      console.log('Would save hit rate:', {
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

  async getHitRate(_playerName: string, _propType: string, _line: number): Promise<number> {
    try {
      // TODO: Implement getHitRate function
      return 0.5; // Default to 50% if no data
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
    _playerName?: string, 
    _propType?: string, 
    _line?: number,
    _limit?: number
  ): Promise<HistoricalPropData[]> {
    try {
      // TODO: Implement getHistoricalProps function
      const data: any[] = [];
      
      // Convert database format to expected format
      return data.map(prop => ({
        id: `${prop.playerName}-${prop.propType}-${prop.gameDate.toISOString().split('T')[0]}`,
        playerName: prop.playerName,
        propType: prop.propType,
        line: typeof prop.line === 'object' && prop.line.toNumber ? prop.line.toNumber() : Number(prop.line),
        actualResult: typeof prop.actualResult === 'object' && prop.actualResult?.toNumber ? prop.actualResult.toNumber() : Number(prop.actualResult || 0),
        hit: prop.hit || false,
        gameDate: prop.gameDate.toISOString().split('T')[0],
        sport: typeof prop.sport === 'string' ? prop.sport : prop.sport?.key || 'unknown',
        season: prop.season || 'unknown'
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
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('LAST_REFRESH');
      }
      return null;
    } catch {
      return null;
    }
  }

  /* ++++++++++ UTILITY METHODS ++++++++++ */
  // getCurrentSeason method removed as it's not currently used

  /* ++++++++++ DATA MANAGEMENT ++++++++++ */
  async clearAllData(): Promise<void> {
    try {
      // Clear localStorage config
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('AUTOMATION_CONFIG');
        localStorage.removeItem('LAST_REFRESH');
      }
      
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
        config: this.automationConfig
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
          // TODO: Implement saveHistoricalProp function
          console.log('Would save historical prop:', {
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
        config: this.automationConfig,
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
        config: this.automationConfig,
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