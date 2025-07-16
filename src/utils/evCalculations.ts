/* ++++++++++ EV CALCULATION UTILITIES ++++++++++ */
import { 
  calculateImpliedProbability, 
  calculatePlatformImpliedProbability,
  calculateEV,
  isPositiveEV,
  getHistoricalHitRate,
  DFS_PLATFORMS,
  PLATFORM_MULTIPLIERS
} from '../services/api';

/* ++++++++++ TYPES ++++++++++ */
export interface PropEVData {
  id: string;
  playerName: string;
  propType: string;
  line: number;
  platform: string;
  odds: number;
  hitRate: number;
  impliedProbability: number;
  evPercentage: number;
  isPositiveEV: boolean;
  recommendedBet?: number;
  confidence?: 'high' | 'medium' | 'low';
  gameCount?: number;
  sport?: string;
}

export interface FantasyPlatformConfig {
  name: string;
  key: string;
  multipliers: Record<string, number>;
  supportsAlternates: boolean;
}

export interface EVFilterOptions {
  minEV: number;
  minHitRate: number;
  platforms: string[];
  sports: string[];
  propTypes: string[];
  showOnlyPositiveEV: boolean;
}

/* ++++++++++ CONSTANTS ++++++++++ */
export const FANTASY_PLATFORMS: FantasyPlatformConfig[] = [
  {
    name: 'PrizePicks',
    key: DFS_PLATFORMS.PRIZEPICKS,
    multipliers: PLATFORM_MULTIPLIERS[DFS_PLATFORMS.PRIZEPICKS],
    supportsAlternates: true
  },
  {
    name: 'Underdog Fantasy',
    key: DFS_PLATFORMS.UNDERDOG,
    multipliers: PLATFORM_MULTIPLIERS[DFS_PLATFORMS.UNDERDOG],
    supportsAlternates: true
  },
  {
    name: 'DraftKings Pick6',
    key: DFS_PLATFORMS.PICK6,
    multipliers: PLATFORM_MULTIPLIERS[DFS_PLATFORMS.PICK6],
    supportsAlternates: false
  }
];

export const PROP_TYPE_CATEGORIES = {
  NBA: {
    scoring: ['player_points', 'player_fantasy_points'],
    rebounds: ['player_rebounds'],
    assists: ['player_assists'],
    defensive: ['player_steals', 'player_blocks'],
    shooting: ['player_threes', 'player_field_goals'],
    combined: ['player_double_double', 'player_triple_double']
  },
  NFL: {
    passing: ['player_pass_yds', 'player_pass_tds', 'player_pass_completions'],
    rushing: ['player_rush_yds', 'player_rush_attempts'],
    receiving: ['player_receptions', 'player_reception_yds'],
    scoring: ['player_anytime_td', 'player_1st_td']
  },
  MLB: {
    hitting: ['player_hits', 'player_runs', 'player_rbis', 'player_home_runs'],
    pitching: ['player_strikeouts']
  },
  NHL: {
    scoring: ['player_goals', 'player_assists'],
    goaltending: ['player_saves']
  },
  WNBA: {
    scoring: ['player_points', 'player_fantasy_points'],
    rebounds: ['player_rebounds'],
    assists: ['player_assists']
  }
} as const;

/* ++++++++++ EV CALCULATION FUNCTIONS ++++++++++ */
export const calculatePropEV = async (
  playerName: string,
  propType: string,
  line: number,
  odds: number,
  platform: string,
  legCount: number = 3
): Promise<PropEVData> => {
  // Get historical hit rate
  const hitRate = await getHistoricalHitRate(playerName, propType, line);
  
  // Calculate implied probability based on platform
  let impliedProbability: number;
  
  if (Object.values(DFS_PLATFORMS).includes(platform as any)) {
    // Fantasy platform - use platform-specific multipliers
    impliedProbability = calculatePlatformImpliedProbability(platform, legCount);
  } else {
    // Traditional sportsbook - use odds
    impliedProbability = calculateImpliedProbability(odds);
  }
  
  // Calculate EV
  const evPercentage = calculateEV(hitRate, impliedProbability) * 100;
  const isPositive = isPositiveEV(hitRate, impliedProbability);
  
  // Determine confidence level
  const confidence = getConfidenceLevel(hitRate, Math.abs(evPercentage));
  
  return {
    id: `${playerName}-${propType}-${line}-${platform}`,
    playerName,
    propType,
    line,
    platform,
    odds,
    hitRate,
    impliedProbability,
    evPercentage,
    isPositiveEV: isPositive,
    confidence
  };
};

// Synchronous version for prop objects that already have hit rates
export const calculatePropEVFromData = (
  prop: PropEVData,
  legCount: number = 3
): { evPercentage: number; isPositiveEV: boolean; confidence: 'high' | 'medium' | 'low' } => {
  // Calculate implied probability based on platform
  let impliedProbability: number;
  
  if (Object.values(DFS_PLATFORMS).includes(prop.platform as any)) {
    // Fantasy platform - use platform-specific multipliers
    impliedProbability = calculatePlatformImpliedProbability(prop.platform, legCount);
  } else {
    // Traditional sportsbook - use odds
    impliedProbability = calculateImpliedProbability(prop.odds);
  }
  
  // Calculate EV
  const evPercentage = calculateEV(prop.hitRate, impliedProbability) * 100;
  const isPositive = isPositiveEV(prop.hitRate, impliedProbability);
  
  // Determine confidence level
  const confidence = getConfidenceLevel(prop.hitRate, Math.abs(evPercentage));
  
  return {
    evPercentage,
    isPositiveEV: isPositive,
    confidence
  };
};

export const getConfidenceLevel = (
  hitRate: number, 
  evMagnitude: number
): 'high' | 'medium' | 'low' => {
  if (hitRate >= 0.65 && evMagnitude >= 10) return 'high';
  if (hitRate >= 0.58 && evMagnitude >= 5) return 'medium';
  return 'low';
};

export const filterPropsByEV = (
  props: PropEVData[],
  filters: Partial<EVFilterOptions>
): PropEVData[] => {
  return props.filter(prop => {
    if (filters.minEV && prop.evPercentage < filters.minEV) return false;
    if (filters.minHitRate && prop.hitRate < filters.minHitRate) return false;
    if (filters.showOnlyPositiveEV && !prop.isPositiveEV) return false;
    if (filters.platforms && !filters.platforms.includes(prop.platform)) return false;
    if (filters.propTypes && !filters.propTypes.includes(prop.propType)) return false;
    return true;
  });
};

export const sortPropsByEV = (
  props: PropEVData[],
  sortBy: 'ev' | 'hitRate' | 'confidence' = 'ev',
  ascending: boolean = false
): PropEVData[] => {
  return [...props].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'ev':
        comparison = a.evPercentage - b.evPercentage;
        break;
      case 'hitRate':
        comparison = a.hitRate - b.hitRate;
        break;
      case 'confidence':
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        comparison = (confidenceOrder[a.confidence || 'low']) - (confidenceOrder[b.confidence || 'low']);
        break;
    }
    
    return ascending ? comparison : -comparison;
  });
};

/* ++++++++++ BANKROLL MANAGEMENT ++++++++++ */
export const calculateKellyBet = (
  bankroll: number,
  hitRate: number,
  odds: number,
  maxBetPercentage: number = 0.05 // Max 5% of bankroll
): number => {
  const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
  const q = 1 - hitRate;
  const b = decimalOdds - 1;
  
  // Kelly formula: f* = (bp - q) / b
  const kellyFraction = (b * hitRate - q) / b;
  
  // Apply conservative cap
  const cappedFraction = Math.max(0, Math.min(kellyFraction, maxBetPercentage));
  
  return bankroll * cappedFraction;
};

/* ++++++++++ EXPORT UTILITIES ++++++++++ */
export const formatEVPercentage = (ev: number): string => {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(1)}%`;
};

export const formatHitRate = (hitRate: number): string => {
  return `${(hitRate * 100).toFixed(1)}%`;
};

export const formatImpliedProbability = (prob: number): string => {
  return `${(prob * 100).toFixed(1)}%`;
};

export const getEVColor = (ev: number): string => {
  if (ev >= 10) return '#22c55e'; // Green for high EV
  if (ev >= 5) return '#84cc16'; // Light green for medium EV
  if (ev >= 0) return '#eab308'; // Yellow for low positive EV
  return '#ef4444'; // Red for negative EV
};

export const getConfidenceColor = (confidence: 'high' | 'medium' | 'low'): string => {
  switch (confidence) {
    case 'high': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'low': return '#ef4444';
    default: return '#6b7280';
  }
};