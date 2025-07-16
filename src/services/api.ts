import axios from 'axios';

const API_BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = import.meta.env.VITE_ODDS_API_KEY;

const SUPPORTED_PLAYER_PROP_SPORTS = ['americanfootball_nfl', 'americanfootball_ncaaf', 'baseball_mlb', 'basketball_nba', 'basketball_wnba', 'icehockey_nhl', 'mma_mixed_martial_arts', 'tennis_atp_french_open', 'tennis_wta_french_open'];

// Export for use in other components
export { SUPPORTED_PLAYER_PROP_SPORTS };

// DFS Platform Configuration
const DFS_PLATFORMS = {
  PRIZEPICKS: 'us_dfs.prizepicks',
  UNDERDOG: 'us_dfs.underdog',
  PICK6: 'us_dfs.pick6'
} as const;

// Platform-specific payout multipliers for EV calculations
const PLATFORM_MULTIPLIERS = {
  [DFS_PLATFORMS.PRIZEPICKS]: {
    '2-leg': 3.0,
    '3-leg': 5.0,
    '4-leg': 10.0,
    '5-leg': 20.0,
    '6-leg': 50.0
  },
  [DFS_PLATFORMS.UNDERDOG]: {
    '2-leg': 3.0,
    '3-leg': 6.0,
    '4-leg': 12.0,
    '5-leg': 25.0
  },
  [DFS_PLATFORMS.PICK6]: {
    '2-leg': 3.0,
    '3-leg': 6.0,
    '4-leg': 12.0,
    '5-leg': 25.0,
    '6-leg': 50.0
  }
} as const;

// EV Calculation Constants
const EV_THRESHOLD = 0.565; // 56.5% minimum hit rate for +EV
const DEFAULT_HIT_RATE = 0.50; // Default 50% when no historical data available

// Define all available player prop markets including fantasy-specific ones
const PLAYER_PROP_MARKETS = [
  // Traditional Props
  'player_assists',
  'player_field_goals',
  'player_kicking_points',
  'player_pass_attempts',
  'player_pass_completions',
  'player_pass_interceptions',
  'player_pass_longest_completion',
  'player_pass_rush_reception_tds',
  'player_pass_rush_reception_yds',
  'player_pass_tds',
  'player_pass_yds',
  'player_pats',
  'player_receptions',
  'player_reception_longest',
  'player_reception_yds',
  'player_rush_attempts',
  'player_rush_longest',
  'player_rush_reception_tds',
  'player_rush_reception_yds',
  'player_rush_yds',
  'player_sacks',
  'player_solo_tackles',
  'player_tackles_assists',
  'player_tds_over',
  'player_1st_td',
  'player_anytime_td',
  'player_last_td',
  // Fantasy-specific Props
  'player_fantasy_points',
  'player_rebounds',
  'player_steals',
  'player_blocks',
  'player_turnovers',
  'player_threes',
  'player_double_double',
  'player_triple_double',
  // Baseball Props
  'player_hits',
  'player_runs',
  'player_rbis',
  'player_strikeouts',
  'player_home_runs',
  // Hockey Props
  'player_saves',
  'player_goals',
  'player_shots_on_goal'
] as const;

// Fantasy platform alternate markets (demons/goblins)
const ALTERNATE_MARKETS = [
  'player_fantasy_points_demon',
  'player_fantasy_points_goblin',
  'player_points_demon',
  'player_points_goblin',
  'player_rebounds_demon',
  'player_rebounds_goblin',
  'player_assists_demon',
  'player_assists_goblin'
] as const;

// Define the type using the values
type PlayerPropMarket = (typeof PLAYER_PROP_MARKETS)[number];

// Create a non-readonly array of the markets for the default parameter
const defaultMarkets: PlayerPropMarket[] = [...PLAYER_PROP_MARKETS];

export const fetchSports = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sports`, {
      params: { 
        apiKey: API_KEY
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sports:', error);
    throw error;
  }
};

export const fetchBookmakers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/bookmakers`, {
      params: { 
        apiKey: API_KEY
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching bookmakers:', error);
    throw error;
  }
};

export const fetchOdds = async (sport: string, market: string = 'h2h') => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchOdds not supported for: ${sport}`);
    return [];
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us,us2',
        markets: market,
        oddsFormat: 'american'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching odds:', error);
    throw error;
  }
};

export const fetchMatchDetails = async (sport: string, matchId: string) => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchMatchDetails not supported for: ${sport}`);
    return [];
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us,us2',
        markets: ['h2h', 'spreads', 'totals', 'player_pass_tds', 'player_pass_yds', 'player_rush_yds', 'player_receptions'],
        oddsFormat: 'american'
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching match details:', error);
    throw error;
  }
};

export const fetchBothMatchDetails = async (sport: string, matchId: string) => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchBothMatchDetails not supported for: ${sport}`);
    return [];
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us,us2',
        markets: 'h2h,spreads',
        oddsFormat: 'american'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching match details:', error);
    throw error;
  }
};

export const fetchPlayerProps = async (
  sport: string,
  matchId: string,
  markets: PlayerPropMarket[] = defaultMarkets,
  region: string = 'us,us2',
) => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchPlayerProps not supported for: ${sport}`);
    return [];
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: region,
        markets: markets.join(','),
        oddsFormat: 'american'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching player props:', error);
    throw error;
  }
};

// Fetch DFS platform props specifically
export const fetchDFSProps = async (
  sport: string,
  matchId?: string,
  platforms: string[] = Object.values(DFS_PLATFORMS),
  includeAlternates: boolean = true
) => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchDFSProps not supported for: ${sport}`);
    return [];
  }
  
  try {
    const markets = includeAlternates 
      ? [...PLAYER_PROP_MARKETS, ...ALTERNATE_MARKETS]
      : PLAYER_PROP_MARKETS;
    
    const endpoint = matchId 
      ? `${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`
      : `${API_BASE_URL}/sports/${sport}/odds`;
    
    const response = await axios.get(endpoint, {
      params: {
        apiKey: API_KEY,
        regions: 'us_dfs',
        bookmakers: platforms.join(','),
        markets: markets.join(','),
        oddsFormat: 'american'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching DFS props:', error);
    throw error;
  }
};

// EV Calculation Utilities
export const calculateImpliedProbability = (odds: number): number => {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
};

export const calculatePlatformImpliedProbability = (
  platform: string,
  legCount: number
): number => {
  const multiplier = PLATFORM_MULTIPLIERS[platform as keyof typeof PLATFORM_MULTIPLIERS];
  if (!multiplier) return 0.5; // Default 50% if platform not found
  
  const legKey = `${legCount}-leg` as keyof typeof multiplier;
  const payout = multiplier[legKey] || 3.0; // Default to 3x if leg count not found
  
  // Calculate implied probability per leg: 1 / (payout ^ (1/legCount))
  return 1 / Math.pow(payout, 1 / legCount);
};

export const calculateEV = (
  hitRate: number,
  impliedProbability: number
): number => {
  return hitRate - impliedProbability;
};

export const isPositiveEV = (
  hitRate: number,
  impliedProbability: number,
  threshold: number = EV_THRESHOLD
): boolean => {
  return hitRate >= threshold && calculateEV(hitRate, impliedProbability) > 0;
};

// Historical data simulation (replace with actual database calls)
export const getHistoricalHitRate = async (
  playerName: string,
  propType: string,
  line: number,
  gameCount: number = 20
): Promise<number> => {
  // TODO: Replace with actual database query
  // For now, return simulated data based on prop type and line
  const baseRate = DEFAULT_HIT_RATE;
  const variance = Math.random() * 0.3 - 0.15; // ±15% variance
  return Math.max(0.1, Math.min(0.9, baseRate + variance));
};

// Export constants for use in components
export { DFS_PLATFORMS, PLATFORM_MULTIPLIERS, EV_THRESHOLD, ALTERNATE_MARKETS };