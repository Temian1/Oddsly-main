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

// Sport-specific market mappings
const SPORT_MARKETS = {
  'basketball_nba': [
    // Core NBA markets
    'player_points',
    'player_points_q1',
    'player_rebounds',
    'player_rebounds_q1',
    'player_assists',
    'player_assists_q1',
    'player_threes',
    'player_blocks',
    'player_steals',
    'player_blocks_steals',
    'player_turnovers',
    'player_points_rebounds_assists',
    'player_points_rebounds',
    'player_points_assists',
    'player_rebounds_assists',
    'player_field_goals',
    'player_frees_made',
    'player_frees_attempts',
    'player_first_basket',
    'player_first_team_basket',
    'player_double_double',
    'player_triple_double',
    'player_method_of_first_basket'
  ],
  'basketball_wnba': [
    // WNBA markets (same as NBA)
    'player_points',
    'player_points_q1',
    'player_rebounds',
    'player_rebounds_q1',
    'player_assists',
    'player_assists_q1',
    'player_threes',
    'player_blocks',
    'player_steals',
    'player_blocks_steals',
    'player_turnovers',
    'player_points_rebounds_assists',
    'player_points_rebounds',
    'player_points_assists',
    'player_rebounds_assists',
    'player_field_goals',
    'player_frees_made',
    'player_frees_attempts',
    'player_first_basket',
    'player_first_team_basket',
    'player_double_double',
    'player_triple_double',
    'player_method_of_first_basket'
  ],
  'basketball_ncaab': [
    // NCAAB markets (same as NBA)
    'player_points',
    'player_points_q1',
    'player_rebounds',
    'player_rebounds_q1',
    'player_assists',
    'player_assists_q1',
    'player_threes',
    'player_blocks',
    'player_steals',
    'player_blocks_steals',
    'player_turnovers',
    'player_points_rebounds_assists',
    'player_points_rebounds',
    'player_points_assists',
    'player_rebounds_assists',
    'player_field_goals',
    'player_frees_made',
    'player_frees_attempts',
    'player_first_basket',
    'player_first_team_basket',
    'player_double_double',
    'player_triple_double',
    'player_method_of_first_basket'
  ],
  'americanfootball_nfl': [
    // Core NFL markets
    'player_assists',
    'player_defensive_interceptions',
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
    'player_pass_yds_q1',
    'player_pats',
    'player_receptions',
    'player_reception_longest',
    'player_reception_tds',
    'player_reception_yds',
    'player_rush_attempts',
    'player_rush_longest',
    'player_rush_reception_tds',
    'player_rush_reception_yds',
    'player_rush_tds',
    'player_rush_yds',
    'player_sacks',
    'player_solo_tackles',
    'player_tackles_assists',
    'player_tds_over',
    'player_1st_td',
    'player_anytime_td',
    'player_last_td'
  ],
  'americanfootball_ncaaf': [
    // NCAAF markets (same as NFL)
    'player_assists',
    'player_defensive_interceptions',
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
    'player_pass_yds_q1',
    'player_pats',
    'player_receptions',
    'player_reception_longest',
    'player_reception_tds',
    'player_reception_yds',
    'player_rush_attempts',
    'player_rush_longest',
    'player_rush_reception_tds',
    'player_rush_reception_yds',
    'player_rush_tds',
    'player_rush_yds',
    'player_sacks',
    'player_solo_tackles',
    'player_tackles_assists',
    'player_tds_over',
    'player_1st_td',
    'player_anytime_td',
    'player_last_td'
  ],
  'americanfootball_cfl': [
    // CFL markets (same as NFL)
    'player_assists',
    'player_defensive_interceptions',
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
    'player_pass_yds_q1',
    'player_pats',
    'player_receptions',
    'player_reception_longest',
    'player_reception_tds',
    'player_reception_yds',
    'player_rush_attempts',
    'player_rush_longest',
    'player_rush_reception_tds',
    'player_rush_reception_yds',
    'player_rush_tds',
    'player_rush_yds',
    'player_sacks',
    'player_solo_tackles',
    'player_tackles_assists',
    'player_tds_over',
    'player_1st_td',
    'player_anytime_td',
    'player_last_td'
  ],
  'baseball_mlb': [
    // MLB markets
    'batter_home_runs',
    'batter_first_home_run',
    'batter_hits',
    'batter_total_bases',
    'player_hits',
    'player_runs',
    'player_rbis',
    'player_strikeouts',
    'player_home_runs'
  ],
  'icehockey_nhl': [
    'player_goals',
    'player_assists',
    'player_shots_on_goal',
    'player_saves'
  ],
  'soccer_epl': [
    'player_goal_scorer_anytime',
    'player_first_goal_scorer',
    'player_last_goal_scorer',
    'player_to_receive_card',
    'player_to_receive_red_card',
    'player_shots_on_target',
    'player_shots',
    'player_assists'
  ],
  'soccer_france_ligue_one': [
    'player_goal_scorer_anytime',
    'player_first_goal_scorer',
    'player_last_goal_scorer',
    'player_to_receive_card',
    'player_to_receive_red_card',
    'player_shots_on_target',
    'player_shots',
    'player_assists'
  ],
  'soccer_germany_bundesliga': [
    'player_goal_scorer_anytime',
    'player_first_goal_scorer',
    'player_last_goal_scorer',
    'player_to_receive_card',
    'player_to_receive_red_card',
    'player_shots_on_target',
    'player_shots',
    'player_assists'
  ],
  'soccer_italy_serie_a': [
    'player_goal_scorer_anytime',
    'player_first_goal_scorer',
    'player_last_goal_scorer',
    'player_to_receive_card',
    'player_to_receive_red_card',
    'player_shots_on_target',
    'player_shots',
    'player_assists'
  ],
  'soccer_spain_la_liga': [
    'player_goal_scorer_anytime',
    'player_first_goal_scorer',
    'player_last_goal_scorer',
    'player_to_receive_card',
    'player_to_receive_red_card',
    'player_shots_on_target',
    'player_shots',
    'player_assists'
  ],
  'soccer_usa_mls': [
    'player_goal_scorer_anytime',
    'player_first_goal_scorer',
    'player_last_goal_scorer',
    'player_to_receive_card',
    'player_to_receive_red_card',
    'player_shots_on_target',
    'player_shots',
    'player_assists'
  ]
} as const;

// Legacy combined markets for backward compatibility
const PLAYER_PROP_MARKETS = [
  // Basketball
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_steals',
  'player_blocks',
  'player_turnovers',
  'player_double_double',
  'player_triple_double',
  // Football
  'player_pass_tds',
  'player_pass_yds',
  'player_pass_attempts',
  'player_pass_completions',
  'player_pass_interceptions',
  'player_rush_yds',
  'player_rush_attempts',
  'player_receptions',
  'player_reception_yds',
  'player_anytime_td',
  'player_1st_td',
  // Baseball
  'player_hits',
  'player_runs',
  'player_rbis',
  'player_strikeouts',
  'player_home_runs',
  // Hockey
  'player_goals',
  'player_assists',
  'player_shots_on_goal',
  'player_saves',
  // Fantasy
  'player_fantasy_points'
] as const;

// Alternate markets for enhanced coverage
const ALTERNATE_MARKETS = {
  // NBA/WNBA/NCAAB Alternate Markets
  basketball: [
    'player_points_alternate',
    'player_rebounds_alternate',
    'player_assists_alternate',
    'player_blocks_alternate',
    'player_steals_alternate',
    'player_turnovers_alternate',
    'player_threes_alternate',
    'player_points_assists_alternate',
    'player_points_rebounds_alternate',
    'player_rebounds_assists_alternate',
    'player_points_rebounds_assists_alternate'
  ],
  // NFL/NCAAF/CFL Alternate Markets
  football: [
    'player_assists_alternate',
    'player_field_goals_alternate',
    'player_kicking_points_alternate',
    'player_pass_attempts_alternate',
    'player_pass_completions_alternate',
    'player_pass_interceptions_alternate',
    'player_pass_longest_completion_alternate',
    'player_pass_rush_reception_tds_alternate',
    'player_pass_rush_reception_yds_alternate',
    'player_pass_tds_alternate',
    'player_pass_yds_alternate',
    'player_pats_alternate',
    'player_receptions_alternate',
    'player_reception_longest_alternate',
    'player_reception_tds_alternate',
    'player_reception_yds_alternate',
    'player_rush_attempts_alternate',
    'player_rush_longest_alternate',
    'player_rush_reception_tds_alternate',
    'player_rush_reception_yds_alternate',
    'player_rush_tds_alternate',
    'player_rush_yds_alternate',
    'player_sacks_alternate',
    'player_solo_tackles_alternate',
    'player_tackles_assists_alternate'
  ],
  // Fantasy platform specific markets (demons/goblins)
  fantasy: [
    'player_fantasy_points_demon',
    'player_fantasy_points_goblin',
    'player_points_demon',
    'player_points_goblin',
    'player_rebounds_demon',
    'player_rebounds_goblin',
    'player_assists_demon',
    'player_assists_goblin'
  ]
} as const;

// Legacy ALTERNATE_MARKETS for backward compatibility
const LEGACY_ALTERNATE_MARKETS = [
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
// type PlayerPropMarket = (typeof PLAYER_PROP_MARKETS)[number];

// Create a non-readonly array of the markets for the default parameter
// const defaultMarkets: PlayerPropMarket[] = [...PLAYER_PROP_MARKETS];

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
    // Get sport-specific markets for player props
    const sportMarkets = getSportMarkets(sport);
    const markets = ['h2h', 'spreads', 'totals', ...sportMarkets.slice(0, 4)]; // Include first 4 sport-specific markets
    
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: 'us,us2',
        markets: markets,
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
  markets?: string[],
  region: string = 'us,us2',
) => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchPlayerProps not supported for: ${sport}`);
    return [];
  }
  try {
    // Use sport-specific markets if none provided
    const finalMarkets = markets || getSportMarkets(sport);
    
    const response = await axios.get(`${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`, {
      params: {
        apiKey: API_KEY,
        regions: region,
        markets: finalMarkets.join(','),
        oddsFormat: 'american'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching player props:', error);
    throw error;
  }
};

// Get sport-specific markets
export const getSportMarkets = (sport: string): string[] => {
  const sportKey = sport as keyof typeof SPORT_MARKETS;
  const markets = SPORT_MARKETS[sportKey] || SPORT_MARKETS['basketball_nba'];
  return [...markets]; // Convert readonly array to mutable array
};

// Get sport-specific alternate markets
export const getAlternateMarkets = (sport: string): string[] => {
  if (sport.includes('basketball') || sport.includes('nba') || sport.includes('wnba') || sport.includes('ncaab')) {
    return [...ALTERNATE_MARKETS.basketball];
  } else if (sport.includes('football') || sport.includes('nfl') || sport.includes('ncaaf') || sport.includes('cfl')) {
    return [...ALTERNATE_MARKETS.football];
  } else {
    return [...ALTERNATE_MARKETS.fantasy]; // Default to fantasy markets
  }
};

// Fetch DFS platform props specifically
export const fetchDFSProps = async (
  sport: string,
  matchId?: string,
  _platforms: string[] = Object.values(DFS_PLATFORMS),
  includeAlternates: boolean = true
) => {
  if (!SUPPORTED_PLAYER_PROP_SPORTS.includes(sport)) {
    console.warn(`fetchDFSProps not supported for: ${sport}`);
    return [];
  }
  
  // DFS props require a specific match/event ID according to API docs
  if (!matchId) {
    console.warn('fetchDFSProps requires a matchId for player props');
    return [];
  }
  
  try {
    // Use sport-specific markets instead of all markets
    const baseMarkets = getSportMarkets(sport);
    
    // Get sport-specific alternate markets
    const alternateMarkets = includeAlternates ? getAlternateMarkets(sport) : [];
    
    // Limit markets to avoid URL length issues
    const markets = [...baseMarkets.slice(0, 6), ...alternateMarkets.slice(0, 4)];
    
    // Use the events endpoint as required by API for player props
    const endpoint = `${API_BASE_URL}/sports/${sport}/events/${matchId}/odds`;
    
    const response = await axios.get(endpoint, {
      params: {
        apiKey: API_KEY,
        regions: 'us,us2', // Use standard US regions instead of us_dfs
        markets: markets.join(','),
        oddsFormat: 'american'
      }
    });
    
    // Filter response to only include DFS-like bookmakers if needed
    if (response.data && response.data.bookmakers) {
      // For now, return all bookmakers since DFS-specific filtering may not work
      // In the future, you could filter by specific bookmaker keys if available
      return response.data;
    }
    
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

// Real historical data integration with database
export const getHistoricalHitRate = async (
  playerName: string,
  propType: string,
  line: number,
  sportKey: string = 'basketball_nba',
  gameCount: number = 20
): Promise<number> => {
  try {
    // Import DataService dynamically to avoid circular dependencies
    const { DataService } = await import('./dataService');
    
    // Calculate line range for similar props (±0.5)
    const lineRange = {
      min: line - 0.5,
      max: line + 0.5
    };
    
    // Get hit rate calculation from database
    const hitRateData = await DataService.calculateHitRate(
      playerName,
      propType,
      lineRange,
      sportKey,
      90 // Look back 90 days
    );
    
    if (hitRateData && hitRateData.gameCount >= 5) {
      return hitRateData.hitRate;
    }
    
    // Fallback: Get historical props directly if no calculated hit rate
    const historicalProps = await DataService.getHistoricalProps({
      playerName,
      propType,
      sport: sportKey,
      limit: gameCount
    });
    
    if (historicalProps.length >= 5) {
      const hits = historicalProps.filter(prop => prop.hit === true).length;
      return hits / historicalProps.length;
    }
    
    // Return default if insufficient data
    return DEFAULT_HIT_RATE;
  } catch (error) {
    console.error('Error fetching historical hit rate:', error);
    return DEFAULT_HIT_RATE;
  }
};

// Export constants for use in components
export { 
  DFS_PLATFORMS, 
  PLATFORM_MULTIPLIERS, 
  EV_THRESHOLD, 
  ALTERNATE_MARKETS, 
  LEGACY_ALTERNATE_MARKETS,
  SPORT_MARKETS,
  PLAYER_PROP_MARKETS
};