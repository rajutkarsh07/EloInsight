import { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    LinearProgress,
    Skeleton,
} from '@mui/material';
import {
    TrendingUp,
    SportsEsports,
    Assessment,
    EmojiEvents,
} from '@mui/icons-material';
import { apiClient } from '../services/apiClient';

interface UserStats {
    userId: string;
    totalGames: number;
    winRate: number;
    averageAccuracy: number;
    recentGames: number;
}

const Dashboard = () => {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiClient.get<UserStats>('/users/stats');
                setStats(data);
            } catch (err) {
                setError('Failed to load statistics');
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const StatCard = ({
        title,
        value,
        icon,
        color,
        loading: isLoading,
    }: {
        title: string;
        value: string | number;
        icon: React.ReactNode;
        color: string;
        loading?: boolean;
    }) => (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                        sx={{
                            bgcolor: `${color}.light`,
                            color: `${color}.dark`,
                            p: 1,
                            borderRadius: 1,
                            mr: 2,
                        }}
                    >
                        {icon}
                    </Box>
                    <Typography variant="h6" component="div">
                        {title}
                    </Typography>
                </Box>
                {isLoading ? (
                    <Skeleton variant="text" width={80} height={40} />
                ) : (
                    <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                        {value}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" gutterBottom>
                Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Welcome back! Here's an overview of your chess performance.
            </Typography>

            {error && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography color="error.dark">{error}</Typography>
                </Box>
            )}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Games"
                        value={stats?.totalGames ?? 0}
                        icon={<SportsEsports />}
                        color="primary"
                        loading={loading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Win Rate"
                        value={`${stats?.winRate ?? 0}%`}
                        icon={<EmojiEvents />}
                        color="success"
                        loading={loading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Avg Accuracy"
                        value={`${stats?.averageAccuracy ?? 0}%`}
                        icon={<Assessment />}
                        color="info"
                        loading={loading}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Recent Games"
                        value={stats?.recentGames ?? 0}
                        icon={<TrendingUp />}
                        color="warning"
                        loading={loading}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Rating Progression
                        </Typography>
                        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary">
                                Chart will be displayed here
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Activity
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            {[1, 2, 3, 4, 5].map((item) => (
                                <Box key={item} sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        Game analyzed #{item}
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={100}
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Dashboard;
