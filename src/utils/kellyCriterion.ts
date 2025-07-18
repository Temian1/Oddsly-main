/* ++++++++++ KELLY CRITERION BET SIZING CALCULATIONS ++++++++++ */

// Kelly Criterion interfaces
export interface KellyCalculationInput {
  hitRate: number; // Probability of winning (0-1)
  odds: number; // Decimal odds (e.g., 2.0 for +100)
  bankroll: number; // Total bankroll amount
  confidence: number; // Confidence level (0-1)
  maxBetPercentage?: number; // Maximum bet percentage (default 5%)
  minBetAmount?: number; // Minimum bet amount (default $1)
}

export interface KellyCalculationResult {
  kellyPercentage: number; // Raw Kelly percentage
  adjustedPercentage: number; // Adjusted for confidence and limits
  recommendedBet: number; // Actual bet amount
  expectedValue: number; // Expected value of the bet
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendation: 'STRONG_BET' | 'MODERATE_BET' | 'SMALL_BET' | 'AVOID';
  reasoning: string;
}

export interface BetSizingStrategy {
  conservative: number; // 25% of Kelly
  moderate: number; // 50% of Kelly
  aggressive: number; // 75% of Kelly
  fullKelly: number; // 100% of Kelly
}

// Kelly Criterion Calculator
export class KellyCriterion {
  /**
   * Calculate the Kelly Criterion percentage
   * Formula: f* = (bp - q) / b
   * Where:
   * f* = fraction of bankroll to bet
   * b = odds received on the wager (decimal odds - 1)
   * p = probability of winning
   * q = probability of losing (1 - p)
   */
  static calculateKellyPercentage(hitRate: number, decimalOdds: number): number {
    if (hitRate <= 0 || hitRate >= 1) {
      throw new Error('Hit rate must be between 0 and 1');
    }
    
    if (decimalOdds <= 1) {
      throw new Error('Decimal odds must be greater than 1');
    }

    const b = decimalOdds - 1; // Net odds
    const p = hitRate; // Probability of winning
    const q = 1 - hitRate; // Probability of losing

    const kellyPercentage = (b * p - q) / b;
    
    // Kelly can be negative (indicating no bet should be made)
    return Math.max(0, kellyPercentage);
  }

  /**
   * Calculate comprehensive Kelly Criterion result with risk management
   */
  static calculate(input: KellyCalculationInput): KellyCalculationResult {
    const {
      hitRate,
      odds,
      bankroll,
      confidence,
      maxBetPercentage = 0.05, // Default 5% max
      minBetAmount = 1
    } = input;

    // Validate inputs
    if (hitRate <= 0 || hitRate >= 1) {
      throw new Error('Hit rate must be between 0 and 1');
    }
    
    if (odds <= 1) {
      throw new Error('Odds must be greater than 1');
    }
    
    if (bankroll <= 0) {
      throw new Error('Bankroll must be positive');
    }
    
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    // Calculate raw Kelly percentage
    const kellyPercentage = this.calculateKellyPercentage(hitRate, odds);
    
    // Calculate expected value
    const expectedValue = (hitRate * (odds - 1)) - (1 - hitRate);
    
    // If EV is negative, don't bet
    if (expectedValue <= 0) {
      return {
        kellyPercentage: 0,
        adjustedPercentage: 0,
        recommendedBet: 0,
        expectedValue,
        riskLevel: 'LOW',
        recommendation: 'AVOID',
        reasoning: 'Negative expected value - avoid this bet'
      };
    }

    // Adjust Kelly percentage based on confidence
    let adjustedPercentage = kellyPercentage * confidence;
    
    // Apply maximum bet percentage limit
    adjustedPercentage = Math.min(adjustedPercentage, maxBetPercentage);
    
    // Calculate recommended bet amount
    let recommendedBet = bankroll * adjustedPercentage;
    
    // Apply minimum bet amount
    if (recommendedBet > 0 && recommendedBet < minBetAmount) {
      recommendedBet = minBetAmount;
      adjustedPercentage = minBetAmount / bankroll;
    }
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(adjustedPercentage);
    
    // Determine recommendation
    const recommendation = this.determineRecommendation(expectedValue, adjustedPercentage, confidence);
    
    // Generate reasoning
    const reasoning = this.generateReasoning({
      kellyPercentage,
      adjustedPercentage,
      expectedValue,
      confidence,
      riskLevel,
      recommendation
    });

    return {
      kellyPercentage,
      adjustedPercentage,
      recommendedBet: Math.round(recommendedBet * 100) / 100, // Round to cents
      expectedValue,
      riskLevel,
      recommendation,
      reasoning
    };
  }

  /**
   * Calculate multiple bet sizing strategies
   */
  static calculateBetSizingStrategies(input: KellyCalculationInput): BetSizingStrategy {
    const kellyPercentage = this.calculateKellyPercentage(input.hitRate, input.odds);
    const { bankroll, maxBetPercentage = 0.05 } = input;

    const conservative = Math.min(kellyPercentage * 0.25, maxBetPercentage) * bankroll;
    const moderate = Math.min(kellyPercentage * 0.5, maxBetPercentage) * bankroll;
    const aggressive = Math.min(kellyPercentage * 0.75, maxBetPercentage) * bankroll;
    const fullKelly = Math.min(kellyPercentage, maxBetPercentage) * bankroll;

    return {
      conservative: Math.round(conservative * 100) / 100,
      moderate: Math.round(moderate * 100) / 100,
      aggressive: Math.round(aggressive * 100) / 100,
      fullKelly: Math.round(fullKelly * 100) / 100
    };
  }

  /**
   * Determine risk level based on bet percentage
   */
  private static determineRiskLevel(betPercentage: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (betPercentage <= 0.01) return 'LOW'; // <= 1%
    if (betPercentage <= 0.025) return 'MEDIUM'; // <= 2.5%
    if (betPercentage <= 0.05) return 'HIGH'; // <= 5%
    return 'EXTREME'; // > 5%
  }

  /**
   * Determine recommendation based on EV, bet size, and confidence
   */
  private static determineRecommendation(
    expectedValue: number,
    betPercentage: number,
    confidence: number
  ): 'STRONG_BET' | 'MODERATE_BET' | 'SMALL_BET' | 'AVOID' {
    if (expectedValue <= 0) return 'AVOID';
    
    if (expectedValue >= 0.15 && betPercentage >= 0.02 && confidence >= 0.8) {
      return 'STRONG_BET';
    }
    
    if (expectedValue >= 0.08 && betPercentage >= 0.01 && confidence >= 0.6) {
      return 'MODERATE_BET';
    }
    
    if (expectedValue > 0 && confidence >= 0.4) {
      return 'SMALL_BET';
    }
    
    return 'AVOID';
  }

  /**
   * Generate human-readable reasoning for the recommendation
   */
  private static generateReasoning(params: {
    kellyPercentage: number;
    adjustedPercentage: number;
    expectedValue: number;
    confidence: number;
    riskLevel: string;
    recommendation: string;
  }): string {
    const {
      kellyPercentage,
      adjustedPercentage,
      expectedValue,
      confidence,
      riskLevel,
      recommendation
    } = params;

    const evPercent = (expectedValue * 100).toFixed(1);
    const kellyPercent = (kellyPercentage * 100).toFixed(1);
    const adjustedPercent = (adjustedPercentage * 100).toFixed(1);
    const confidencePercent = (confidence * 100).toFixed(0);

    let reasoning = `Expected Value: ${evPercent}%. `;
    reasoning += `Raw Kelly: ${kellyPercent}%, Adjusted: ${adjustedPercent}%. `;
    reasoning += `Confidence: ${confidencePercent}%. `;
    reasoning += `Risk Level: ${riskLevel}. `;

    switch (recommendation) {
      case 'STRONG_BET':
        reasoning += 'Strong positive EV with high confidence - recommended bet.';
        break;
      case 'MODERATE_BET':
        reasoning += 'Good EV with reasonable confidence - moderate bet size.';
        break;
      case 'SMALL_BET':
        reasoning += 'Positive EV but lower confidence - small bet recommended.';
        break;
      case 'AVOID':
        reasoning += 'Insufficient edge or confidence - avoid this bet.';
        break;
    }

    return reasoning;
  }

  /**
   * Calculate optimal bet size for a portfolio of bets
   */
  static calculatePortfolioKelly(bets: KellyCalculationInput[]): {
    totalRecommendedBet: number;
    portfolioRisk: string;
    diversificationBenefit: number;
  } {
    if (bets.length === 0) {
      return {
        totalRecommendedBet: 0,
        portfolioRisk: 'NONE',
        diversificationBenefit: 0
      };
    }

    // Calculate individual Kelly percentages
    const kellyPercentages = bets.map(bet => 
      this.calculateKellyPercentage(bet.hitRate, bet.odds)
    );

    // Sum of individual Kelly percentages
    const sumIndividualKelly = kellyPercentages.reduce((sum, kelly) => sum + kelly, 0);
    
    // For uncorrelated bets, portfolio Kelly is sum of individual Kellys
    // In practice, we apply a correlation adjustment (assume 20% correlation)
    const correlationAdjustment = 0.8; // Reduce by 20% for correlation
    const portfolioKelly = sumIndividualKelly * correlationAdjustment;
    
    // Calculate total recommended bet (using first bet's bankroll as reference)
    const bankroll = bets[0]?.bankroll || 0;
    const totalRecommendedBet = portfolioKelly * bankroll;
    
    // Determine portfolio risk
    let portfolioRisk: string;
    if (portfolioKelly <= 0.05) portfolioRisk = 'LOW';
    else if (portfolioKelly <= 0.1) portfolioRisk = 'MEDIUM';
    else if (portfolioKelly <= 0.15) portfolioRisk = 'HIGH';
    else portfolioRisk = 'EXTREME';
    
    // Calculate diversification benefit
    const diversificationBenefit = (sumIndividualKelly - portfolioKelly) / sumIndividualKelly;

    return {
      totalRecommendedBet: Math.round(totalRecommendedBet * 100) / 100,
      portfolioRisk,
      diversificationBenefit: Math.round(diversificationBenefit * 100) / 100
    };
  }

  /**
   * Convert American odds to decimal odds
   */
  static americanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }

  /**
   * Convert fractional odds to decimal odds
   */
  static fractionalToDecimal(numerator: number, denominator: number): number {
    return (numerator / denominator) + 1;
  }

  /**
   * Calculate implied probability from decimal odds
   */
  static impliedProbability(decimalOdds: number): number {
    return 1 / decimalOdds;
  }

  /**
   * Calculate break-even hit rate needed for profitability
   */
  static breakEvenHitRate(decimalOdds: number): number {
    return this.impliedProbability(decimalOdds);
  }

  /**
   * Calculate edge (difference between true probability and implied probability)
   */
  static calculateEdge(hitRate: number, decimalOdds: number): number {
    const impliedProb = this.impliedProbability(decimalOdds);
    return hitRate - impliedProb;
  }
}

export default KellyCriterion;