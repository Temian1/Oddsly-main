/* ++++++++++ IMPORTS ++++++++++ */
import React, { useState, useMemo } from 'react';
// import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

/* ++++++++++ MATERIAL-UI ++++++++++ */
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridSortModel 
} from '@mui/x-data-grid';
import { 
  createTheme, 
  ThemeProvider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';

/* ++++++++++ SERVICES ++++++++++ */
import { fetchDFSProps, DFS_PLATFORMS } from '../../services/api';

/* ++++++++++ UTILITIES ++++++++++ */
import {
  PropEVData,
  EVFilterOptions,
  calculatePropEVFromData,
  filterPropsByEV,
  sortPropsByEV,
  formatEVPercentage,
  formatHitRate,
  formatImpliedProbability,
  getEVColor,
  getConfidenceColor,
  FANTASY_PLATFORMS
} from '../../utils/evCalculations';
import { dataAutomationClient } from '../../services/dataAutomationClient';

/* ++++++++++ TYPES ++++++++++ */
interface EVPlayerPropsProps {
  sportKey: string;
  matchId?: string;
  bankroll?: number;
  setBankroll?: (bankroll: number) => void;
}

interface DFSOutcome {
  name: string;
  description: string;
  price: number;
  point?: number;
}

interface DFSMarket {
  key: string;
  last_update: string;
  outcomes: DFSOutcome[];
}

interface DFSBookmaker {
  key: string;
  title: string;
  markets: DFSMarket[];
}

interface GridRow extends PropEVData {
  id: string;
  displayName: string;
  propDisplay: string;
  lineDisplay: string;
  platformDisplay: string;
}

/* ++++++++++ THEME ++++++++++ */
const theme = createTheme({
  palette: {
    primary: {
      main: '#200589',
    },
  },
});

/* ++++++++++ COMPONENT ++++++++++ */
const EVPlayerProps: React.FC<EVPlayerPropsProps> = ({ 
  sportKey, 
  matchId,
  // bankroll = 1000 
}) => {
  /* ++++++++++ STATE ++++++++++ */
  const [filters, setFilters] = useState<Partial<EVFilterOptions>>({
    minEV: 0,
    minHitRate: 0.565, // 56.5% threshold
    platforms: Object.values(DFS_PLATFORMS),
    showOnlyPositiveEV: true
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'evPercentage', sort: 'desc' }
  ]);
  const [legCount, setLegCount] = useState<number>(3);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  /* ++++++++++ DATA FETCHING ++++++++++ */
  const { data: dfsData, isLoading, refetch } = useQuery({
    queryKey: ['dfsProps', sportKey, matchId, filters.platforms],
    queryFn: () => fetchDFSProps(
      sportKey, 
      matchId, 
      filters.platforms || Object.values(DFS_PLATFORMS),
      true // Include alternates
    ),
    enabled: !!sportKey,
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute if enabled
  });

  /* ++++++++++ PROCESS DATA ++++++++++ */
  const processedProps = useMemo(() => {
    if (!dfsData?.bookmakers?.length) return [];

    const props: PropEVData[] = [];
    const processedSet = new Set<string>();

    for (const bookmaker of dfsData.bookmakers as DFSBookmaker[]) {
      for (const market of bookmaker.markets) {
        for (const outcome of market.outcomes) {
          const key = `${outcome.description}-${market.key}-${bookmaker.key}-${outcome.point || 0}`;
          
          if (!processedSet.has(key)) {
            processedSet.add(key);
            
            try {
              // Get hit rate from data automation client
              const hitRate = dataAutomationClient.getHitRate(
                outcome.description,
                market.key,
                outcome.point || 0
              );
              
              // Create base prop with hit rate
              const baseProp: PropEVData = {
                id: key,
                playerName: outcome.description,
                propType: market.key,
                line: outcome.point || 0,
                odds: outcome.price,
                platform: bookmaker.key,
                hitRate,
                impliedProbability: 0,
                evPercentage: 0,
                isPositiveEV: false,
                confidence: 'low' as const
              };
              
              // Calculate EV and other metrics
              const evData = calculatePropEVFromData(baseProp, legCount);
              
              const prop: PropEVData = {
                ...baseProp,
                evPercentage: evData.evPercentage,
                isPositiveEV: evData.isPositiveEV,
                confidence: evData.confidence
              };
              
              props.push(prop);
            } catch (error) {
              console.warn('Error processing prop:', key, error);
            }
          }
        }
      }
    }

    return props;
  }, [dfsData, legCount]);

  /* ++++++++++ FILTERED AND SORTED DATA ++++++++++ */
  const filteredAndSortedProps = useMemo(() => {
    const filtered = filterPropsByEV(processedProps, filters);
    const sorted = sortPropsByEV(filtered, 'ev', false);
    return sorted;
  }, [processedProps, filters]);

  /* ++++++++++ GRID ROWS ++++++++++ */
  const rows: GridRow[] = useMemo(() => {
    return filteredAndSortedProps.map((prop) => ({
      ...prop,
      displayName: prop.playerName,
      propDisplay: `${prop.propType.replace('player_', '').replace('_', ' ')} ${prop.line > 0 ? `O/U ${prop.line}` : ''}`,
      lineDisplay: prop.line > 0 ? prop.line.toString() : 'Yes/No',
      platformDisplay: FANTASY_PLATFORMS.find(p => p.key === prop.platform)?.name || prop.platform
    }));
  }, [filteredAndSortedProps]);

  /* ++++++++++ GRID COLUMNS ++++++++++ */
  const columns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: 'Player',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'propDisplay',
      headerName: 'Prop Type & Line',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'evPercentage',
      headerName: 'EV%',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={formatEVPercentage(params.value)}
          size="small"
          sx={{
            backgroundColor: getEVColor(params.value),
            color: 'white',
            fontWeight: 'bold'
          }}
        />
      ),
    },
    {
      field: 'hitRate',
      headerName: 'Hit Rate',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography 
          variant="body2" 
          fontWeight="medium"
          color={params.value >= 0.565 ? 'success.main' : 'text.secondary'}
        >
          {formatHitRate(params.value)}
        </Typography>
      ),
    },
    {
      field: 'impliedProbability',
      headerName: 'Implied Prob',
      width: 120,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {formatImpliedProbability(params.value)}
        </Typography>
      ),
    },
    {
      field: 'platformDisplay',
      headerName: 'Platform',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      field: 'confidence',
      headerName: 'Confidence',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value?.toUpperCase() || 'LOW'}
          size="small"
          sx={{
            backgroundColor: getConfidenceColor(params.value),
            color: 'white',
            fontSize: '0.75rem'
          }}
        />
      ),
    },
    {
      field: 'odds',
      headerName: 'Odds',
      width: 80,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value > 0 ? `+${params.value}` : params.value}
        </Typography>
      ),
    }
  ];

  /* ++++++++++ EVENT HANDLERS ++++++++++ */
  const handleFilterChange = (field: keyof EVFilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    handleFilterChange('platforms', typeof value === 'string' ? value.split(',') : value);
  };

  const handleRefresh = () => {
    refetch();
  };

  /* ++++++++++ LOADING STATE ++++++++++ */
  if (isLoading) {
    return (
      <Box className="flex items-center justify-center p-8">
        <Typography>Loading EV calculations...</Typography>
      </Box>
    );
  }

  /* ++++++++++ RENDER ++++++++++ */
  return (
    <ThemeProvider theme={theme}>
      <Box className="space-y-6">
        {/* Header */}
        <Box className="flex justify-between items-center">
          <Typography variant="h5" fontWeight="bold">
            Fantasy Props EV Analysis
          </Typography>
          <Box className="flex gap-2">
            <Button 
              variant="outlined" 
              onClick={handleRefresh}
              size="small"
            >
              Refresh Data
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto Refresh"
            />
          </Box>
        </Box>

        {/* Filters */}
        <Box className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <TextField
            label="Min EV%"
            type="number"
            value={filters.minEV || 0}
            onChange={(e) => handleFilterChange('minEV', parseFloat(e.target.value) || 0)}
            size="small"
            inputProps={{ step: 0.1 }}
          />
          
          <TextField
            label="Min Hit Rate%"
            type="number"
            value={(filters.minHitRate || 0) * 100}
            onChange={(e) => handleFilterChange('minHitRate', (parseFloat(e.target.value) || 0) / 100)}
            size="small"
            inputProps={{ step: 0.1, min: 0, max: 100 }}
          />

          <FormControl size="small">
            <InputLabel>Platforms</InputLabel>
            <Select
              multiple
              value={filters.platforms || []}
              onChange={handlePlatformChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip 
                      key={value} 
                      label={FANTASY_PLATFORMS.find(p => p.key === value)?.name || value}
                      size="small" 
                    />
                  ))}
                </Box>
              )}
            >
              {FANTASY_PLATFORMS.map((platform) => (
                <MenuItem key={platform.key} value={platform.key}>
                  {platform.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Leg Count"
            type="number"
            value={legCount}
            onChange={(e) => setLegCount(parseInt(e.target.value) || 3)}
            size="small"
            inputProps={{ min: 2, max: 6 }}
            helperText="For platform multipliers"
          />
        </Box>

        {/* Summary Stats */}
        <Box className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Box className="bg-green-50 p-4 rounded-lg">
            <Typography variant="h6" color="success.main">
              {filteredAndSortedProps.filter(p => p.isPositiveEV).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              +EV Props Found
            </Typography>
          </Box>
          <Box className="bg-blue-50 p-4 rounded-lg">
            <Typography variant="h6" color="primary.main">
              {filteredAndSortedProps.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Props
            </Typography>
          </Box>
          <Box className="bg-yellow-50 p-4 rounded-lg">
            <Typography variant="h6" color="warning.main">
              {filteredAndSortedProps.filter(p => p.confidence === 'high').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High Confidence
            </Typography>
          </Box>
          <Box className="bg-purple-50 p-4 rounded-lg">
            <Typography variant="h6" color="secondary.main">
              {Math.max(...filteredAndSortedProps.map(p => p.evPercentage), 0).toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Highest EV
            </Typography>
          </Box>
        </Box>

        {/* Data Grid */}
        <Box style={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(32, 5, 137, 0.04)',
              },
            }}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default EVPlayerProps;