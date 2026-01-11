import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    LinearProgress,
} from '@mui/material';
import {
    TrendingUp,
    SportsEsports,
    Assessment,
    EmojiEvents,
} from '@mui/icons-material';

const Dashboard = () => {
    // Mock data - will be replaced with real API calls
    const stats = {
        totalGames: 150,
        winRate: 52.3,
        averageAccuracy: 88.5,
        recentGames: 10,
    };

    const StatCard = ({
        title,
        value,
        icon,
        color,
    }: {
        title: string;
        value: string | number;
        icon: React.ReactNode;
        color: string;
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
                <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {value}
                </Typography>
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

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Games"
                        value={stats.totalGames}
                        icon={<SportsEsports />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Win Rate"
                        value={`${stats.winRate}%`}
                        icon={<EmojiEvents />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Avg Accuracy"
                        value={`${stats.averageAccuracy}%`}
                        icon={<Assessment />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Recent Games"
                        value={stats.recentGames}
                        icon={<TrendingUp />}
                        color="warning"
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

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.dark">
                    <strong>Demo Mode:</strong> This is placeholder data. Connect to the backend to see your real statistics.
                </Typography>
            </Box>
        </Container>
    );
};

export default Dashboard;
