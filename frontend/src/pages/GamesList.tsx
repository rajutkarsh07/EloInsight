import { useState } from 'react';
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
} from '@mui/material';
import {
    Visibility,
    Sync,
    FilterList,
} from '@mui/icons-material';

const GamesList = () => {
    const navigate = useNavigate();
    const [platform, setPlatform] = useState('all');

    // Mock data - will be replaced with real API calls
    const games = [
        {
            id: '1',
            platform: 'chess.com',
            whitePlayer: 'Player1',
            blackPlayer: 'Player2',
            result: '1-0',
            timeControl: '10+0',
            playedAt: '2026-01-10',
            analysisStatus: 'completed',
            accuracy: { white: 92.5, black: 85.3 },
        },
        {
            id: '2',
            platform: 'lichess',
            whitePlayer: 'Player3',
            blackPlayer: 'Player4',
            result: '0-1',
            timeControl: '5+3',
            playedAt: '2026-01-09',
            analysisStatus: 'pending',
        },
        {
            id: '3',
            platform: 'chess.com',
            whitePlayer: 'Player5',
            blackPlayer: 'Player6',
            result: '1/2-1/2',
            timeControl: '15+10',
            playedAt: '2026-01-08',
            analysisStatus: 'processing',
        },
    ];

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
                    startIcon={<Sync />}
                    onClick={() => alert('Sync games functionality')}
                >
                    Sync Games
                </Button>
            </Box>

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
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.dark">
                    <strong>Demo Mode:</strong> Showing mock data. Connect to backend to see your actual games.
                </Typography>
            </Box>
        </Container>
    );
};

export default GamesList;
