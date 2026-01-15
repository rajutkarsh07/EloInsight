import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    Gamepad2,
    Activity,
    Trophy,
    Calendar,
    ArrowUpRight,
    Flame,
    Target,
    Zap,
    BookOpen,
    AlertTriangle,
    Star,
    ChevronRight,
    Clock,
    Crown,
    Frown,
    Sparkles,
    BarChart3,
    PieChart,
    Lightbulb,
    Medal,
    Swords,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area,
    PieChart as RePieChart,
    Pie,
    Cell,
} from 'recharts';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface DashboardData {
    stats: {
    totalGames: number;
    winRate: number;
    averageAccuracy: number;
        totalBlunders: number;
        totalMistakes: number;
        totalInaccuracies: number;
        totalBrilliant: number;
        avgPerformanceRating: number;
    };
    streaks: {
        current: number;
        type: 'win' | 'loss' | 'none';
        best: number;
    };
    moveQuality: {
        brilliant: number;
        best: number;
        good: number;
        inaccuracies: number;
        mistakes: number;
        blunders: number;
    };
    openings: Array<{
        name: string;
        fullName: string;
        games: number;
        winRate: number;
        wins: number;
        losses: number;
        draws: number;
    }>;
    recentTrend: {
        accuracy: number[];
        wins: number;
        losses: number;
        draws: number;
    };
    bestGame: {
        id: string;
        whitePlayer: string;
        blackPlayer: string;
        result: string;
        accuracy: number;
        playedAt: string;
        opening: string;
    } | null;
    worstGame: {
        id: string;
        whitePlayer: string;
        blackPlayer: string;
        result: string;
        accuracy: number;
        playedAt: string;
        opening: string;
    } | null;
    studySuggestions: string[];
    timeControlStats: Array<{
        name: string;
        games: number;
        winRate: number;
    }>;
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

interface ProcessedRating {
    date: number;
    displayDate: string;
    chessCom: number | null;
    lichess: number | null;
}

interface TooltipPayloadEntry {
    color: string;
    name: string;
    value: number;
    payload: ProcessedRating;
}

const MOVE_QUALITY_COLORS = {
    brilliant: '#26c9a2',
    best: '#96c93d',
    good: '#8bc34a',
    inaccuracies: '#f5c242',
    mistakes: '#e69138',
    blunders: '#e74c3c',
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [ratings, setRatings] = useState<ProcessedRating[]>([]);
    const [recentGames, setRecentGames] = useState<AnalyzedGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch comprehensive dashboard data
                const [dashboard, ratingsData, gamesData] = await Promise.all([
                    apiClient.get<DashboardData>('/users/dashboard'),
                    apiClient.get<RatingPoint[]>('/users/ratings'),
                    apiClient.get<{ data: AnalyzedGame[] }>('/games/analyzed?limit=5'),
                ]);

                setDashboardData(dashboard);

                // Process ratings for chart
                const processedRatings = ratingsData.map(r => ({
                    date: new Date(r.date).getTime(),
                    displayDate: format(new Date(r.date), 'MMM d'),
                    chessCom: r.platform === 'chess.com' ? r.rating : null,
                    lichess: r.platform === 'lichess' ? r.rating : null,
                })).sort((a, b) => a.date - b.date);

                setRatings(processedRatings);
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

    // Accuracy trend data
    const accuracyTrendData = useMemo(() => {
        if (!dashboardData?.recentTrend.accuracy) return [];
        return dashboardData.recentTrend.accuracy.map((acc, i) => ({
            game: `Game ${i + 1}`,
            accuracy: acc,
        }));
    }, [dashboardData]);

    // Win/Loss/Draw pie data
    const resultsPieData = useMemo(() => {
        if (!dashboardData) return [];
        const { wins, losses, draws } = dashboardData.recentTrend;
        return [
            { name: 'Wins', value: wins, color: '#22c55e' },
            { name: 'Losses', value: losses, color: '#ef4444' },
            { name: 'Draws', value: draws, color: '#6b7280' },
        ].filter(d => d.value > 0);
    }, [dashboardData]);

    const StatCard = ({
        title,
        value,
        icon,
        colorClass,
        loading: isLoading,
        subtext,
        trend,
        onClick,
    }: {
        title: string;
        value: string | number;
        icon: React.ReactNode;
        colorClass: string;
        loading?: boolean;
        subtext?: string;
        trend?: 'up' | 'down' | null;
        onClick?: () => void;
    }) => (
        <div
            className={cn(
                "bg-card text-card-foreground rounded-xl border shadow-card p-5 card-hover group relative overflow-hidden",
                onClick && "cursor-pointer"
            )}
            onClick={onClick}
        >
            <div className={cn(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150",
                colorClass.includes('blue') && "bg-blue-500",
                colorClass.includes('yellow') && "bg-yellow-500",
                colorClass.includes('green') && "bg-green-500",
                colorClass.includes('orange') && "bg-orange-500",
                colorClass.includes('purple') && "bg-purple-500",
                colorClass.includes('cyan') && "bg-cyan-500",
                colorClass.includes('red') && "bg-red-500",
            )} />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2 rounded-lg transition-colors", colorClass)}>
                        {icon}
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center text-xs font-medium",
                            trend === 'up' ? "text-green-500" : "text-red-500"
                        )}>
                            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        </div>
                    )}
                </div>
                {isLoading ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                ) : (
                    <div>
                        <div className="text-2xl font-bold tracking-tight">
                            {value}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                            {title}
                        </p>
                        {subtext && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtext}</p>}
                    </div>
                )}
            </div>
            {onClick && (
                <ChevronRight className="absolute right-3 bottom-3 text-muted-foreground/50 group-hover:text-primary transition-colors" size={16} />
            )}
        </div>
    );

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                    <p className="text-sm font-medium mb-2">{payload[0].payload.displayDate}</p>
                    {payload.map((entry, index) => (
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

    // Move Quality Icon
    const MoveQualityIcon = ({ type, size = 16 }: { type: string; size?: number }) => {
        const iconProps = { size, strokeWidth: 2 };
        switch (type) {
            case 'brilliant': return <Sparkles {...iconProps} className="text-[#26c9a2]" />;
            case 'best': return <Star {...iconProps} className="text-[#96c93d]" />;
            case 'good': return <Target {...iconProps} className="text-[#8bc34a]" />;
            case 'inaccuracies': return <AlertTriangle {...iconProps} className="text-[#f5c242]" />;
            case 'mistakes': return <AlertTriangle {...iconProps} className="text-[#e69138]" />;
            case 'blunders': return <Zap {...iconProps} className="text-[#e74c3c]" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Dashboard
                </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Your chess performance at a glance
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/games')}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Gamepad2 size={16} />
                        Sync Games
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                    <Activity size={16} />
                    {error}
                </div>
            )}

            {/* Streak Banner */}
            {dashboardData && dashboardData.streaks.current > 0 && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-4 animate-fade-in-up",
                    dashboardData.streaks.type === 'win'
                        ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30"
                        : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30"
                )}>
                    <div className={cn(
                        "p-3 rounded-full",
                        dashboardData.streaks.type === 'win' ? "bg-green-500/20" : "bg-red-500/20"
                    )}>
                        <Flame className={dashboardData.streaks.type === 'win' ? "text-green-500" : "text-red-500"} size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-lg">
                            {dashboardData.streaks.current} Game {dashboardData.streaks.type === 'win' ? 'Win' : 'Loss'} Streak!
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {dashboardData.streaks.type === 'win'
                                ? `You're on fire! Best streak: ${dashboardData.streaks.best} wins`
                                : "Time to bounce back! Analyze your recent games"}
                        </p>
                    </div>
                    {dashboardData.streaks.type === 'win' && (
                        <div className="hidden sm:flex items-center gap-1">
                            {[...Array(Math.min(dashboardData.streaks.current, 5))].map((_, i) => (
                                <Flame key={i} className="text-green-500 animate-pulse" size={20} style={{ animationDelay: `${i * 100}ms` }} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                    title="Total Games"
                    value={dashboardData?.stats.totalGames ?? 0}
                    icon={<Gamepad2 size={20} className="text-blue-500" />}
                    colorClass="bg-blue-500/10"
                    loading={loading}
                    onClick={() => navigate('/games')}
                />
                <StatCard
                    title="Win Rate"
                    value={`${dashboardData?.stats.winRate ?? 0}%`}
                    icon={<Trophy size={20} className="text-yellow-500" />}
                    colorClass="bg-yellow-500/10"
                    loading={loading}
                />
                <StatCard
                    title="Avg Accuracy"
                    value={`${dashboardData?.stats.averageAccuracy ?? 0}%`}
                    icon={<Target size={20} className="text-green-500" />}
                    colorClass="bg-green-500/10"
                    loading={loading}
                />
                <StatCard
                    title="Performance"
                    value={dashboardData?.stats.avgPerformanceRating || '—'}
                    icon={<Crown size={20} className="text-purple-500" />}
                    colorClass="bg-purple-500/10"
                    loading={loading}
                    subtext="Avg rating"
                />
                <StatCard
                    title="Brilliant"
                    value={dashboardData?.stats.totalBrilliant ?? 0}
                    icon={<Sparkles size={20} className="text-cyan-500" />}
                    colorClass="bg-cyan-500/10"
                    loading={loading}
                />
                <StatCard
                    title="Blunders"
                    value={dashboardData?.stats.totalBlunders ?? 0}
                    icon={<Zap size={20} className="text-red-500" />}
                    colorClass="bg-red-500/10"
                    loading={loading}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rating Chart - Spans 2 columns */}
                <div className="lg:col-span-2 bg-card rounded-xl border shadow-card p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp size={20} className="text-primary" />
                            Rating Progression
                        </h3>
                    </div>

                    <div className="h-[280px] w-full">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
                                <span className="text-muted-foreground">Loading chart...</span>
                            </div>
                        ) : ratings.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ratings} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis
                                        dataKey="displayDate"
                                        stroke="var(--muted-foreground)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={40}
                                    />
                                    <YAxis
                                        stroke="var(--muted-foreground)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={['auto', 'auto']}
                                        width={40}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="chessCom"
                                        name="Chess.com"
                                        stroke="#7fa650"
                                        strokeWidth={2}
                                        dot={{ r: 2, fill: '#7fa650' }}
                                        activeDot={{ r: 5 }}
                                        connectNulls
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="lichess"
                                        name="Lichess"
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                        dot={{ r: 2, fill: '#ffffff' }}
                                        activeDot={{ r: 5 }}
                                        connectNulls
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/5">
                                <BarChart3 className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">No rating data available</p>
                                <button
                                    onClick={() => navigate('/games')}
                                    className="mt-3 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                                >
                                    Sync your games
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Breakdown */}
                <div className="bg-card rounded-xl border shadow-card p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <PieChart size={20} className="text-primary" />
                        Results Breakdown
                    </h3>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="h-32 w-32 rounded-full bg-muted animate-pulse" />
                        </div>
                    ) : resultsPieData.length > 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <ResponsiveContainer width="100%" height={160}>
                                <RePieChart>
                                    <Pie
                                        data={resultsPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {resultsPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </RePieChart>
                            </ResponsiveContainer>
                            <div className="flex gap-4 mt-2">
                                {resultsPieData.map((entry) => (
                                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span>{entry.name}: <strong>{entry.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                            No games analyzed yet
                        </div>
                    )}
                </div>
            </div>

            {/* Move Quality & Accuracy Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Move Quality Breakdown */}
                <div className="bg-card rounded-xl border shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles size={20} className="text-primary" />
                        Move Quality Overview
                    </h3>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                            ))}
                        </div>
                    ) : dashboardData ? (
                        <div className="space-y-3">
                            {Object.entries(dashboardData.moveQuality).map(([type, count]) => {
                                const total = Object.values(dashboardData.moveQuality).reduce((a, b) => a + b, 0);
                                const percent = total > 0 ? (count / total) * 100 : 0;
                                return (
                                    <div key={type} className="group">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <MoveQualityIcon type={type} />
                                                <span className="text-sm capitalize">{type}</span>
                                            </div>
                                            <span className="text-sm font-medium">{count}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: MOVE_QUALITY_COLORS[type as keyof typeof MOVE_QUALITY_COLORS],
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>

                {/* Accuracy Trend */}
                <div className="bg-card rounded-xl border shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-primary" />
                        Recent Accuracy Trend
                    </h3>

                    <div className="h-[200px]">
                        {loading ? (
                            <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
                        ) : accuracyTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={accuracyTrendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis dataKey="game" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} width={30} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-card border border-border p-2 rounded-lg shadow-lg text-sm">
                                                        <p className="font-medium">{payload[0].payload.game}</p>
                                                        <p className="text-green-500">Accuracy: {payload[0].value}%</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="accuracy"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        fill="url(#accuracyGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                Play more games to see your trend
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Openings & Best/Worst Games */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Openings */}
                <div className="lg:col-span-2 bg-card rounded-xl border shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-primary" />
                        Opening Performance
                    </h3>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                            ))}
                        </div>
                    ) : dashboardData && dashboardData.openings.length > 0 ? (
                        <div className="space-y-2">
                            {/* Show known openings first, filter out "Unknown Opening" for display purposes */}
                            {dashboardData.openings
                                .filter(o => o.fullName !== 'Unknown Opening')
                                .slice(0, 5)
                                .map((opening, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" title={opening.fullName}>
                                            {opening.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {opening.games} game{opening.games !== 1 ? 's' : ''} • {opening.wins}W / {opening.losses}L / {opening.draws}D
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-bold px-2 py-1 rounded",
                                        opening.winRate >= 60 ? "bg-green-500/20 text-green-500" :
                                            opening.winRate >= 40 ? "bg-yellow-500/20 text-yellow-500" :
                                                "bg-red-500/20 text-red-500"
                                    )}>
                                        {opening.winRate}%
                                    </div>
                                </div>
                            ))}
                            {/* Show message if only unknown openings exist */}
                            {dashboardData.openings.filter(o => o.fullName !== 'Unknown Opening').length === 0 && (
                                <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Opening data not available for your games</p>
                                    <p className="text-xs mt-1 opacity-70">Re-sync games to detect openings</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>No opening data available</p>
                            <p className="text-xs mt-1 opacity-70">Analyze games to see your opening stats</p>
                        </div>
                    )}
                </div>

                {/* Best & Worst Games */}
                <div className="space-y-4">
                    {/* Best Game */}
                    <div
                        className={cn(
                            "bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20 p-5 cursor-pointer hover:border-green-500/40 transition-colors",
                            !dashboardData?.bestGame && "opacity-60 pointer-events-none"
                        )}
                        onClick={() => dashboardData?.bestGame && navigate(`/analysis/${dashboardData.bestGame.id}`)}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Crown className="text-green-500" size={20} />
                            <h4 className="font-semibold text-green-500">Best Game</h4>
                        </div>
                        {loading ? (
                            <div className="h-16 bg-muted animate-pulse rounded" />
                        ) : dashboardData?.bestGame ? (
                            <div>
                                <p className="text-2xl font-bold text-green-500">{dashboardData.bestGame.accuracy.toFixed(1)}%</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {dashboardData.bestGame.whitePlayer} vs {dashboardData.bestGame.blackPlayer}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                    {formatDistanceToNow(new Date(dashboardData.bestGame.playedAt), { addSuffix: true })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No games analyzed yet</p>
                        )}
                    </div>

                    {/* Worst Game */}
                    <div
                        className={cn(
                            "bg-gradient-to-br from-red-500/10 to-rose-500/5 rounded-xl border border-red-500/20 p-5 cursor-pointer hover:border-red-500/40 transition-colors",
                            !dashboardData?.worstGame && "opacity-60 pointer-events-none"
                        )}
                        onClick={() => dashboardData?.worstGame && navigate(`/analysis/${dashboardData.worstGame.id}`)}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Frown className="text-red-500" size={20} />
                            <h4 className="font-semibold text-red-500">Needs Review</h4>
                        </div>
                        {loading ? (
                            <div className="h-16 bg-muted animate-pulse rounded" />
                        ) : dashboardData?.worstGame ? (
                            <div>
                                <p className="text-2xl font-bold text-red-500">{dashboardData.worstGame.accuracy.toFixed(1)}%</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {dashboardData.worstGame.whitePlayer} vs {dashboardData.worstGame.blackPlayer}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                    {formatDistanceToNow(new Date(dashboardData.worstGame.playedAt), { addSuffix: true })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No games analyzed yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Study Suggestions & Recent Games */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Study Suggestions */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl border border-amber-500/20 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Lightbulb size={20} className="text-amber-500" />
                        Study Suggestions
                    </h3>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                            ))}
                        </div>
                    ) : dashboardData?.studySuggestions ? (
                        <ul className="space-y-3">
                            {dashboardData.studySuggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs flex-shrink-0 mt-0.5">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{suggestion}</p>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>

                {/* Recent Analyzed Games */}
                <div className="bg-card rounded-xl border shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        Recent Analysis
                    </h3>
                        <button
                            onClick={() => navigate('/analysis')}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            View all <ArrowUpRight size={12} />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                            ))
                        ) : recentGames.length > 0 ? (
                            recentGames.map((game) => (
                                <div
                                    key={game.id}
                                    className="group flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-all cursor-pointer"
                                    onClick={() => navigate(`/analysis/${game.id}`)}
                                >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-md",
                                                game.platform === 'chess.com' ? "bg-[#7fa650]/20 text-[#7fa650]" : "bg-white/10 text-white"
                                            )}>
                                            <Swords size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium flex items-center gap-2">
                                                {game.whitePlayer} <span className="text-muted-foreground text-xs">vs</span> {game.blackPlayer}
                                                </div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(game.playedAt), 'MMM d, h:mm a')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                        <div className="text-sm font-bold">{game.result}</div>
                                        <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Review <ArrowUpRight size={10} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Gamepad2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>No recent analyzed games</p>
                                <button
                                    onClick={() => navigate('/games')}
                                    className="mt-3 text-xs bg-primary/10 text-primary px-4 py-2 rounded-full hover:bg-primary/20 transition-colors"
                                >
                                    Analyze a Game
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Time Control Stats */}
            {dashboardData && dashboardData.timeControlStats.length > 0 && (
                <div className="bg-card rounded-xl border shadow-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-primary" />
                        Performance by Time Control
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {dashboardData.timeControlStats.slice(0, 6).map((tc, index) => (
                            <div
                                key={index}
                                className="bg-muted/30 rounded-lg p-4 text-center hover:bg-muted/50 transition-colors"
                            >
                                <p className="text-lg font-bold">{tc.name}</p>
                                <p className="text-sm text-muted-foreground">{tc.games} games</p>
                                <div className={cn(
                                    "text-sm font-medium mt-1",
                                    tc.winRate >= 55 ? "text-green-500" :
                                        tc.winRate >= 45 ? "text-yellow-500" : "text-red-500"
                                )}>
                                    {tc.winRate}% WR
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => navigate('/games')}
                    className="group bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20 p-5 text-left hover:border-blue-500/40 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/20 text-blue-500 group-hover:scale-110 transition-transform">
                            <Gamepad2 size={24} />
                        </div>
                        <div>
                            <h4 className="font-semibold">Sync Games</h4>
                            <p className="text-sm text-muted-foreground">Import from Chess.com or Lichess</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/analysis')}
                    className="group bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 p-5 text-left hover:border-purple-500/40 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-500 group-hover:scale-110 transition-transform">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h4 className="font-semibold">View Analysis</h4>
                            <p className="text-sm text-muted-foreground">Deep dive into your games</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/settings')}
                    className="group bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20 p-5 text-left hover:border-orange-500/40 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-orange-500/20 text-orange-500 group-hover:scale-110 transition-transform">
                            <Medal size={24} />
                        </div>
                        <div>
                            <h4 className="font-semibold">Connect Accounts</h4>
                            <p className="text-sm text-muted-foreground">Link your chess platforms</p>
                    </div>
                </div>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
