import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    Box,
    TextField,
    MenuItem,
    IconButton,
    CircularProgress,
} from '@mui/material';
import {
    Visibility,
    Sync,
    FilterList,
} from '@mui/icons-material';
import { apiClient } from '../services/apiClient';

interface Game {
    id: string;
    platform: string;
    whitePlayer: string;
    blackPlayer: string;
    result: string;
    timeControl: string;
    playedAt: string;
    analysisStatus: string;
    accuracy?: { white: number; black: number };
}

interface GamesResponse {
    data: Game[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const GamesList = () => {
    const navigate = useNavigate();
    const [platform, setPlatform] = useState('all');
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');

    const fetchGames = async () => {
        try {
            setLoading(true);
            const params = platform !== 'all' ? `?platform=${platform}` : '';
            const response = await apiClient.get<GamesResponse>(`/games${params}`);
            setGames(response.data);
        } catch (err) {
            setError('Failed to load games');
            console.error('Error fetching games:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, [platform]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            await apiClient.post('/games/sync', { platform: 'chess.com' });
            // Refresh games after sync
            await fetchGames();
        } catch (err) {
            setError('Failed to sync games');
            console.error('Error syncing games:', err);
        } finally {
            setSyncing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'processing':
                return 'warning';
            case 'pending':
                return 'default';
            case 'failed':
                return 'error';
            default:
                return 'default';
        }
    };

    const getResultColor = (result: string) => {
        switch (result) {
            case '1-0':
                return 'success';
            case '0-1':
                return 'error';
            case '1/2-1/2':
                return 'default';
            default:
                return 'default';
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4">
                    Games
                </Typography>
                <Button
                    variant="contained"
                    startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <Sync />}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    {syncing ? 'Syncing...' : 'Sync Games'}
                </Button>
            </Box>

            {error && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography color="error.dark">{error}</Typography>
                </Box>
            )}

            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FilterList />
                    <TextField
                        select
                        label="Platform"
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="all">All Platforms</MenuItem>
                        <MenuItem value="chess.com">Chess.com</MenuItem>
                        <MenuItem value="lichess">Lichess</MenuItem>
                    </TextField>
                </Box>
            </Paper>

            <TableContainer component={Paper}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Platform</TableCell>
                                <TableCell>White</TableCell>
                                <TableCell>Black</TableCell>
                                <TableCell>Result</TableCell>
                                <TableCell>Time Control</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Accuracy</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {games.map((game) => (
                                <TableRow key={game.id} hover>
                                    <TableCell>
                                        <Chip
                                            label={game.platform}
                                            size="small"
                                            color={game.platform === 'chess.com' ? 'primary' : 'secondary'}
                                        />
                                    </TableCell>
                                    <TableCell>{game.whitePlayer}</TableCell>
                                    <TableCell>{game.blackPlayer}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={game.result}
                                            size="small"
                                            color={getResultColor(game.result)}
                                        />
                                    </TableCell>
                                    <TableCell>{game.timeControl}</TableCell>
                                    <TableCell>{game.playedAt}</TableCell>
                                    <TableCell>
                                        {game.accuracy ? (
                                            <Box>
                                                <Typography variant="caption" display="block">
                                                    W: {game.accuracy.white}%
                                                </Typography>
                                                <Typography variant="caption" display="block">
                                                    B: {game.accuracy.black}%
                                                </Typography>
                                            </Box>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={game.analysisStatus}
                                            size="small"
                                            color={getStatusColor(game.analysisStatus)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => navigate(`/games/${game.id}/analysis`)}
                                            disabled={game.analysisStatus !== 'completed'}
                                        >
                                            <Visibility />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {games.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        <Typography color="text.secondary" sx={{ py: 4 }}>
                                            No games found. Click "Sync Games" to import your games.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        </Container>
    );
};

export default GamesList;
