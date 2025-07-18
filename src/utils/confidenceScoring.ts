/* ++++++++++ STATISTICAL CONFIDENCE SCORING SYSTEM ++++++++++ */

// Confidence scoring interfaces
export interface ConfidenceInput {
  sampleSize: number; // Number of historical data points
  hitRate: number; // Observed hit rate (0-1)
  timeRange: number; // Days of historical data
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW'; // Quality of data sources
  consistency: number; // Consistency score (0-1)
  recency: number; // Recency weight (0-1)
}

export interface ConfidenceResult {
  overallConfidence: number; // Overall confidence score (0-1)
  sampleSizeConfidence: number; // Confidence based on sample size
  timeRangeConfidence: number; // Confidence based on time range
  dataQualityConfidence: number; // Confidence based on data quality
  consistencyConfidence: number; // Confidence based on consistency
  recencyConfidence: number; // Confidence based on recency
  confidenceLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  marginOfError: number; // Statistical margin of error
  recommendation: string; // Human-readable recommendation
  warnings: string[]; // Any warnings about the data
}

export interface StatisticalMetrics {
  standardError: number;
  confidenceInterval95: { lower: number; upper: number };
  confidenceInterval99: { lower: number; upper: number };
  zScore: number;
  pValue: number;
  isStatisticallySignificant: boolean;
}

// Confidence Scoring Calculator
export class ConfidenceScoring {
  /**
   * Calculate comprehensive confidence score
   */
  static calculate(input: ConfidenceInput): ConfidenceResult {
    const {
      sampleSize,
      hitRate,
      timeRange,
      dataQuality,
      consistency,
      recency
    } = input;

    // Validate inputs
    this.validateInputs(input);

    // Calculate individual confidence components
    const sampleSizeConfidence = this.calculateSampleSizeConfidence(sampleSize);
    const timeRangeConfidence = this.calculateTimeRangeConfidence(timeRange);
    const dataQualityConfidence = this.calculateDataQualityConfidence(dataQuality);
    const consistencyConfidence = consistency;
    const recencyConfidence = recency;

    // Calculate weighted overall confidence
    const weights = {
      sampleSize: 0.3,
      timeRange: 0.2,
      dataQuality: 0.2,
      consistency: 0.2,
      recency: 0.1
    };

    const overallConfidence = (
      sampleSizeConfidence * weights.sampleSize +
      timeRangeConfidence * weights.timeRange +
      dataQualityConfidence * weights.dataQuality +
      consistencyConfidence * weights.consistency +
      recencyConfidence * weights.recency
    );

    // Determine confidence level
    const confidenceLevel = this.determineConfidenceLevel(overallConfidence);

    // Calculate margin of error
    const marginOfError = this.calculateMarginOfError(hitRate, sampleSize);

    // Generate recommendation
    const recommendation = this.generateRecommendation(overallConfidence, sampleSize, marginOfError);

    // Generate warnings
    const warnings = this.generateWarnings(input);

    return {
      overallConfidence: Math.round(overallConfidence * 1000) / 1000,
      sampleSizeConfidence: Math.round(sampleSizeConfidence * 1000) / 1000,
      timeRangeConfidence: Math.round(timeRangeConfidence * 1000) / 1000,
      dataQualityConfidence: Math.round(dataQualityConfidence * 1000) / 1000,
      consistencyConfidence: Math.round(consistencyConfidence * 1000) / 1000,
      recencyConfidence: Math.round(recencyConfidence * 1000) / 1000,
      confidenceLevel,
      marginOfError: Math.round(marginOfError * 1000) / 1000,
      recommendation,
      warnings
    };
  }

  /**
   * Calculate statistical metrics for the hit rate
   */
  static calculateStatisticalMetrics(hitRate: number, sampleSize: number): StatisticalMetrics {
    if (sampleSize <= 0) {
      throw new Error('Sample size must be positive');
    }

    // Standard error for proportion
    const standardError = Math.sqrt((hitRate * (1 - hitRate)) / sampleSize);

    // Z-score for 95% and 99% confidence intervals
    const z95 = 1.96;
    const z99 = 2.576;

    // Confidence intervals
    const margin95 = z95 * standardError;
    const margin99 = z99 * standardError;

    const confidenceInterval95 = {
      lower: Math.max(0, hitRate - margin95),
      upper: Math.min(1, hitRate + margin95)
    };

    const confidenceInterval99 = {
      lower: Math.max(0, hitRate - margin99),
      upper: Math.min(1, hitRate + margin99)
    };

    // Z-score for testing if hit rate is significantly different from 0.5
    const nullHypothesis = 0.5;
    const zScore = (hitRate - nullHypothesis) / standardError;

    // P-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // Statistical significance (p < 0.05)
    const isStatisticallySignificant = pValue < 0.05;

    return {
      standardError: Math.round(standardError * 10000) / 10000,
      confidenceInterval95,
      confidenceInterval99,
      zScore: Math.round(zScore * 1000) / 1000,
      pValue: Math.round(pValue * 10000) / 10000,
      isStatisticallySignificant
    };
  }

  /**
   * Calculate minimum sample size needed for desired confidence
   */
  static calculateMinimumSampleSize(
    desiredMarginOfError: number,
    confidenceLevel: number = 0.95,
    estimatedHitRate: number = 0.5
  ): number {
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;
    const p = estimatedHitRate;
    const q = 1 - p;
    
    const sampleSize = Math.ceil((zScore * zScore * p * q) / (desiredMarginOfError * desiredMarginOfError));
    return sampleSize;
  }

  /**
   * Calculate confidence based on sample size
   */
  private static calculateSampleSizeConfidence(sampleSize: number): number {
    if (sampleSize >= 1000) return 1.0;
    if (sampleSize >= 500) return 0.9;
    if (sampleSize >= 200) return 0.8;
    if (sampleSize >= 100) return 0.7;
    if (sampleSize >= 50) return 0.6;
    if (sampleSize >= 30) return 0.5;
    if (sampleSize >= 20) return 0.4;
    if (sampleSize >= 10) return 0.3;
    if (sampleSize >= 5) return 0.2;
    return 0.1;
  }

  /**
   * Calculate confidence based on time range
   */
  private static calculateTimeRangeConfidence(timeRange: number): number {
    if (timeRange >= 365) return 1.0; // 1+ years
    if (timeRange >= 180) return 0.9; // 6+ months
    if (timeRange >= 90) return 0.8; // 3+ months
    if (timeRange >= 60) return 0.7; // 2+ months
    if (timeRange >= 30) return 0.6; // 1+ month
    if (timeRange >= 14) return 0.5; // 2+ weeks
    if (timeRange >= 7) return 0.4; // 1+ week
    return 0.3; // Less than a week
  }

  /**
   * Calculate confidence based on data quality
   */
  private static calculateDataQualityConfidence(dataQuality: 'HIGH' | 'MEDIUM' | 'LOW'): number {
    switch (dataQuality) {
      case 'HIGH': return 1.0;
      case 'MEDIUM': return 0.7;
      case 'LOW': return 0.4;
      default: return 0.5;
    }
  }

  /**
   * Determine overall confidence level
   */
  private static determineConfidenceLevel(confidence: number): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' {
    if (confidence >= 0.9) return 'VERY_HIGH';
    if (confidence >= 0.75) return 'HIGH';
    if (confidence >= 0.6) return 'MEDIUM';
    if (confidence >= 0.4) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * Calculate margin of error for hit rate
   */
  private static calculateMarginOfError(hitRate: number, sampleSize: number): number {
    if (sampleSize <= 0) return 1.0;
    
    const standardError = Math.sqrt((hitRate * (1 - hitRate)) / sampleSize);
    return 1.96 * standardError; // 95% confidence interval
  }

  /**
   * Generate human-readable recommendation
   */
  private static generateRecommendation(
    confidence: number,
    sampleSize: number,
    marginOfError: number
  ): string {
    const confidencePercent = Math.round(confidence * 100);
    const marginPercent = Math.round(marginOfError * 100);

    if (confidence >= 0.9) {
      return `Very high confidence (${confidencePercent}%) with ${sampleSize} samples. Margin of error: ±${marginPercent}%. Reliable for betting decisions.`;
    } else if (confidence >= 0.75) {
      return `High confidence (${confidencePercent}%) with ${sampleSize} samples. Margin of error: ±${marginPercent}%. Good for betting decisions.`;
    } else if (confidence >= 0.6) {
      return `Medium confidence (${confidencePercent}%) with ${sampleSize} samples. Margin of error: ±${marginPercent}%. Use with caution.`;
    } else if (confidence >= 0.4) {
      return `Low confidence (${confidencePercent}%) with ${sampleSize} samples. Margin of error: ±${marginPercent}%. Consider gathering more data.`;
    } else {
      return `Very low confidence (${confidencePercent}%) with ${sampleSize} samples. Margin of error: ±${marginPercent}%. Not recommended for betting decisions.`;
    }
  }

  /**
   * Generate warnings about data quality
   */
  private static generateWarnings(input: ConfidenceInput): string[] {
    const warnings: string[] = [];
    const { sampleSize, timeRange, dataQuality, consistency, recency } = input;

    if (sampleSize < 30) {
      warnings.push('Small sample size (< 30). Results may not be reliable.');
    }

    if (timeRange < 30) {
      warnings.push('Short time range (< 30 days). May not capture seasonal variations.');
    }

    if (dataQuality === 'LOW') {
      warnings.push('Low data quality. Results should be interpreted with caution.');
    }

    if (consistency < 0.5) {
      warnings.push('Low consistency in historical performance. High variance detected.');
    }

    if (recency < 0.5) {
      warnings.push('Data is not recent. Performance may have changed.');
    }

    if (sampleSize < 10) {
      warnings.push('Extremely small sample size. Statistical analysis not reliable.');
    }

    return warnings;
  }

  /**
   * Validate input parameters
   */
  private static validateInputs(input: ConfidenceInput): void {
    const { sampleSize, hitRate, timeRange, consistency, recency } = input;

    if (sampleSize < 0) {
      throw new Error('Sample size must be non-negative');
    }

    if (hitRate < 0 || hitRate > 1) {
      throw new Error('Hit rate must be between 0 and 1');
    }

    if (timeRange < 0) {
      throw new Error('Time range must be non-negative');
    }

    if (consistency < 0 || consistency > 1) {
      throw new Error('Consistency must be between 0 and 1');
    }

    if (recency < 0 || recency > 1) {
      throw new Error('Recency must be between 0 and 1');
    }
  }

  /**
   * Normal cumulative distribution function approximation
   */
  private static normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    if (x > 0) {
      prob = 1 - prob;
    }
    
    return prob;
  }

  /**
   * Calculate consistency score from historical hit rates
   */
  static calculateConsistency(historicalHitRates: number[]): number {
    if (historicalHitRates.length < 2) return 0;

    const mean = historicalHitRates.reduce((sum, rate) => sum + rate, 0) / historicalHitRates.length;
    const variance = historicalHitRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / historicalHitRates.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert standard deviation to consistency score (lower std dev = higher consistency)
    // Normalize by dividing by maximum possible std dev (0.5 for binary outcomes)
    const normalizedStdDev = standardDeviation / 0.5;
    const consistency = Math.max(0, 1 - normalizedStdDev);

    return Math.min(1, consistency);
  }

  /**
   * Calculate recency score based on data age
   */
  static calculateRecency(dataAgeInDays: number): number {
    if (dataAgeInDays <= 0) return 1.0;
    if (dataAgeInDays <= 7) return 1.0; // Last week
    if (dataAgeInDays <= 30) return 0.9; // Last month
    if (dataAgeInDays <= 90) return 0.7; // Last 3 months
    if (dataAgeInDays <= 180) return 0.5; // Last 6 months
    if (dataAgeInDays <= 365) return 0.3; // Last year
    return 0.1; // Older than a year
  }
}

export default ConfidenceScoring;