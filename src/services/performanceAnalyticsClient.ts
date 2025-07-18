/* ++++++++++ CLIENT-SIDE PERFORMANCE ANALYTICS SERVICE ++++++++++ */

// Performance analytics interfaces (shared with server)
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
  roi: number;
  averageBetSize: number;
  averageOdds: number;
  profitFactor: number;
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
  valueAtRisk: number;
  expectedShortfall: number;
  maxDrawdownPercent: number;
  calmarRatio: number;
  sortinoRatio: number;
}

// Client-side Performance Analytics Service (Mock/API-based)
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
   * Get comprehensive performance metrics for a user (Mock data for browser)
   */
  async getUserPerformanceMetrics(
    userId: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    // In a real implementation, this would make an API call to the server
    // For now, return mock data
    return {
      overall: {
        userId,
        totalBets: 150,
        winningBets: 85,
        losingBets: 60,
        pushBets: 5,
        winRate: 0.567,
        totalWagered: 15000,
        totalWon: 8500,
        totalLost: 6000,
        netProfit: 2500,
        roi: 16.67,
        averageBetSize: 100,
        averageOdds: -110,
        profitFactor: 1.42,
        sharpeRatio: 1.25,
        maxDrawdown: 500,
        currentStreak: 3,
        longestWinStreak: 8,
        longestLoseStreak: 4,
        timeframe: 'All Time'
      },
      byPlatform: [
        {
          platform: 'PrizePicks',
          bets: 75,
          winRate: 0.60,
          roi: 18.5,
          netProfit: 1500,
          averageBetSize: 100
        },
        {
          platform: 'Underdog',
          bets: 75,
          winRate: 0.533,
          roi: 14.8,
          netProfit: 1000,
          averageBetSize: 100
        }
      ],
      bySport: [
        {
          sport: 'NBA',
          bets: 80,
          winRate: 0.575,
          roi: 19.2,
          netProfit: 1600,
          averageBetSize: 100
        },
        {
          sport: 'NFL',
          bets: 70,
          winRate: 0.557,
          roi: 14.1,
          netProfit: 900,
          averageBetSize: 100
        }
      ],
      byPropType: [
        {
          propType: 'Points',
          bets: 60,
          winRate: 0.583,
          roi: 21.5,
          netProfit: 1300,
          averageBetSize: 100
        },
        {
          propType: 'Rebounds',
          bets: 45,
          winRate: 0.556,
          roi: 15.8,
          netProfit: 700,
          averageBetSize: 100
        },
        {
          propType: 'Assists',
          bets: 45,
          winRate: 0.533,
          roi: 11.2,
          netProfit: 500,
          averageBetSize: 100
        }
      ],
      monthly: [
        {
          month: 'January',
          year: 2024,
          bets: 50,
          winRate: 0.56,
          roi: 15.5,
          netProfit: 775,
          totalWagered: 5000
        },
        {
          month: 'February',
          year: 2024,
          bets: 45,
          winRate: 0.578,
          roi: 18.2,
          netProfit: 819,
          totalWagered: 4500
        },
        {
          month: 'March',
          year: 2024,
          bets: 55,
          winRate: 0.564,
          roi: 16.8,
          netProfit: 924,
          totalWagered: 5500
        }
      ],
      recentTrend: {
        last7Days: {
          userId,
          totalBets: 12,
          winningBets: 8,
          losingBets: 4,
          pushBets: 0,
          winRate: 0.667,
          totalWagered: 1200,
          totalWon: 800,
          totalLost: 400,
          netProfit: 400,
          roi: 33.33,
          averageBetSize: 100,
          averageOdds: -110,
          profitFactor: 2.0,
          sharpeRatio: 1.8,
          maxDrawdown: 100,
          currentStreak: 3,
          longestWinStreak: 5,
          longestLoseStreak: 2,
          timeframe: 'Last 7 Days'
        },
        last30Days: {
          userId,
          totalBets: 45,
          winningBets: 26,
          losingBets: 18,
          pushBets: 1,
          winRate: 0.578,
          totalWagered: 4500,
          totalWon: 2600,
          totalLost: 1800,
          netProfit: 800,
          roi: 17.78,
          averageBetSize: 100,
          averageOdds: -110,
          profitFactor: 1.44,
          sharpeRatio: 1.4,
          maxDrawdown: 200,
          currentStreak: 3,
          longestWinStreak: 6,
          longestLoseStreak: 3,
          timeframe: 'Last 30 Days'
        },
        last90Days: {
          userId,
          totalBets: 120,
          winningBets: 68,
          losingBets: 48,
          pushBets: 4,
          winRate: 0.567,
          totalWagered: 12000,
          totalWon: 6800,
          totalLost: 4800,
          netProfit: 2000,
          roi: 16.67,
          averageBetSize: 100,
          averageOdds: -110,
          profitFactor: 1.42,
          sharpeRatio: 1.3,
          maxDrawdown: 400,
          currentStreak: 3,
          longestWinStreak: 8,
          longestLoseStreak: 4,
          timeframe: 'Last 90 Days'
        }
      }
    };
  }

  /**
   * Get betting insights and recommendations (Mock data for browser)
   */
  async getBettingInsights(userId: string): Promise<BettingInsights> {
    return {
      bestPerformingPlatform: 'PrizePicks',
      bestPerformingSport: 'NBA',
      bestPerformingPropType: 'Points',
      optimalBetSize: 100,
      recommendations: [
        'Focus more on NBA player props for better ROI',
        'Consider increasing bet size on PrizePicks platform',
        'Points props show strongest performance - prioritize these'
      ],
      warnings: [
        'Recent losing streak in NFL props - review strategy',
        'Bet size variance is high - consider more consistent sizing'
      ],
      confidenceLevel: 'HIGH'
    };
  }

  /**
   * Get risk metrics (Mock data for browser)
   */
  async getRiskMetrics(userId: string): Promise<RiskMetrics> {
    return {
      volatility: 0.25,
      valueAtRisk: 150,
      expectedShortfall: 200,
      maxDrawdownPercent: 8.5,
      calmarRatio: 1.96,
      sortinoRatio: 1.45
    };
  }

  /**
   * Export performance data (Mock implementation)
   */
  async exportPerformanceData(
    userId: string,
    format: 'CSV' | 'JSON' | 'PDF' = 'CSV'
  ): Promise<string> {
    // In a real implementation, this would generate and return the export data
    return `Mock export data for user ${userId} in ${format} format`;
  }

  /**
   * Get performance comparison with other users (Mock data)
   */
  async getPerformanceComparison(userId: string): Promise<{
    userRank: number;
    totalUsers: number;
    percentile: number;
    averageROI: number;
    userROI: number;
  }> {
    return {
      userRank: 125,
      totalUsers: 1000,
      percentile: 87.5,
      averageROI: 8.5,
      userROI: 16.67
    };
  }
}

export default PerformanceAnalyticsService;