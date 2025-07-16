import { prisma } from './database';
import { fetchDFSProps } from './api';
import type { 
  HistoricalProp, 
  HitRate, 
  UserBookmark, 
  UserBet, 
  UserAnalytics,
  Sport,
  Platform 
} from '@prisma/client';

// Types for API responses
export interface PropData {
  playerName: string;
  propType: string;
  line: number;
  odds?: number;
  platform: string;
  sport: string;
  gameDate?: Date;
  gameId?: string;
  homeTeam?: string;
  awayTeam?: string;
}

export interface HitRateCalculation {
  playerName: string;
  propType: string;
  lineRangeMin: number;
  lineRangeMax: number;
  hitRate: number;
  gameCount: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  standardError?: number;
  confidenceInterval?: { lower: number; upper: number };
}

export interface EVCalculationResult {
  playerName: string;
  propType: string;
  line: number;
  platform: string;
  sport: string;
  hitRate: number;
  impliedProbability: number;
  expectedValue: number;
  confidence: 'high' | 'medium' | 'low';
  gameCount: number;
  odds?: number;
}

export interface UserPerformanceMetrics {
  totalBets: number;
  winningBets: number;
  winRate: number;
  totalProfit: number;
  averageEV: number;
  roi: number;
  currentStreak: number;
  longestWinStreak: number;
}

// Data Service Class
export class DataService {
  // ================================
  // HISTORICAL PROPS MANAGEMENT
  // ================================

  static async saveHistoricalProp(propData: PropData & { actualResult?: number; hit?: boolean }): Promise<HistoricalProp> {
    // Get sport and platform IDs
    const sport = await this.getSportByKey(propData.sport);
    const platform = await this.getPlatformByKey(propData.platform);

    if (!sport || !platform) {
      throw new Error(`Invalid sport (${propData.sport}) or platform (${propData.platform})`);
    }

    return prisma.historicalProp.create({
      data: {
        playerName: propData.playerName,
        propType: propData.propType,
        line: propData.line,
        actualResult: propData.actualResult,
        hit: propData.hit,
        gameDate: propData.gameDate || new Date(),
        sportId: sport.id,
        platformId: platform.id,
        odds: propData.odds,
        gameId: propData.gameId,
        homeTeam: propData.homeTeam,
        awayTeam: propData.awayTeam,
      },
    });
  }

  static async getHistoricalProps(filters: {
    playerName?: string;
    propType?: string;
    sport?: string;
    platform?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<(HistoricalProp & { sport: Sport; platform: Platform })[]> {
    const where: any = {};

    if (filters.playerName) {
      where.playerName = { contains: filters.playerName, mode: 'insensitive' };
    }
    if (filters.propType) {
      where.propType = filters.propType;
    }
    if (filters.sport) {
      where.sport = { key: filters.sport };
    }
    if (filters.platform) {
      where.platform = { key: filters.platform };
    }
    if (filters.startDate || filters.endDate) {
      where.gameDate = {};
      if (filters.startDate) where.gameDate.gte = filters.startDate;
      if (filters.endDate) where.gameDate.lte = filters.endDate;
    }

    return prisma.historicalProp.findMany({
      where,
      include: {
        sport: true,
        platform: true,
      },
      orderBy: { gameDate: 'desc' },
      take: filters.limit || 1000,
    });
  }

  static async updateHistoricalPropResult(id: string, actualResult: number): Promise<HistoricalProp> {
    const prop = await prisma.historicalProp.findUnique({ where: { id } });
    if (!prop) {
      throw new Error('Historical prop not found');
    }

    const hit = actualResult >= prop.line.toNumber();

    return prisma.historicalProp.update({
      where: { id },
      data: {
        actualResult,
        hit,
        updatedAt: new Date(),
      },
    });
  }

  // ================================
  // HIT RATE CALCULATIONS
  // ================================

  static async calculateHitRate(
    playerName: string,
    propType: string,
    lineRange: { min: number; max: number },
    sportKey: string,
    days: number = 90
  ): Promise<HitRateCalculation | null> {
    const sport = await this.getSportByKey(sportKey);
    if (!sport) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historicalData = await prisma.historicalProp.findMany({
      where: {
        playerName: { equals: playerName, mode: 'insensitive' },
        propType,
        sportId: sport.id,
        line: {
          gte: lineRange.min,
          lte: lineRange.max,
        },
        gameDate: { gte: startDate },
        hit: { not: null },
      },
    });

    if (historicalData.length < 5) {
      return null; // Not enough data
    }

    const hits = historicalData.filter(prop => prop.hit).length;
    const total = historicalData.length;
    const hitRate = hits / total;

    // Calculate confidence level based on sample size
    let confidenceLevel: 'high' | 'medium' | 'low';
    if (total >= 30) confidenceLevel = 'high';
    else if (total >= 15) confidenceLevel = 'medium';
    else confidenceLevel = 'low';

    // Calculate standard error and confidence interval
    const standardError = Math.sqrt((hitRate * (1 - hitRate)) / total);
    const marginOfError = 1.96 * standardError; // 95% confidence interval
    const confidenceInterval = {
      lower: Math.max(0, hitRate - marginOfError),
      upper: Math.min(1, hitRate + marginOfError),
    };

    return {
      playerName,
      propType,
      lineRangeMin: lineRange.min,
      lineRangeMax: lineRange.max,
      hitRate,
      gameCount: total,
      confidenceLevel,
      standardError,
      confidenceInterval,
    };
  }

  static async saveHitRate(hitRateData: HitRateCalculation, sportKey: string, season?: string): Promise<HitRate> {
    const sport = await this.getSportByKey(sportKey);
    if (!sport) {
      throw new Error(`Invalid sport: ${sportKey}`);
    }

    return prisma.hitRate.upsert({
      where: {
        playerName_propType_lineRangeMin_lineRangeMax_sportId_season: {
          playerName: hitRateData.playerName,
          propType: hitRateData.propType,
          lineRangeMin: hitRateData.lineRangeMin,
          lineRangeMax: hitRateData.lineRangeMax,
          sportId: sport.id,
          season: season || '',
        },
      },
      update: {
        hitRate: hitRateData.hitRate,
        gameCount: hitRateData.gameCount,
        confidenceLevel: hitRateData.confidenceLevel,
        standardError: hitRateData.standardError,
        confidenceInterval: hitRateData.confidenceInterval,
        lastUpdated: new Date(),
      },
      create: {
        playerName: hitRateData.playerName,
        propType: hitRateData.propType,
        lineRangeMin: hitRateData.lineRangeMin,
        lineRangeMax: hitRateData.lineRangeMax,
        hitRate: hitRateData.hitRate,
        gameCount: hitRateData.gameCount,
        confidenceLevel: hitRateData.confidenceLevel,
        sportId: sport.id,
        season,
        standardError: hitRateData.standardError,
        confidenceInterval: hitRateData.confidenceInterval,
      },
    });
  }

  static async getHitRate(
    playerName: string,
    propType: string,
    line: number,
    sportKey: string
  ): Promise<number> {
    const sport = await this.getSportByKey(sportKey);
    if (!sport) return 0.5; // Default hit rate

    // Find hit rate for the closest line range
    const hitRate = await prisma.hitRate.findFirst({
      where: {
        playerName: { equals: playerName, mode: 'insensitive' },
        propType,
        sportId: sport.id,
        lineRangeMin: { lte: line },
        lineRangeMax: { gte: line },
      },
      orderBy: {
        gameCount: 'desc', // Prefer hit rates with more data
      },
    });

    return hitRate?.hitRate.toNumber() || 0.5;
  }

  // ================================
  // USER BOOKMARKS
  // ================================

  static async addBookmark(
    userId: string,
    propData: PropData,
    notes?: string,
    tags?: string[]
  ): Promise<UserBookmark> {
    const platform = await this.getPlatformByKey(propData.platform);
    if (!platform) {
      throw new Error(`Invalid platform: ${propData.platform}`);
    }

    return prisma.userBookmark.create({
      data: {
        userId,
        playerName: propData.playerName,
        propType: propData.propType,
        line: propData.line,
        platformId: platform.id,
        notes,
        tags: tags || [],
      },
    });
  }

  static async getUserBookmarks(userId: string): Promise<(UserBookmark & { platform: Platform })[]> {
    return prisma.userBookmark.findMany({
      where: { userId },
      include: { platform: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async removeBookmark(userId: string, bookmarkId: string): Promise<void> {
    await prisma.userBookmark.deleteMany({
      where: {
        id: bookmarkId,
        userId,
      },
    });
  }

  // ================================
  // USER BETS TRACKING
  // ================================

  static async recordBet(
    userId: string,
    propData: PropData & {
      predictedEv: number;
      betAmount?: number;
      confidence?: string;
      kellyFraction?: number;
    }
  ): Promise<UserBet> {
    const platform = await this.getPlatformByKey(propData.platform);
    if (!platform) {
      throw new Error(`Invalid platform: ${propData.platform}`);
    }

    return prisma.userBet.create({
      data: {
        userId,
        playerName: propData.playerName,
        propType: propData.propType,
        line: propData.line,
        predictedEv: propData.predictedEv,
        betAmount: propData.betAmount,
        platformId: platform.id,
        odds: propData.odds,
        confidence: propData.confidence,
        gameDate: propData.gameDate,
        kellyFraction: propData.kellyFraction,
      },
    });
  }

  static async settleBet(
    betId: string,
    actualResult: number,
    profitLoss?: number
  ): Promise<UserBet> {
    const bet = await prisma.userBet.findUnique({ where: { id: betId } });
    if (!bet) {
      throw new Error('Bet not found');
    }

    const won = actualResult >= bet.line.toNumber();
    
    return prisma.userBet.update({
      where: { id: betId },
      data: {
        actualResult,
        won,
        profitLoss,
        settledAt: new Date(),
      },
    });
  }

  static async getUserBets(
    userId: string,
    filters: {
      settled?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<(UserBet & { platform: Platform })[]> {
    const where: any = { userId };

    if (filters.settled !== undefined) {
      where.settledAt = filters.settled ? { not: null } : null;
    }
    if (filters.startDate || filters.endDate) {
      where.betDate = {};
      if (filters.startDate) where.betDate.gte = filters.startDate;
      if (filters.endDate) where.betDate.lte = filters.endDate;
    }

    return prisma.userBet.findMany({
      where,
      include: { platform: true },
      orderBy: { betDate: 'desc' },
      take: filters.limit || 100,
    });
  }

  // ================================
  // USER ANALYTICS
  // ================================

  static async calculateUserPerformance(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UserPerformanceMetrics> {
    const bets = await prisma.userBet.findMany({
      where: {
        userId,
        betDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        settledAt: { not: null },
      },
    });

    const totalBets = bets.length;
    const winningBets = bets.filter(bet => bet.won).length;
    const winRate = totalBets > 0 ? winningBets / totalBets : 0;
    const totalProfit = bets.reduce((sum, bet) => sum + (bet.profitLoss?.toNumber() || 0), 0);
    const averageEV = totalBets > 0 ? 
      bets.reduce((sum, bet) => sum + bet.predictedEv.toNumber(), 0) / totalBets : 0;
    const totalWagered = bets.reduce((sum, bet) => sum + (bet.betAmount?.toNumber() || 0), 0);
    const roi = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestWinStreak = 0;
    let tempWinStreak = 0;

    const sortedBets = bets.sort((a, b) => a.betDate.getTime() - b.betDate.getTime());
    
    for (let i = sortedBets.length - 1; i >= 0; i--) {
      const bet = sortedBets[i];
      if (bet.won) {
        if (i === sortedBets.length - 1) currentStreak++;
        tempWinStreak++;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else {
        if (i === sortedBets.length - 1) currentStreak = 0;
        tempWinStreak = 0;
      }
    }

    return {
      totalBets,
      winningBets,
      winRate,
      totalProfit,
      averageEV,
      roi,
      currentStreak,
      longestWinStreak,
    };
  }

  static async saveUserAnalytics(
    userId: string,
    metrics: UserPerformanceMetrics,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UserAnalytics> {
    return prisma.userAnalytics.upsert({
      where: {
        userId_periodStart_periodEnd: {
          userId,
          periodStart,
          periodEnd,
        },
      },
      update: {
        ...metrics,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...metrics,
        periodStart,
        periodEnd,
      },
    });
  }

  // ================================
  // DATA AUTOMATION
  // ================================

  static async refreshPropsData(): Promise<{ success: boolean; propsCount: number; errors: string[] }> {
    const errors: string[] = [];
    let propsCount = 0;

    try {
      // Get all active sports and platforms
      const sports = await prisma.sport.findMany({ where: { active: true } });
      const platforms = await prisma.platform.findMany({ where: { active: true, platformType: 'dfs' } });

      for (const sport of sports) {
        try {
          const props = await fetchDFSProps(sport.key);
          
          for (const prop of props) {
            for (const platform of platforms) {
              try {
                await this.saveHistoricalProp({
                  ...prop,
                  platform: platform.key,
                  sport: sport.key,
                });
                propsCount++;
              } catch (error) {
                errors.push(`Failed to save prop for ${platform.key}: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          }
        } catch (error) {
          errors.push(`Failed to fetch props for ${sport.key}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return { success: errors.length === 0, propsCount, errors };
    } catch (error) {
      return { success: false, propsCount: 0, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  static async recalculateAllHitRates(): Promise<{ success: boolean; hitRatesCount: number; errors: string[] }> {
    const errors: string[] = [];
    let hitRatesCount = 0;

    try {
      // Get unique player-prop combinations
      const combinations = await prisma.historicalProp.groupBy({
        by: ['playerName', 'propType', 'sportId'],
        _count: { id: true },
        having: {
          id: { _count: { gte: 5 } }, // Minimum 5 games
        },
      });

      for (const combo of combinations) {
        try {
          const sport = await prisma.sport.findUnique({ where: { id: combo.sportId } });
          if (!sport) continue;

          // Get line ranges for this player-prop combination
          const props = await prisma.historicalProp.findMany({
            where: {
              playerName: combo.playerName,
              propType: combo.propType,
              sportId: combo.sportId,
            },
            select: { line: true },
          });

          const lines = props.map(p => p.line.toNumber()).sort((a, b) => a - b);
          const minLine = lines[0];
          const maxLine = lines[lines.length - 1];

          // Calculate hit rate for the full range
          const hitRateData = await this.calculateHitRate(
            combo.playerName,
            combo.propType,
            { min: minLine, max: maxLine },
            sport.key
          );

          if (hitRateData) {
            await this.saveHitRate(hitRateData, sport.key);
            hitRatesCount++;
          }
        } catch (error) {
          errors.push(`Failed to calculate hit rate for ${combo.playerName} ${combo.propType}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return { success: errors.length === 0, hitRatesCount, errors };
    } catch (error) {
      return { success: false, hitRatesCount: 0, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  // ================================
  // HELPER METHODS
  // ================================

  private static async getSportByKey(key: string): Promise<Sport | null> {
    return prisma.sport.findUnique({ where: { key } });
  }

  private static async getPlatformByKey(key: string): Promise<Platform | null> {
    return prisma.platform.findUnique({ where: { key } });
  }

  // ================================
  // SYSTEM CONFIGURATION
  // ================================

  static async getSystemConfig(key: string): Promise<any> {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    return config?.value;
  }

  static async setSystemConfig(key: string, value: any, category?: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, category },
      create: { key, value, category },
    });
  }
}

// ================================
// CONVENIENCE FUNCTIONS FOR DATA AUTOMATION
// ================================

export async function saveHistoricalProp(propData: PropData & { actualResult?: number; hit?: boolean; season?: string }): Promise<HistoricalProp> {
  return DataService.saveHistoricalProp(propData);
}

export async function getHistoricalProps(filters: {
  playerName?: string;
  propType?: string;
  sport?: string;
  platform?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  line?: number;
} = {}): Promise<(HistoricalProp & { sport: Sport; platform: Platform })[]> {
  return DataService.getHistoricalProps(filters);
}

export async function calculateAndSaveHitRate(data: {
  playerName: string;
  propType: string;
  line: number;
  hitRate: number;
  gameCount: number;
  confidence: 'high' | 'medium' | 'low';
}): Promise<HitRate> {
  // Convert single line to line range for storage
  const hitRateData: HitRateCalculation = {
    playerName: data.playerName,
    propType: data.propType,
    lineRangeMin: data.line,
    lineRangeMax: data.line,
    hitRate: data.hitRate,
    gameCount: data.gameCount,
    confidenceLevel: data.confidence,
  };
  
  // Default to current year for season
  const currentYear = new Date().getFullYear();
  const season = currentYear.toString();
  
  // We need to determine the sport - for now, default to NBA
  // This should be passed as a parameter in a real implementation
  const sportKey = 'basketball_nba';
  
  return DataService.saveHitRate(hitRateData, sportKey, season);
}

export async function getHitRate(playerName: string, propType: string, line: number, sport: string = 'basketball_nba'): Promise<number> {
  return DataService.getHitRate(playerName, propType, line, sport);
}

export async function refreshDataAutomation(): Promise<{ success: boolean; propsCount: number; errors: string[] }> {
  return DataService.refreshPropsData();
}

export default DataService;