/* ++++++++++ VALUE HIGHLIGHTING COMPONENT ++++++++++ */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  AlertTitle,
  Grid,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  // Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // List,
  // ListItem,
  // ListItemText,
  // ListItemIcon
} from '@mui/material';
import {
  // TrendingUp,
  // Star,
  // Warning,
  // Info,
  Bookmark,
  BookmarkBorder,
  // Visibility,
  // VisibilityOff,
  // FilterList,
  // Sort,
  Refresh,
  // Settings,
  // Share,
  // Download
} from '@mui/icons-material';
import { PropEVData, getConfidenceLevel, formatEVPercentage, formatHitRate } from '../../utils/evCalculations';
// import { PropEVData, calculatePropEVFromData, getConfidenceLevel, formatEVPercentage, formatHitRate } from '../../utils/evCalculations';
import { dataAutomationClient } from '../../services/dataAutomationClient';

/* ++++++++++ TYPES ++++++++++ */
interface ValueAlert {
  id: string;
  type: 'high_ev' | 'hot_streak' | 'line_movement' | 'new_value';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  propData: PropEVData;
  timestamp: string;
  dismissed: boolean;
  bookmarked: boolean;
}

interface ValueHighlighterProps {
  props: PropEVData[];
  onPropSelect?: (prop: PropEVData) => void;
  showAlerts?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface HighlightSettings {
  minEV: number;
  minHitRate: number;
  minConfidence: 'low' | 'medium' | 'high';
  showDismissed: boolean;
  enableNotifications: boolean;
  highlightThresholds: {
    excellent: number; // EV > 15%
    good: number;      // EV > 10%
    fair: number;      // EV > 5%
  };
}

/* ++++++++++ CONSTANTS ++++++++++ */
const DEFAULT_SETTINGS: HighlightSettings = {
  minEV: 5,
  minHitRate: 56.5,
  minConfidence: 'medium',
  showDismissed: false,
  enableNotifications: true,
  highlightThresholds: {
    excellent: 15,
    good: 10,
    fair: 5
  }
};

// const ALERT_COLORS = {
//   high_ev: '#4caf50',
//   hot_streak: '#ff9800',
//   line_movement: '#2196f3',
//   new_value: '#9c27b0'
// };

const CONFIDENCE_COLORS = {
  high: '#4caf50',
  medium: '#ff9800',
  low: '#f44336'
};

/* ++++++++++ VALUE HIGHLIGHTER COMPONENT ++++++++++ */
export const ValueHighlighter: React.FC<ValueHighlighterProps> = ({
  props,
  onPropSelect,
  showAlerts = true,
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}) => {
  const [alerts, setAlerts] = useState<ValueAlert[]>([]);
  const [settings] = useState<HighlightSettings>(DEFAULT_SETTINGS);
  // const [settings, setSettings] = useState<HighlightSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarkedProps, setBookmarkedProps] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ++++++++++ MEMOIZED CALCULATIONS ++++++++++ */
  const valueProps = useMemo(() => {
    return props.filter(prop => {
      // Use the EV data already calculated in the prop object
      const confidence = prop.confidence || getConfidenceLevel(prop.hitRate, Math.abs(prop.evPercentage));
      
      return (
        prop.evPercentage >= settings.minEV &&
        prop.hitRate >= settings.minHitRate / 100 &&
        (settings.minConfidence === 'low' || 
         (settings.minConfidence === 'medium' && confidence !== 'low') ||
         (settings.minConfidence === 'high' && confidence === 'high'))
      );
    }).sort((a, b) => {
      return b.evPercentage - a.evPercentage;
    });
  }, [props, settings]);

  const alertStats = useMemo(() => {
    const activeAlerts = alerts.filter(alert => !alert.dismissed);
    return {
      total: activeAlerts.length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length,
      bookmarked: activeAlerts.filter(a => a.bookmarked).length
    };
  }, [alerts]);

  /* ++++++++++ EFFECTS ++++++++++ */
  useEffect(() => {
    generateValueAlerts();
  }, [props, settings]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  /* ++++++++++ ALERT GENERATION ++++++++++ */
  const generateValueAlerts = () => {
    const newAlerts: ValueAlert[] = [];
    const now = new Date().toISOString();

    valueProps.forEach(prop => {
      // Use the EV data already calculated in the prop object
      const confidence = prop.confidence || getConfidenceLevel(prop.hitRate, Math.abs(prop.evPercentage));
      
      // High EV Alert
      if (prop.evPercentage >= settings.highlightThresholds.excellent) {
        newAlerts.push({
          id: `high_ev_${prop.id}`,
          type: 'high_ev',
          severity: 'high',
          title: 'Excellent Value Found!',
          message: `${prop.playerName} ${prop.propType} has ${formatEVPercentage(prop.evPercentage)} EV`,
          propData: prop,
          timestamp: now,
          dismissed: false,
          bookmarked: bookmarkedProps.has(prop.id)
        });
      } else if (prop.evPercentage >= settings.highlightThresholds.good) {
        newAlerts.push({
          id: `good_ev_${prop.id}`,
          type: 'high_ev',
          severity: 'medium',
          title: 'Good Value Detected',
          message: `${prop.playerName} ${prop.propType} has ${formatEVPercentage(prop.evPercentage)} EV`,
          propData: prop,
          timestamp: now,
          dismissed: false,
          bookmarked: bookmarkedProps.has(prop.id)
        });
      }

      // Hot Streak Alert
      if (prop.hitRate >= 0.75 && confidence === 'high') {
        newAlerts.push({
          id: `hot_streak_${prop.id}`,
          type: 'hot_streak',
          severity: 'medium',
          title: 'Player on Hot Streak',
          message: `${prop.playerName} hitting ${formatHitRate(prop.hitRate)} on ${prop.propType}`,
          propData: prop,
          timestamp: now,
          dismissed: false,
          bookmarked: bookmarkedProps.has(prop.id)
        });
      }

      // High Confidence Alert
      if (confidence === 'high' && prop.evPercentage >= settings.minEV) {
        newAlerts.push({
          id: `high_conf_${prop.id}`,
          type: 'new_value',
          severity: 'medium',
          title: 'High Confidence Pick',
          message: `${prop.playerName} ${prop.propType} - High confidence with ${formatEVPercentage(prop.evPercentage)} EV`,
          propData: prop,
          timestamp: now,
          dismissed: false,
          bookmarked: bookmarkedProps.has(prop.id)
        });
      }
    });

    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.has(alert.id));
      return [...prev, ...uniqueNewAlerts];
    });
  };

  /* ++++++++++ EVENT HANDLERS ++++++++++ */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await dataAutomationClient.refreshAllData();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
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

  const getValueLevel = (evPercentage: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (evPercentage >= settings.highlightThresholds.excellent) return 'excellent';
    if (evPercentage >= settings.highlightThresholds.good) return 'good';
    if (evPercentage >= settings.highlightThresholds.fair) return 'fair';
    return 'poor';
  };

  const getValueColor = (level: string): string => {
    switch (level) {
      case 'excellent': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'fair': return '#ff9800';
      default: return '#f44336';
    }
  };

  /* ++++++++++ RENDER HELPERS ++++++++++ */
  const renderValueCard = (prop: PropEVData) => {
    // Use the EV data already calculated in the prop object
    const confidence = prop.confidence || getConfidenceLevel(prop.hitRate, Math.abs(prop.evPercentage));
    const valueLevel = getValueLevel(prop.evPercentage);
    const isBookmarked = bookmarkedProps.has(prop.id);

    return (
      <Card 
        key={prop.id}
        sx={{ 
          mb: 2, 
          border: `2px solid ${getValueColor(valueLevel)}`,
          cursor: 'pointer',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
        }}
        onClick={() => onPropSelect?.(prop)}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="h6" component="div">
                {prop.playerName}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {prop.propType} {prop.line}
              </Typography>
              
              <Box display="flex" gap={1} mt={1}>
                <Chip 
                  label={formatEVPercentage(prop.evPercentage)}
                  color={valueLevel === 'excellent' ? 'success' : valueLevel === 'good' ? 'primary' : 'warning'}
                  size="small"
                />
                <Chip 
                  label={formatHitRate(prop.hitRate)}
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={confidence.toUpperCase()}
                  sx={{ backgroundColor: CONFIDENCE_COLORS[confidence], color: 'white' }}
                  size="small"
                />
              </Box>
            </Box>
            
            <Box display="flex" flexDirection="column" alignItems="center">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(prop.id);
                }}
              >
                {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
              </IconButton>
              
              <Typography variant="caption" color="text.secondary">
                {prop.platform}
              </Typography>
            </Box>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={Math.min(prop.evPercentage, 25) * 4} // Scale to 0-100 for display
            sx={{ 
              mt: 2, 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getValueColor(valueLevel)
              }
            }} 
          />
        </CardContent>
      </Card>
    );
  };

  const renderAlert = (alert: ValueAlert) => {
    if (alert.dismissed && !settings.showDismissed) return null;

    return (
      <Alert 
        key={alert.id}
        severity={alert.severity === 'high' ? 'success' : alert.severity === 'medium' ? 'warning' : 'info'}
        sx={{ mb: 1, opacity: alert.dismissed ? 0.5 : 1 }}
        action={
          <Box>
            <IconButton 
              size="small" 
              onClick={() => toggleBookmark(alert.propData.id)}
            >
              {alert.bookmarked ? <Bookmark /> : <BookmarkBorder />}
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => dismissAlert(alert.id)}
            >
              <VisibilityOff />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>{alert.title}</AlertTitle>
        {alert.message}
      </Alert>
    );
  };

  /* ++++++++++ MAIN RENDER ++++++++++ */
  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Value Highlights
          <Badge badgeContent={alertStats.total} color="primary" sx={{ ml: 2 }} />
        </Typography>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={isRefreshing}>
              <Refresh className={isRefreshing ? 'rotating' : ''} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Summary */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {valueProps.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +EV Props
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {alertStats.high}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Priority
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {alertStats.bookmarked}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bookmarked
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="text.secondary">
                {Math.round((Date.now() - lastUpdate.getTime()) / 60000)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Min Ago
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts Section */}
      {showAlerts && alerts.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Value Alerts
          </Typography>
          {alerts.map(renderAlert)}
        </Box>
      )}

      {/* Value Props Grid */}
      <Typography variant="h6" gutterBottom>
        Top Value Props
      </Typography>
      
      {valueProps.length === 0 ? (
        <Alert severity="info">
          <AlertTitle>No Value Props Found</AlertTitle>
          Try adjusting your filters or wait for the next data refresh.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {valueProps.slice(0, 12).map(prop => (
            <Grid item xs={12} sm={6} md={4} key={prop.id}>
              {renderValueCard(prop)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Value Highlighting Settings</DialogTitle>
        <DialogContent>
          {/* Settings form would go here */}
          <Typography>Settings configuration coming soon...</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={() => setSettingsOpen(false)} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ValueHighlighter;