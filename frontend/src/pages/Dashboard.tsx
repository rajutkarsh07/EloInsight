import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Gamepad2,
    Activity,
    Trophy,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface UserStats {
    userId: string;
    totalGames: number;
    winRate: number;
    averageAccuracy: number;
    recentGames: number;
}

interface RatingPoint {
    date: string;
    platform: string;
    rating: number;
}

interface AnalyzedGame {
    id: string;
    platform: string;
    whitePlayer: string;
    blackPlayer: string;
    result: string;
    playedAt: string;
    analysis: {
        accuracyWhite: number;
        accuracyBlack: number;
        analyzedAt: string;
    };
}

const Dashboard = () => {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [ratings, setRatings] = useState<any[]>([]);
    const [recentGames, setRecentGames] = useState<AnalyzedGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stats
                const statsData = await apiClient.get<UserStats>('/users/stats');
                setStats(statsData);

                // Fetch ratings history
                const ratingsData = await apiClient.get<RatingPoint[]>('/users/ratings');

                // Process ratings for chart
                const processedRatings = ratingsData.map(r => ({
                    date: new Date(r.date).getTime(), // Numeric for X-axis sorting
                    displayDate: format(new Date(r.date), 'MMM d'),
                    chessCom: r.platform === 'chess.com' ? r.rating : null,
                    lichess: r.platform === 'lichess' ? r.rating : null,
                })).sort((a, b) => a.date - b.date);

                setRatings(processedRatings);

                // Fetch recent analyzed games
                const gamesData = await apiClient.get<{ data: AnalyzedGame[] }>('/games/analyzed?limit=5');
                setRecentGames(gamesData.data || []);

            } catch (err) {
                setError('Failed to load dashboard data');
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const StatCard = ({
        title,
        value,
        icon,
        colorClass,
        loading: isLoading,
        subtext
    }: {
        title: string;
        value: string | number;
        icon: React.ReactNode;
        colorClass: string;
        loading?: boolean;
        subtext?: string;
    }) => (
        <div className="bg-card text-card-foreground rounded-xl border shadow-card p-6 card-hover group relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${colorClass.split(' ')[0].replace('/10', '/20')}`} />
            <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                    <div className={cn("p-2 rounded-lg transition-colors", colorClass)}>
                        {icon}
                    </div>
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        {title}
                    </h3>
                </div>
                {isLoading ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                ) : (
                    <div>
                        <div className="text-3xl font-bold tracking-tight">
                            {value}
                        </div>
                        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
                    </div>
                )}
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                    <p className="text-sm font-medium mb-2">{payload[0].payload.displayDate}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="capitalize">{entry.name === 'chessCom' ? 'Chess.com' : 'Lichess'}:</span>
                            <span className="font-bold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Performance overview and recent analysis insights.
                </p>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                    <Activity size={16} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <StatCard
                    title="Total Games"
                    value={stats?.totalGames ?? 0}
                    subtext="Analyzed games"
                    icon={<Gamepad2 size={24} className="text-blue-500" />}
                    colorClass="bg-blue-500/10 text-blue-500"
                    loading={loading}
                />
                <StatCard
                    title="Win Rate"
                    value={`${stats?.winRate ?? 0}%`}
                    subtext="Across all platforms"
                    icon={<Trophy size={24} className="text-yellow-500" />}
                    colorClass="bg-yellow-500/10 text-yellow-500"
                    loading={loading}
                />
                <StatCard
                    title="Avg Accuracy"
                    value={`${stats?.averageAccuracy ?? 0}%`}
                    subtext="Engine evaluation"
                    icon={<Activity size={24} className="text-green-500" />}
                    colorClass="bg-green-500/10 text-green-500"
                    loading={loading}
                />
                <StatCard
                    title="Recent Volume"
                    value={stats?.recentGames ?? 0}
                    subtext="Games this period"
                    icon={<TrendingUp size={24} className="text-orange-500" />}
                    colorClass="bg-orange-500/10 text-orange-500"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                {/* Rating Chart */}
                <div className="md:col-span-2 bg-card rounded-xl border shadow-card p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp size={20} className="text-primary" />
                            Rating Progression
                        </h3>
                    </div>

                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
                                <span className="text-muted-foreground">Loading chart...</span>
                            </div>
                        ) : ratings.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ratings} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="displayDate"
                                        stroke="var(--muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        stroke="var(--muted-foreground)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" />
                                    <Line
                                        type="monotone"
                                        dataKey="chessCom"
                                        name="Chess.com"
                                        stroke="#7fa650"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#7fa650' }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="lichess"
                                        name="Lichess"
                                        stroke="#ffffffff"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#ffffff' }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/5">
                                <Activity className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">No rating data available yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Play and analyze games to see your progress</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-card rounded-xl border shadow-card p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        Recent Analysis
                    </h3>
                    <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                            ))
                        ) : recentGames.length > 0 ? (
                            recentGames.map((game) => {
                                return (
                                    <div key={game.id} className="group flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-md",
                                                game.platform === 'chess.com' ? "bg-[#7fa650]/20 text-[#7fa650]" : "bg-white/10 text-white"
                                            )}>
                                                <Gamepad2 size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium flex items-center gap-2">
                                                    {game.whitePlayer} <span className="text-muted-foreground">vs</span> {game.blackPlayer}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>{format(new Date(game.playedAt), 'MMM d, h:mm a')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold">
                                                {game.result}
                                            </div>
                                            <div className="hidden group-hover:flex items-center gap-1 text-xs text-primary animate-in fade-in slide-in-from-right-2">
                                                View <ArrowUpRight size={10} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No recent analyzed games.</p>
                                <button className="mt-4 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
                                    Analyze a Game
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions / Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-semibold mb-2">Pro Tip</h3>
                        <p className="text-muted-foreground text-sm max-w-[80%]">
                            Analyzing your losses is the fastest way to improve. Focus on blunders and missed wins to boost your rating significantly.
                        </p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20 p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-semibold mb-2">Sync Status</h3>
                        {stats?.recentGames ? (
                            <p className="text-muted-foreground text-sm">
                                You have {stats.recentGames} analyzed games this period. Keep up the good work!
                            </p>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Connect your Chess.com or Lichess account to automatically sync and analyze your games.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
