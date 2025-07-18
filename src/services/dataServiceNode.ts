/**
 * Node.js-compatible DataService
 * For use in server-side scripts like seed.ts
 * Avoids importing browser-specific services that use import.meta.env
 */

import { prisma } from './database';
import { fetchDFSPropsNode } from './apiNode';
import type { 
  HistoricalProp, 
  HitRate, 
  UserBookmark, 
  UserBet, 
  UserAnalytics,
  Sport,
  Platform 
} from '@prisma/client';

// Types for API responses (same as browser version)
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

// Node.js Data Service Class
export class DataServiceNode {
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

  static async recalculateAllHitRates(): Promise<{ hitRatesCount: number; errors: string[] }> {
    console.log('📊 Recalculating all hit rates...');
    
    const errors: string[] = [];
    let hitRatesCount = 0;

    try {
      // Get all unique player-prop combinations
      const combinations = await prisma.historicalProp.groupBy({
        by: ['playerName', 'propType', 'sportId'],
        _count: {
          id: true,
        },
        having: {
          id: {
            _count: {
              gte: 5, // Minimum 5 games for hit rate calculation
            },
          },
        },
      });

      console.log(`Found ${combinations.length} player-prop combinations with sufficient data`);

      for (const combo of combinations) {
        try {
          const sport = await prisma.sport.findUnique({ where: { id: combo.sportId } });
          if (!sport) continue;

          // Get line range for this combination
          const lineStats = await prisma.historicalProp.aggregate({
            where: {
              playerName: combo.playerName,
              propType: combo.propType,
              sportId: combo.sportId,
            },
            _min: { line: true },
            _max: { line: true },
          });

          if (!lineStats._min.line || !lineStats._max.line) continue;

          const hitRateCalc = await this.calculateHitRate(
            combo.playerName,
            combo.propType,
            {
              min: lineStats._min.line.toNumber(),
              max: lineStats._max.line.toNumber(),
            },
            sport.key
          );

          if (hitRateCalc) {
            // Save or update hit rate
            await prisma.hitRate.upsert({
              where: {
                playerName_propType_sportId_lineRangeMin_lineRangeMax: {
                  playerName: combo.playerName,
                  propType: combo.propType,
                  sportId: combo.sportId,
                  lineRangeMin: hitRateCalc.lineRangeMin,
                  lineRangeMax: hitRateCalc.lineRangeMax,
                },
              },
              update: {
                hitRate: hitRateCalc.hitRate,
                gameCount: hitRateCalc.gameCount,
                confidenceLevel: hitRateCalc.confidenceLevel,
                standardError: hitRateCalc.standardError,
                updatedAt: new Date(),
              },
              create: {
                playerName: combo.playerName,
                propType: combo.propType,
                sportId: combo.sportId,
                lineRangeMin: hitRateCalc.lineRangeMin,
                lineRangeMax: hitRateCalc.lineRangeMax,
                hitRate: hitRateCalc.hitRate,
                gameCount: hitRateCalc.gameCount,
                confidenceLevel: hitRateCalc.confidenceLevel,
                standardError: hitRateCalc.standardError,
              },
            });

            hitRatesCount++;
          }
        } catch (error) {
          const errorMsg = `Failed to calculate hit rate for ${combo.playerName} ${combo.propType}: ${error}`;
          errors.push(errorMsg);
          console.warn(errorMsg);
        }
      }

      console.log(`✅ Recalculated ${hitRatesCount} hit rates`);
      return { hitRatesCount, errors };
      
    } catch (error) {
      console.error('❌ Failed to recalculate hit rates:', error);
      throw error;
    }
  }

  // ================================
  // HELPER METHODS
  // ================================

  static async getSportByKey(key: string): Promise<Sport | null> {
    return prisma.sport.findUnique({ where: { key } });
  }

  static async getPlatformByKey(key: string): Promise<Platform | null> {
    return prisma.platform.findUnique({ where: { key } });
  }

  // ================================
  // DATA FETCHING (Node.js version)
  // ================================

  static async fetchAndStoreDFSProps(sport: string): Promise<number> {
    console.log(`🔄 Fetching and storing DFS props for ${sport}...`);
    
    try {
      const propsData = await fetchDFSPropsNode(sport);
      let storedCount = 0;

      for (const prop of propsData) {
        // Process and store each prop
        // This is a simplified version - you may need to adapt based on actual API response structure
        try {
          await this.saveHistoricalProp({
            playerName: prop.playerName || 'Unknown Player',
            propType: prop.propType || 'unknown',
            line: prop.line || 0,
            platform: 'api_fetch',
            sport: sport,
            gameDate: new Date(),
            odds: prop.odds,
          });
          storedCount++;
        } catch (error) {
          console.warn(`Failed to store prop:`, error);
        }
      }

      console.log(`✅ Stored ${storedCount} props for ${sport}`);
      return storedCount;
      
    } catch (error) {
      console.error(`❌ Failed to fetch/store DFS props for ${sport}:`, error);
      return 0;
    }
  }
}

// Export for backward compatibility
export const DataService = DataServiceNode;