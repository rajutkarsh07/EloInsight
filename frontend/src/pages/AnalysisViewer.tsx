import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    CircularProgress,
} from '@mui/material';
import ChessBoardViewer from '../components/chess/ChessBoardViewer';
import { apiClient } from '../services/apiClient';

interface Analysis {
    id: string;
    gameId: string;
    accuracyWhite: number;
    accuracyBlack: number;
    acplWhite: number;
    acplBlack: number;
    blundersWhite: number;
    blundersBlack: number;
    mistakesWhite: number;
    mistakesBlack: number;
    inaccuraciesWhite: number;
    inaccuraciesBlack: number;
    performanceRatingWhite?: number;
    performanceRatingBlack?: number;
    analyzedAt: string;
}

const AnalysisViewer = () => {
    const { gameId } = useParams();
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const data = await apiClient.get<Analysis>(`/analysis/${gameId}`);
                setAnalysis(data);
            } catch (err) {
                setError('Failed to load analysis');
                console.error('Error fetching analysis:', err);
            } finally {
                setLoading(false);
            }
        };

        if (gameId) {
            fetchAnalysis();
        }
    }, [gameId]);

    const MetricCard = ({
        title,
        whiteValue,
        blackValue,
        unit = '',
    }: {
        title: string;
        whiteValue: number;
        blackValue: number;
        unit?: string;
    }) => (
        <Card>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Box>
                        <Typography variant="caption" display="block">
                            White
                        </Typography>
                        <Typography variant="h6">
                            {whiteValue}
                            {unit}
                        </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                        <Typography variant="caption" display="block">
                            Black
                        </Typography>
                        <Typography variant="h6">
                            {blackValue}
                            {unit}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error || !analysis) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="error">{error || 'Analysis not found'}</Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Game Analysis
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="Chess.com" color="primary" size="small" />
                    <Chip label="Rapid" size="small" />
                    <Chip label="10+0" size="small" />
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <ChessBoardViewer
                        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        interactive={false}
                    />

                    <Paper sx={{ p: 3, mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Move List
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {['1. e4 e5', '2. Nf3 Nc6', '3. Bc4 Bc5', '4. c3 Nf6'].map(
                                (move, index) => (
                                    <Chip
                                        key={index}
                                        label={move}
                                        variant="outlined"
                                        onClick={() => console.log(`Jump to move: ${move}`)}
                                    />
                                )
                            )}
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Analysis Metrics
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <MetricCard
                                    title="Accuracy"
                                    whiteValue={analysis.accuracyWhite}
                                    blackValue={analysis.accuracyBlack}
                                    unit="%"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <MetricCard
                                    title="Avg Centipawn Loss"
                                    whiteValue={analysis.acplWhite}
                                    blackValue={analysis.acplBlack}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <MetricCard
                                    title="Blunders"
                                    whiteValue={analysis.blundersWhite}
                                    blackValue={analysis.blundersBlack}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <MetricCard
                                    title="Mistakes"
                                    whiteValue={analysis.mistakesWhite}
                                    blackValue={analysis.mistakesBlack}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <MetricCard
                                    title="Inaccuracies"
                                    whiteValue={analysis.inaccuraciesWhite}
                                    blackValue={analysis.inaccuraciesBlack}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AnalysisViewer;
