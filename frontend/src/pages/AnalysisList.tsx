import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Eye, RotateCw, Target, TrendingUp, CheckCircle2, Filter, X } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';

interface Filters {
    platform: string;
    timeControl: string;
    accuracy: string;
    dateRange: string;
}

// Get time control category
const getTimeControlCategory = (timeControl: string): string => {
    if (!timeControl || timeControl === '-') return 'unknown';
    const parts = timeControl.split('+');
    const baseValue = parseInt(parts[0], 10);
    if (isNaN(baseValue)) return 'unknown';
    const minutes = baseValue >= 60 ? Math.floor(baseValue / 60) : baseValue;
    const increment = parts[1] ? parseInt(parts[1], 10) : 0;
    const totalTime = minutes + (increment * 40 / 60);
    if (totalTime < 3) return 'bullet';
    if (totalTime < 10) return 'blitz';
    if (totalTime < 30) return 'rapid';
    return 'classical';
};

// Check if date is within range
const isWithinDateRange = (dateStr: string, range: string): boolean => {
    if (range === 'all') return true;
    const gameDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - gameDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    switch (range) {
        case 'day': return diffDays <= 1;
        case 'week': return diffDays <= 7;
        case 'month': return diffDays <= 30;
        case '6months': return diffDays <= 180;
        default: return true;
    }
};

interface AnalysisMetrics {
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
    performanceRatingWhite: number | null;
    performanceRatingBlack: number | null;
    analyzedAt: string;
}

interface AnalyzedGame {
    id: string;
    platform: string;
    whitePlayer: string;
    blackPlayer: string;
    result: string;
    timeControl: string;
    playedAt: string;
    openingName?: string;
    analysisStatus: string;
    analysis: AnalysisMetrics | null;
}

interface AnalyzedGamesResponse {
    data: AnalyzedGame[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const AnalysisList = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState<AnalyzedGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState<Filters>({
        platform: 'all',
        timeControl: 'all',
        accuracy: 'all',
        dateRange: 'all',
    });

    const fetchAnalyzedGames = useCallback(async (page: number, limit: number) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', limit.toString());
            const response = await apiClient.get<AnalyzedGamesResponse>(`/games/analyzed?${params.toString()}`);
            setGames(response.data);
            setPagination(response.pagination);
        } catch (err) {
            setError('Failed to load analyzed games');
            console.error('Error fetching analyzed games:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalyzedGames(1, pagination.limit);
    }, [fetchAnalyzedGames, pagination.limit]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchAnalyzedGames(newPage, pagination.limit);
        }
    };

    const updateFilter = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            platform: 'all',
            timeControl: 'all',
            accuracy: 'all',
            dateRange: 'all',
        });
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

    // Apply client-side filters
    const filteredGames = useMemo(() => {
        return games.filter(game => {
            // Platform filter
            if (filters.platform !== 'all') {
                if (game.platform !== filters.platform) return false;
            }
            
            // Time control filter
            if (filters.timeControl !== 'all') {
                const category = getTimeControlCategory(game.timeControl);
                if (category !== filters.timeControl) return false;
            }
            
            // Accuracy filter (uses max of white/black accuracy)
            if (filters.accuracy !== 'all' && game.analysis) {
                const maxAccuracy = Math.max(game.analysis.accuracyWhite, game.analysis.accuracyBlack);
                switch (filters.accuracy) {
                    case 'high': if (maxAccuracy < 80) return false; break;
                    case 'medium': if (maxAccuracy < 60 || maxAccuracy >= 80) return false; break;
                    case 'low': if (maxAccuracy >= 60) return false; break;
                }
            }
            
            // Date range filter
            if (filters.dateRange !== 'all') {
                if (!isWithinDateRange(game.playedAt, filters.dateRange)) return false;
            }
            
            return true;
        });
    }, [games, filters]);

    const getAccuracyColor = (accuracy: number): string => {
        if (accuracy >= 90) return 'text-emerald-400';
        if (accuracy >= 80) return 'text-green-400';
        if (accuracy >= 70) return 'text-yellow-400';
        if (accuracy >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    const getAccuracyBg = (accuracy: number): string => {
        if (accuracy >= 90) return 'bg-emerald-500/20';
        if (accuracy >= 80) return 'bg-green-500/20';
        if (accuracy >= 70) return 'bg-yellow-500/20';
        if (accuracy >= 60) return 'bg-orange-500/20';
        return 'bg-red-500/20';
    };

    const getPlatformBadge = (platform: string) => {
        const baseClass = "px-2.5 py-1 rounded text-xs font-medium";
        if (platform === 'chess.com') {
            return <span className={cn(baseClass, "bg-emerald-500/20 text-emerald-400")}>chess.com</span>;
        }
        return <span className={cn(baseClass, "bg-violet-500/20 text-violet-400")}>lichess</span>;
    };

    const getResultBadge = (result: string) => {
        const baseClass = "px-2.5 py-1 rounded text-xs font-bold";
        if (result === '1-0') return <span className={cn(baseClass, "bg-zinc-500/20 text-zinc-300")}>1-0</span>;
        if (result === '0-1') return <span className={cn(baseClass, "bg-zinc-500/20 text-zinc-300")}>0-1</span>;
        return <span className={cn(baseClass, "bg-zinc-500/20 text-zinc-400")}>Draw</span>;
    };

    const formatTimeControl = (tc: string): string => {
        if (!tc || tc === '-') return '-';
        const parts = tc.split('+');
        const baseValue = parseInt(parts[0], 10);
        if (isNaN(baseValue)) return '-';
        const minutes = baseValue >= 60 ? Math.floor(baseValue / 60) : baseValue;
        const increment = parts[1] ? parseInt(parts[1], 10) : 0;
        return `${minutes}+${increment}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
                        <p className="text-muted-foreground text-sm">View your analyzed games with detailed metrics</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            {!loading && games.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card border rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Target className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Games Analyzed</p>
                                <p className="text-2xl font-bold">{pagination.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
                                <p className="text-2xl font-bold">
                                    {(games.reduce((sum, g) => {
                                        const acc = g.analysis?.accuracyWhite || g.analysis?.accuracyBlack || 0;
                                        return sum + acc;
                                    }, 0) / games.length).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card border rounded-xl p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">This Page</p>
                                <p className="text-2xl font-bold">{games.length} games</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted-foreground" />
                        <span className="text-sm font-medium">Filters</span>
                        {hasActiveFilters && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                                {Object.values(filters).filter(v => v !== 'all').length} active
                            </span>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={14} />
                            Clear all
                        </button>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* Platform Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Platform</label>
                        <select
                            value={filters.platform}
                            onChange={(e) => updateFilter('platform', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="chess.com">Chess.com</option>
                            <option value="lichess">Lichess</option>
                        </select>
                    </div>

                    {/* Time Control Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Time Control</label>
                        <select
                            value={filters.timeControl}
                            onChange={(e) => updateFilter('timeControl', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="bullet">Bullet</option>
                            <option value="blitz">Blitz</option>
                            <option value="rapid">Rapid</option>
                            <option value="classical">Classical</option>
                        </select>
                    </div>

                    {/* Accuracy Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Accuracy</label>
                        <select
                            value={filters.accuracy}
                            onChange={(e) => updateFilter('accuracy', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="high">High (80%+)</option>
                            <option value="medium">Medium (60-80%)</option>
                            <option value="low">Low (&lt;60%)</option>
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Date</label>
                        <select
                            value={filters.dateRange}
                            onChange={(e) => updateFilter('dateRange', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All Time</option>
                            <option value="day">Last 24 Hours</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="6months">Last 6 Months</option>
                        </select>
                    </div>
                </div>

                {/* Results count */}
                <div className="text-xs text-muted-foreground pt-1">
                    {hasActiveFilters
                        ? `Showing ${filteredGames.length} of ${games.length} analyzed games`
                        : `Total: ${pagination.total} analyzed games`
                    }
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Game</th>
                                <th className="px-6 py-4">Result</th>
                                <th className="px-6 py-4 text-center">White Accuracy</th>
                                <th className="px-6 py-4 text-center">Black Accuracy</th>
                                <th className="px-6 py-4 text-center">Mistakes</th>
                                <th className="px-6 py-4">Analyzed</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <RotateCw className="animate-spin h-8 w-8 text-primary" />
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredGames.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                                            <div>
                                                <p className="text-muted-foreground">
                                                    {games.length === 0 ? 'No analyzed games yet' : 'No games match your filters'}
                                                </p>
                                                {games.length === 0 && (
                                                    <p className="text-sm text-muted-foreground/70">
                                                        Go to <button onClick={() => navigate('/games')} className="text-primary hover:underline">Games</button> and click "Analyze" on a game
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredGames.map((game, i) => (
                                    <tr
                                        key={game.id}
                                        className="bg-emerald-500/5 hover:bg-emerald-500/10 border-l-2 border-l-emerald-500 transition-colors cursor-pointer animate-fade-in"
                                        onClick={() => navigate(`/analysis/${game.id}`)}
                                        style={{ animationDelay: `${i * 0.05}s` }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                    {getPlatformBadge(game.platform)}
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {formatTimeControl(game.timeControl)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col text-sm">
                                                    <span>⚪ {game.whitePlayer}</span>
                                                    <span className="text-muted-foreground">⚫ {game.blackPlayer}</span>
                                                </div>
                                                {game.openingName && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {game.openingName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getResultBadge(game.result)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {game.analysis && (
                                                <div className="flex flex-col items-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-sm font-bold",
                                                        getAccuracyBg(game.analysis.accuracyWhite),
                                                        getAccuracyColor(game.analysis.accuracyWhite)
                                                    )}>
                                                        {game.analysis.accuracyWhite.toFixed(1)}%
                                                    </span>
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        ACPL: {game.analysis.acplWhite.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {game.analysis && (
                                                <div className="flex flex-col items-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-sm font-bold",
                                                        getAccuracyBg(game.analysis.accuracyBlack),
                                                        getAccuracyColor(game.analysis.accuracyBlack)
                                                    )}>
                                                        {game.analysis.accuracyBlack.toFixed(1)}%
                                                    </span>
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        ACPL: {game.analysis.acplBlack.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {game.analysis && (
                                                <div className="flex flex-col items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-red-400">⚪ {game.analysis.blundersWhite + game.analysis.mistakesWhite}</span>
                                                        <span className="text-red-400">⚫ {game.analysis.blundersBlack + game.analysis.mistakesBlack}</span>
                                                    </div>
                                                    <span className="text-muted-foreground">
                                                        ({game.analysis.blundersWhite + game.analysis.blundersBlack} blunders)
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-sm whitespace-nowrap">
                                            {game.analysis && new Date(game.analysis.analyzedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/analysis/${game.id}`);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-md transition-colors border border-emerald-500/30"
                                            >
                                                <Eye size={16} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                        <span className="text-sm text-muted-foreground">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={pagination.page === 1}
                                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 text-sm font-medium"
                            >
                                «
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 text-sm font-medium"
                            >
                                ‹
                            </button>
                            <span className="px-3 py-1 text-sm font-medium">{pagination.page}</span>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 text-sm font-medium"
                            >
                                ›
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.totalPages)}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 text-sm font-medium"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisList;

