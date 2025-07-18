/* ++++++++++ EV DASHBOARD COMPONENT ++++++++++ */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  // Divider, // Unused import
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import {
  TrendingUp,
  Star,
  Refresh,
  // Settings, // Unused import
  // Timeline, // Unused import
  Assessment,
  SportsSoccer,
  SportsBasketball,
  SportsFootball,
  SportsBaseball,
  SportsHockey,
  SportsTennis,
  // Notifications, // Unused import
  // NotificationsActive, // Unused import
  BookmarkBorder,
  Bookmark,
  // FilterList, // Unused import
  // Sort, // Unused import
  // Visibility, // Unused import
  // VisibilityOff // Unused import
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

/* ++++++++++ IMPORTS ++++++++++ */
import { SUPPORTED_PLAYER_PROP_SPORTS, calculateImpliedProbability, calculateEV, isPositiveEV } from '../../services/api';
import { useUserAwareApi } from '../../hooks/useUserAwareApi';
import { PropEVData, calculatePropEVFromData, getConfidenceLevel, formatEVPercentage, formatHitRate } from '../../utils/evCalculations';
import { dataAutomationClient } from '../../services/dataAutomationClient';
import ValueHighlighter from '../ValueHighlighting/ValueHighlighter';

/* ++++++++++ TYPES ++++++++++ */
interface DashboardStats {
  totalProps: number;
  positiveEVProps: number;
  highConfidenceProps: number;
  averageEV: number;
  topEVPercentage: number;
  activeSports: number;
  lastRefresh: string | null;
}

interface QuickFilter {
  sport: string;
  minEV: number;
  minHitRate: number;
  platforms: string[];
  showOnlyBookmarked: boolean;
}

interface EVDashboardProps {
  bankroll?: number;
  setBankroll?: (value: number) => void;
}

/* ++++++++++ CONSTANTS ++++++++++ */
const SPORT_ICONS: Record<string, React.ReactNode> = {
  'basketball_nba': <SportsBasketball />,
  'basketball_wnba': <SportsBasketball />,
  'americanfootball_nfl': <SportsFootball />,
  'baseball_mlb': <SportsBaseball />,
  'icehockey_nhl': <SportsHockey />,
  'tennis': <SportsTennis />,
  'soccer': <SportsSoccer />
};

const SPORT_NAMES: Record<string, string> = {
  'basketball_nba': 'NBA',
  'basketball_wnba': 'WNBA',
  'americanfootball_nfl': 'NFL',
  'baseball_mlb': 'MLB',
  'icehockey_nhl': 'NHL',
  'tennis': 'Tennis',
  'soccer': 'Soccer'
};

const DFS_PLATFORMS = [
  'us_dfs.prizepicks',
  'us_dfs.underdog',
  'us_dfs.pick6'
];

/* ++++++++++ EV DASHBOARD COMPONENT ++++++++++ */
export const EVDashboard: React.FC<EVDashboardProps> = ({
  // bankroll = 10000, // Currently unused
  // setBankroll // Currently unused
}) => {
  const { fetchDFSProps } = useUserAwareApi();
  const [selectedSport] = useState<string>('all'); // setSelectedSport removed as unused
  const [quickFilter, setQuickFilter] = useState<QuickFilter>({
    sport: 'all',
    minEV: 5,
    minHitRate: 56.5,
    platforms: DFS_PLATFORMS,
    showOnlyBookmarked: false
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [bookmarkedProps, setBookmarkedProps] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ++++++++++ DATA FETCHING ++++++++++ */
  const { data: allPropsData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-props', selectedSport],
    queryFn: async () => {
      const sports = selectedSport === 'all' ? SUPPORTED_PLAYER_PROP_SPORTS : [selectedSport];
      const results = await Promise.allSettled(
        sports.map(sport => fetchDFSProps(sport, 'upcoming', DFS_PLATFORMS, true))
      );
      
      return results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean);
    },
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes
    staleTime: 240000 // 4 minutes
  });

  /* ++++++++++ PROCESSED DATA ++++++++++ */
  const processedProps = useMemo(() => {
    if (!allPropsData?.length) return [];
    
    const props: PropEVData[] = [];
    
    allPropsData.forEach(sportData => {
      if (!sportData?.bookmakers) return;
      
      sportData.bookmakers.forEach((bookmaker: any) => {
        bookmaker.markets?.forEach((market: any) => {
          market.outcomes?.forEach((outcome: any) => {
            const hitRate = dataAutomationClient.getHitRate(
              outcome.description,
              market.key,
              outcome.point || 0
            );
            
            // Calculate implied probability and EV
            const impliedProb = calculateImpliedProbability(outcome.price);
            const evPercentage = calculateEV(hitRate, impliedProb) * 100;
            const isPositive = isPositiveEV(hitRate, impliedProb);
            
            const prop: PropEVData = {
              id: `${outcome.description}-${market.key}-${bookmaker.key}`,
              playerName: outcome.description,
              propType: market.key,
              line: outcome.point || 0,
              odds: outcome.price,
              platform: bookmaker.key,
              hitRate,
              impliedProbability: impliedProb,
              evPercentage,
              isPositiveEV: isPositive,
              gameCount: 15, // Default game count
              sport: sportData.sport_key || 'unknown',
              lastUpdated: new Date().toISOString()
            };
            
            props.push(prop);
          });
        });
      });
    });
    
    return props;
  }, [allPropsData]);

  /* ++++++++++ FILTERED PROPS ++++++++++ */
  const filteredProps = useMemo(() => {
    return processedProps.filter(prop => {
      const ev = calculatePropEVFromData(prop);
      
      // Apply filters
      if (ev.evPercentage < quickFilter.minEV) return false;
      if (prop.hitRate * 100 < quickFilter.minHitRate) return false;
      if (quickFilter.sport !== 'all' && prop.sport !== quickFilter.sport) return false;
      if (!quickFilter.platforms.includes(prop.platform)) return false;
      if (quickFilter.showOnlyBookmarked && !bookmarkedProps.has(prop.id)) return false;
      
      return true;
    }).sort((a, b) => {
      const evA = calculatePropEVFromData(a).evPercentage;
      const evB = calculatePropEVFromData(b).evPercentage;
      return evB - evA;
    });
  }, [processedProps, quickFilter, bookmarkedProps]);

  /* ++++++++++ DASHBOARD STATS ++++++++++ */
  const dashboardStats = useMemo((): DashboardStats => {
    const positiveEVProps = processedProps.filter(prop => {
      const ev = calculatePropEVFromData(prop);
      return ev.evPercentage > 0;
    });
    
    const highConfidenceProps = processedProps.filter(prop => {
      const confidence = getConfidenceLevel(prop.hitRate, prop.gameCount || 10);
      return confidence === 'high';
    });
    
    const evValues = positiveEVProps.map(prop => calculatePropEVFromData(prop).evPercentage);
    const averageEV = evValues.length > 0 ? evValues.reduce((a, b) => a + b, 0) / evValues.length : 0;
    const topEVPercentage = evValues.length > 0 ? Math.max(...evValues) : 0;
    
    const activeSports = new Set(processedProps.map(prop => prop.sport)).size;
    
    return {
      totalProps: processedProps.length,
      positiveEVProps: positiveEVProps.length,
      highConfidenceProps: highConfidenceProps.length,
      averageEV,
      topEVPercentage,
      activeSports,
      lastRefresh: dataAutomationClient.getLastRefreshTime()
    };
  }, [processedProps]);

  /* ++++++++++ EVENT HANDLERS ++++++++++ */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dataAutomationClient.refreshAllData();
      await refetch();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleBookmark = (propId: string) => {
    setBookmarkedProps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propId)) {
        newSet.delete(propId);
      } else {
        newSet.add(propId);
      }
      return newSet;
    });
  };

  /* ++++++++++ RENDER HELPERS ++++++++++ */
  const renderStatCard = (title: string, value: string | number, subtitle?: string, color?: string, icon?: React.ReactNode) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        {icon && (
          <Box sx={{ mb: 1, color: color || 'primary.main' }}>
            {icon}
          </Box>
        )}
        <Typography variant="h3" component="div" sx={{ color: color || 'primary.main', fontWeight: 'bold' }}>
          {value}
        </Typography>
        <Typography variant="h6" color="text.primary" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderTopProps = () => {
    const topProps = filteredProps.slice(0, 5);
    
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Top EV Props
          </Typography>
          
          {topProps.length === 0 ? (
            <Alert severity="info">
              <AlertTitle>No Props Found</AlertTitle>
              Try adjusting your filters or wait for the next data refresh.
            </Alert>
          ) : (
            <List>
              {topProps.map((prop, index) => {
                const ev = calculatePropEVFromData(prop);
                const confidence = getConfidenceLevel(prop.hitRate, prop.gameCount || 10);
                const isBookmarked = bookmarkedProps.has(prop.id);
                
                return (
                  <ListItem 
                    key={prop.id}
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <ListItemIcon>
                      <Badge badgeContent={index + 1} color="primary">
                        {SPORT_ICONS[prop.sport || 'default'] || <SportsSoccer />}
                      </Badge>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" component="span">
                            {prop.playerName}
                          </Typography>
                          <Chip 
                            label={formatEVPercentage(ev.evPercentage)}
                            color="success"
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {prop.propType} {prop.line}
                          </Typography>
                          <Chip 
                            label={formatHitRate(prop.hitRate)}
                            variant="outlined"
                            size="small"
                          />
                          <Chip 
                            label={confidence.toUpperCase()}
                            size="small"
                            sx={{ 
                              backgroundColor: confidence === 'high' ? '#4caf50' : confidence === 'medium' ? '#ff9800' : '#f44336',
                              color: 'white'
                            }}
                          />
                        </Box>
                      }
                    />
                    
                    <IconButton 
                      size="small" 
                      onClick={() => toggleBookmark(prop.id)}
                    >
                      {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                    </IconButton>
                  </ListItem>
                );
              })}
            </List>
          )}
          
          <Box mt={2}>
            <Button 
              component={Link} 
              to="/ev-props" 
              variant="outlined" 
              fullWidth
              startIcon={<TrendingUp />}
            >
              View All EV Props
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  /* ++++++++++ MAIN RENDER ++++++++++ */
  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          EV Dashboard
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch 
                checked={notifications} 
                onChange={(e) => setNotifications(e.target.checked)}
              />
            }
            label="Notifications"
          />
          
          <FormControlLabel
            control={
              <Switch 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={isRefreshing}>
              <Refresh className={isRefreshing ? 'rotating' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Quick Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sport</InputLabel>
              <Select
                value={quickFilter.sport}
                label="Sport"
                onChange={(e) => setQuickFilter(prev => ({ ...prev, sport: e.target.value }))}
              >
                <MenuItem value="all">All Sports</MenuItem>
                {SUPPORTED_PLAYER_PROP_SPORTS.map(sport => (
                  <MenuItem key={sport} value={sport}>
                    {SPORT_NAMES[sport] || sport}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Min EV %</InputLabel>
              <Select
                value={quickFilter.minEV}
                label="Min EV %"
                onChange={(e) => setQuickFilter(prev => ({ ...prev, minEV: e.target.value as number }))}
              >
                <MenuItem value={0}>0%</MenuItem>
                <MenuItem value={5}>5%</MenuItem>
                <MenuItem value={10}>10%</MenuItem>
                <MenuItem value={15}>15%</MenuItem>
                <MenuItem value={20}>20%</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControlLabel
              control={
                <Switch 
                  checked={quickFilter.showOnlyBookmarked} 
                  onChange={(e) => setQuickFilter(prev => ({ ...prev, showOnlyBookmarked: e.target.checked }))}
                />
              }
              label="Bookmarked Only"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              component={Link} 
              to="/value-highlights" 
              variant="contained" 
              startIcon={<Star />}
              fullWidth
            >
              Value Highlights
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              component={Link} 
              to="/ev-props" 
              variant="outlined" 
              startIcon={<Assessment />}
              fullWidth
            >
              Full EV Analysis
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          {renderStatCard(
            'Total Props',
            dashboardStats.totalProps.toLocaleString(),
            'Available props',
            '#2196f3',
            <Assessment fontSize="large" />
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          {renderStatCard(
            '+EV Props',
            dashboardStats.positiveEVProps.toLocaleString(),
            'Positive expected value',
            '#4caf50',
            <TrendingUp fontSize="large" />
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          {renderStatCard(
            'High Confidence',
            dashboardStats.highConfidenceProps.toLocaleString(),
            'Reliable picks',
            '#ff9800',
            <Star fontSize="large" />
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          {renderStatCard(
            'Avg EV',
            `${dashboardStats.averageEV.toFixed(1)}%`,
            'Expected value',
            '#9c27b0'
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          {renderStatCard(
            'Top EV',
            `${dashboardStats.topEVPercentage.toFixed(1)}%`,
            'Best opportunity',
            '#f44336'
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          {renderStatCard(
            'Active Sports',
            dashboardStats.activeSports.toString(),
            'Sports with props',
            '#607d8b'
          )}
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <ValueHighlighter 
            props={filteredProps.slice(0, 20)} 
            showAlerts={true}
            autoRefresh={autoRefresh}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          {renderTopProps()}
        </Grid>
      </Grid>

      {/* Loading Indicator */}
      {(isLoading || isRefreshing) && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};

export default EVDashboard;