/* ++++++++++ PERFORMANCE ANALYTICS SERVICE ++++++++++ */
import { prisma } from './database';
import type { UserBet, User } from '@prisma/client';

// Performance analytics interfaces
export interface BettingPerformance {
  userId: string;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  pushBets: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
  roi: number; // Return on Investment
  averageBetSize: number;
  averageOdds: number;
  profitFactor: number; // Total wins / Total losses
  sharpeRatio: number;
  maxDrawdown: number;
  currentStreak: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  timeframe: string;
}

export interface PlatformPerformance {
  platform: string;
  bets: number;
  winRate: number;
  roi: number;
  netProfit: number;
  averageBetSize: number;
}

export interface SportPerformance {
  sport: string;
  bets: number;
  winRate: number;
  roi: number;
  netProfit: number;
  averageBetSize: number;
}

export interface PropTypePerformance {
  propType: string;
  bets: number;
  winRate: number;
  roi: number;
  netProfit: number;
  averageBetSize: number;
}

export interface MonthlyPerformance {
  month: string;
  year: number;
  bets: number;
  winRate: number;
  roi: number;
  netProfit: number;
  totalWagered: number;
}

export interface PerformanceMetrics {
  overall: BettingPerformance;
  byPlatform: PlatformPerformance[];
  bySport: SportPerformance[];
  byPropType: PropTypePerformance[];
  monthly: MonthlyPerformance[];
  recentTrend: {
    last7Days: BettingPerformance;
    last30Days: BettingPerformance;
    last90Days: BettingPerformance;
  };
}

export interface BettingInsights {
  bestPerformingPlatform: string;
  bestPerformingSport: string;
  bestPerformingPropType: string;
  optimalBetSize: number;
  recommendations: string[];
  warnings: string[];
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RiskMetrics {
  volatility: number;
  valueAtRisk: number; // VaR at 95% confidence
  expectedShortfall: number; // Conditional VaR
  maxDrawdownPercent: number;
  calmarRatio: number; // Annual return / Max drawdown
  sortinoRatio: number; // Downside deviation adjusted return
}

// Performance Analytics Service
export class PerformanceAnalyticsService {
  private static instance: PerformanceAnalyticsService;

  private constructor() {}

  static getInstance(): PerformanceAnalyticsService {
    if (!PerformanceAnalyticsService.instance) {
      PerformanceAnalyticsService.instance = new PerformanceAnalyticsService();
    }
    return PerformanceAnalyticsService.instance;
  }

  /**
   * Get comprehensive performance metrics for a user
   */
  async getUserPerformanceMetrics(
    userId: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    const whereClause = {
      userId,
      ...(timeframe && {
        placedAt: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      })
    };

    const [overall, byPlatform, bySport, byPropType, monthly, recentTrend] = await Promise.all([
      this.calculateOverallPerformance(userId, whereClause),
      this.calculatePlatformPerformance(userId, whereClause),
      this.calculateSportPerformance(userId, whereClause),
      this.calculatePropTypePerformance(userId, whereClause),
      this.calculateMonthlyPerformance(userId, whereClause),
      this.calculateRecentTrends(userId)
    ]);

    return {
      overall,
      byPlatform,
      bySport,
      byPropType,
      monthly,
      recentTrend
    };
  }

  /**
   * Calculate overall betting performance
   */
  private async calculateOverallPerformance(
    userId: string,
    whereClause: any
  ): Promise<BettingPerformance> {
    const bets = await prisma.userBet.findMany({
      where: whereClause,
      include: {
        historicalProp: {
          include: {
            platform: true,
            sport: true
          }
        }
      },
      orderBy: { placedAt: 'asc' }
    });

    if (bets.length === 0) {
      return this.getEmptyPerformance(userId);
    }

    const totalBets = bets.length;
    const winningBets = bets.filter(bet => bet.result === 'WIN').length;
    const losingBets = bets.filter(bet => bet.result === 'LOSS').length;
    const pushBets = bets.filter(bet => bet.result === 'PUSH').length;
    
    const winRate = totalBets > 0 ? winningBets / totalBets : 0;
    
    const totalWagered = bets.reduce((sum, bet) => sum + bet.betAmount, 0);
    const totalWon = bets
      .filter(bet => bet.result === 'WIN')
      .reduce((sum, bet) => sum + bet.potentialPayout, 0);
    const totalLost = bets
      .filter(bet => bet.result === 'LOSS')
      .reduce((sum, bet) => sum + bet.betAmount, 0);
    
    const netProfit = totalWon - totalLost;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
    
    const averageBetSize = totalWagered / totalBets;
    const averageOdds = bets.reduce((sum, bet) => sum + bet.odds, 0) / totalBets;
    
    const profitFactor = totalLost > 0 ? totalWon / totalLost : totalWon > 0 ? Infinity : 0;
    
    // Calculate Sharpe ratio (simplified)
    const returns = this.calculateDailyReturns(bets);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(bets);
    
    // Calculate streaks
    const { currentStreak, longestWinStreak, longestLoseStreak } = this.calculateStreaks(bets);

    return {
      userId,
      totalBets,
      winningBets,
      losingBets,
      pushBets,
      winRate: Math.round(winRate * 1000) / 10, // Percentage with 1 decimal
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalWon: Math.round(totalWon * 100) / 100,
      totalLost: Math.round(totalLost * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      averageBetSize: Math.round(averageBetSize * 100) / 100,
      averageOdds: Math.round(averageOdds * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 1000) / 1000,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      currentStreak,
      longestWinStreak,
      longestLoseStreak,
      timeframe: 'overall'
    };
  }

  /**
   * Calculate performance by platform
   */
  private async calculatePlatformPerformance(
    userId: string,
    whereClause: any
  ): Promise<PlatformPerformance[]> {
    const bets = await prisma.userBet.findMany({
      where: whereClause,
      include: {
        historicalProp: {
          include: { platform: true }
        }
      }
    });

    const platformGroups = new Map<string, typeof bets>();
    
    for (const bet of bets) {
      const platform = bet.historicalProp.platform.name;
      if (!platformGroups.has(platform)) {
        platformGroups.set(platform, []);
      }
      platformGroups.get(platform)!.push(bet);
    }

    const results: PlatformPerformance[] = [];
    
    for (const [platform, platformBets] of platformGroups) {
      const performance = this.calculateGroupPerformance(platformBets);
      results.push({
        platform,
        ...performance
      });
    }

    return results.sort((a, b) => b.roi - a.roi);
  }

  /**
   * Calculate performance by sport
   */
  private async calculateSportPerformance(
    userId: string,
    whereClause: any
  ): Promise<SportPerformance[]> {
    const bets = await prisma.userBet.findMany({
      where: whereClause,
      include: {
        historicalProp: {
          include: { sport: true }
        }
      }
    });

    const sportGroups = new Map<string, typeof bets>();
    
    for (const bet of bets) {
      const sport = bet.historicalProp.sport.name;
      if (!sportGroups.has(sport)) {
        sportGroups.set(sport, []);
      }
      sportGroups.get(sport)!.push(bet);
    }

    const results: SportPerformance[] = [];
    
    for (const [sport, sportBets] of sportGroups) {
      const performance = this.calculateGroupPerformance(sportBets);
      results.push({
        sport,
        ...performance
      });
    }

    return results.sort((a, b) => b.roi - a.roi);
  }

  /**
   * Calculate performance by prop type
   */
  private async calculatePropTypePerformance(
    userId: string,
    whereClause: any
  ): Promise<PropTypePerformance[]> {
    const bets = await prisma.userBet.findMany({
      where: whereClause,
      include: { historicalProp: true }
    });

    const propTypeGroups = new Map<string, typeof bets>();
    
    for (const bet of bets) {
      const propType = bet.historicalProp.propType;
      if (!propTypeGroups.has(propType)) {
        propTypeGroups.set(propType, []);
      }
      propTypeGroups.get(propType)!.push(bet);
    }

    const results: PropTypePerformance[] = [];
    
    for (const [propType, propTypeBets] of propTypeGroups) {
      const performance = this.calculateGroupPerformance(propTypeBets);
      results.push({
        propType,
        ...performance
      });
    }

    return results.sort((a, b) => b.roi - a.roi);
  }

  /**
   * Calculate monthly performance
   */
  private async calculateMonthlyPerformance(
    userId: string,
    whereClause: any
  ): Promise<MonthlyPerformance[]> {
    const bets = await prisma.userBet.findMany({
      where: whereClause,
      orderBy: { placedAt: 'asc' }
    });

    const monthlyGroups = new Map<string, typeof bets>();
    
    for (const bet of bets) {
      const date = new Date(bet.placedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(bet);
    }

    const results: MonthlyPerformance[] = [];
    
    for (const [monthKey, monthBets] of monthlyGroups) {
      const [year, month] = monthKey.split('-');
      const performance = this.calculateGroupPerformance(monthBets);
      
      results.push({
        month,
        year: parseInt(year),
        bets: performance.bets,
        winRate: performance.winRate,
        roi: performance.roi,
        netProfit: performance.netProfit,
        totalWagered: monthBets.reduce((sum, bet) => sum + bet.betAmount, 0)
      });
    }

    return results.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return parseInt(b.month) - parseInt(a.month);
    });
  }

  /**
   * Calculate recent performance trends
   */
  private async calculateRecentTrends(userId: string): Promise<{
    last7Days: BettingPerformance;
    last30Days: BettingPerformance;
    last90Days: BettingPerformance;
  }> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [performance7d, performance30d, performance90d] = await Promise.all([
      this.calculateOverallPerformance(userId, {
        userId,
        placedAt: { gte: last7Days }
      }),
      this.calculateOverallPerformance(userId, {
        userId,
        placedAt: { gte: last30Days }
      }),
      this.calculateOverallPerformance(userId, {
        userId,
        placedAt: { gte: last90Days }
      })
    ]);

    performance7d.timeframe = 'last7Days';
    performance30d.timeframe = 'last30Days';
    performance90d.timeframe = 'last90Days';

    return {
      last7Days: performance7d,
      last30Days: performance30d,
      last90Days: performance90d
    };
  }

  /**
   * Generate betting insights and recommendations
   */
  async generateBettingInsights(userId: string): Promise<BettingInsights> {
    const metrics = await this.getUserPerformanceMetrics(userId);
    
    const bestPlatform = metrics.byPlatform.length > 0 
      ? metrics.byPlatform[0].platform 
      : 'N/A';
    
    const bestSport = metrics.bySport.length > 0 
      ? metrics.bySport[0].sport 
      : 'N/A';
    
    const bestPropType = metrics.byPropType.length > 0 
      ? metrics.byPropType[0].propType 
      : 'N/A';

    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Generate recommendations
    if (metrics.overall.winRate > 55) {
      recommendations.push('Your win rate is above average. Consider increasing bet sizes.');
    }
    
    if (metrics.overall.roi > 10) {
      recommendations.push('Excellent ROI! Your strategy is working well.');
    }
    
    if (bestPlatform !== 'N/A') {
      recommendations.push(`Focus more on ${bestPlatform} - your best performing platform.`);
    }

    // Generate warnings
    if (metrics.overall.winRate < 45) {
      warnings.push('Win rate is below average. Review your selection criteria.');
    }
    
    if (metrics.overall.roi < -10) {
      warnings.push('Negative ROI detected. Consider reducing bet sizes or improving strategy.');
    }
    
    if (metrics.overall.currentStreak < -5) {
      warnings.push('Long losing streak detected. Consider taking a break.');
    }

    // Determine confidence level
    let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    if (metrics.overall.totalBets >= 100 && metrics.overall.winRate > 52) {
      confidenceLevel = 'HIGH';
    } else if (metrics.overall.totalBets >= 50) {
      confidenceLevel = 'MEDIUM';
    } else {
      confidenceLevel = 'LOW';
    }

    return {
      bestPerformingPlatform: bestPlatform,
      bestPerformingSport: bestSport,
      bestPerformingPropType: bestPropType,
      optimalBetSize: metrics.overall.averageBetSize,
      recommendations,
      warnings,
      confidenceLevel
    };
  }

  /**
   * Calculate risk metrics
   */
  async calculateRiskMetrics(userId: string): Promise<RiskMetrics> {
    const bets = await prisma.userBet.findMany({
      where: { userId },
      orderBy: { placedAt: 'asc' }
    });

    if (bets.length === 0) {
      return {
        volatility: 0,
        valueAtRisk: 0,
        expectedShortfall: 0,
        maxDrawdownPercent: 0,
        calmarRatio: 0,
        sortinoRatio: 0
      };
    }

    const returns = this.calculateDailyReturns(bets);
    const volatility = this.calculateVolatility(returns);
    const valueAtRisk = this.calculateVaR(returns, 0.95);
    const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95);
    const maxDrawdownPercent = this.calculateMaxDrawdownPercent(bets);
    const annualReturn = this.calculateAnnualReturn(bets);
    const calmarRatio = maxDrawdownPercent > 0 ? annualReturn / maxDrawdownPercent : 0;
    const sortinoRatio = this.calculateSortinoRatio(returns);

    return {
      volatility: Math.round(volatility * 10000) / 100, // As percentage
      valueAtRisk: Math.round(valueAtRisk * 10000) / 100,
      expectedShortfall: Math.round(expectedShortfall * 10000) / 100,
      maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 1000) / 1000,
      sortinoRatio: Math.round(sortinoRatio * 1000) / 1000
    };
  }

  // Helper methods
  private getEmptyPerformance(userId: string): BettingPerformance {
    return {
      userId,
      totalBets: 0,
      winningBets: 0,
      losingBets: 0,
      pushBets: 0,
      winRate: 0,
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      netProfit: 0,
      roi: 0,
      averageBetSize: 0,
      averageOdds: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      currentStreak: 0,
      longestWinStreak: 0,
      longestLoseStreak: 0,
      timeframe: 'overall'
    };
  }

  private calculateGroupPerformance(bets: any[]): {
    bets: number;
    winRate: number;
    roi: number;
    netProfit: number;
    averageBetSize: number;
  } {
    if (bets.length === 0) {
      return { bets: 0, winRate: 0, roi: 0, netProfit: 0, averageBetSize: 0 };
    }

    const winningBets = bets.filter(bet => bet.result === 'WIN').length;
    const winRate = winningBets / bets.length;
    
    const totalWagered = bets.reduce((sum, bet) => sum + bet.betAmount, 0);
    const totalWon = bets
      .filter(bet => bet.result === 'WIN')
      .reduce((sum, bet) => sum + bet.potentialPayout, 0);
    const totalLost = bets
      .filter(bet => bet.result === 'LOSS')
      .reduce((sum, bet) => sum + bet.betAmount, 0);
    
    const netProfit = totalWon - totalLost;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
    const averageBetSize = totalWagered / bets.length;

    return {
      bets: bets.length,
      winRate: Math.round(winRate * 1000) / 10,
      roi: Math.round(roi * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      averageBetSize: Math.round(averageBetSize * 100) / 100
    };
  }

  private calculateDailyReturns(bets: any[]): number[] {
    // Group bets by day and calculate daily returns
    const dailyGroups = new Map<string, any[]>();
    
    for (const bet of bets) {
      const dateKey = bet.placedAt.toISOString().split('T')[0];
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(bet);
    }

    const returns: number[] = [];
    
    for (const [date, dayBets] of dailyGroups) {
      const totalWagered = dayBets.reduce((sum, bet) => sum + bet.betAmount, 0);
      const totalWon = dayBets
        .filter(bet => bet.result === 'WIN')
        .reduce((sum, bet) => sum + bet.potentialPayout, 0);
      const totalLost = dayBets
        .filter(bet => bet.result === 'LOSS')
        .reduce((sum, bet) => sum + bet.betAmount, 0);
      
      const dailyReturn = totalWagered > 0 ? (totalWon - totalLost) / totalWagered : 0;
      returns.push(dailyReturn);
    }

    return returns;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? meanReturn / stdDev : 0;
  }

  private calculateMaxDrawdown(bets: any[]): number {
    let runningBalance = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (const bet of bets) {
      if (bet.result === 'WIN') {
        runningBalance += bet.potentialPayout - bet.betAmount;
      } else if (bet.result === 'LOSS') {
        runningBalance -= bet.betAmount;
      }
      
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      
      const drawdown = peak - runningBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateStreaks(bets: any[]): {
    currentStreak: number;
    longestWinStreak: number;
    longestLoseStreak: number;
  } {
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let currentWinStreak = 0;
    let currentLoseStreak = 0;

    for (let i = bets.length - 1; i >= 0; i--) {
      const bet = bets[i];
      
      if (bet.result === 'WIN') {
        if (i === bets.length - 1) currentStreak = 1;
        else if (bets[i + 1].result === 'WIN') currentStreak++;
        else currentStreak = 1;
        
        currentWinStreak++;
        currentLoseStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else if (bet.result === 'LOSS') {
        if (i === bets.length - 1) currentStreak = -1;
        else if (bets[i + 1].result === 'LOSS') currentStreak--;
        else currentStreak = -1;
        
        currentLoseStreak++;
        currentWinStreak = 0;
        longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
      } else {
        // Push - reset current streak but don't count towards win/loss streaks
        if (i === bets.length - 1) currentStreak = 0;
      }
    }

    return { currentStreak, longestWinStreak, longestLoseStreak };
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex + 1);
    
    if (tailReturns.length === 0) return 0;
    
    const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
    return Math.abs(avgTailReturn);
  }

  private calculateMaxDrawdownPercent(bets: any[]): number {
    const totalWagered = bets.reduce((sum, bet) => sum + bet.betAmount, 0);
    const maxDrawdown = this.calculateMaxDrawdown(bets);
    return totalWagered > 0 ? (maxDrawdown / totalWagered) * 100 : 0;
  }

  private calculateAnnualReturn(bets: any[]): number {
    if (bets.length === 0) return 0;
    
    const firstBet = bets[0];
    const lastBet = bets[bets.length - 1];
    const daysDiff = (lastBet.placedAt.getTime() - firstBet.placedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 0) return 0;
    
    const totalWagered = bets.reduce((sum, bet) => sum + bet.betAmount, 0);
    const totalWon = bets
      .filter(bet => bet.result === 'WIN')
      .reduce((sum, bet) => sum + bet.potentialPayout, 0);
    const totalLost = bets
      .filter(bet => bet.result === 'LOSS')
      .reduce((sum, bet) => sum + bet.betAmount, 0);
    
    const totalReturn = (totalWon - totalLost) / totalWagered;
    const annualReturn = (totalReturn * 365) / daysDiff;
    
    return annualReturn * 100; // As percentage
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return meanReturn > 0 ? Infinity : 0;
    
    const downwardDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    );
    
    return downwardDeviation > 0 ? meanReturn / downwardDeviation : 0;
  }
}

export default PerformanceAnalyticsService;