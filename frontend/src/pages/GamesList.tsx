import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RotateCw, Filter, X, Play, Loader2 } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

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
    pgn?: string;
    openingName?: string;
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

interface Filters {
    platform: string;
    result: string;
    timeControl: string;
    status: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const GamesList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [filters, setFilters] = useState<Filters>({
        platform: 'all',
        result: 'all',
        timeControl: 'all',
        status: 'all',
    });
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');
    const [analyzingGames, setAnalyzingGames] = useState<Set<string>>(new Set());
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Get all possible usernames for the current user
    const getUsernames = useCallback(() => {
        const usernames: string[] = [];
        if (user?.username) usernames.push(user.username.toLowerCase());
        if (user?.chessComUsername) usernames.push(user.chessComUsername.toLowerCase());
        if (user?.lichessUsername) usernames.push(user.lichessUsername.toLowerCase());
        return usernames;
    }, [user?.username, user?.chessComUsername, user?.lichessUsername]);

    // Format time control to standard chess notation (e.g., "3+2", "10+0")
    // Chess.com uses seconds (180+2), Lichess already uses minutes (3+2)
    const formatTimeControl = (timeControl: string): string => {
        if (!timeControl || timeControl === '-') return '-';
        
        const parts = timeControl.split('+');
        const baseValue = parseInt(parts[0], 10);
        const increment = parts[1] ? parseInt(parts[1], 10) : 0;
        
        // Handle invalid values
        if (isNaN(baseValue)) return '-';
        
        // If base value is large (>= 60), it's in seconds (Chess.com format)
        // Convert to minutes. Otherwise it's already in minutes (Lichess format)
        const minutes = baseValue >= 60 ? Math.floor(baseValue / 60) : baseValue;
        
        return `${minutes}+${increment}`;
    };

    // Determine if the user won, lost, or drew
    const getUserResult = useCallback((game: Game): 'win' | 'loss' | 'draw' => {
        const usernames = getUsernames();
        const isWhite = usernames.includes(game.whitePlayer.toLowerCase());
        const isBlack = usernames.includes(game.blackPlayer.toLowerCase());
        
        if (game.result === '1/2-1/2' || game.result === '½-½') return 'draw';
        
        if (isWhite) {
            return game.result === '1-0' ? 'win' : 'loss';
        } else if (isBlack) {
            return game.result === '0-1' ? 'win' : 'loss';
        }
        
        // Fallback: can't determine, show based on result
        return 'draw';
    }, [getUsernames]);

    // Get time control category (bullet, blitz, rapid, classical)
    const getTimeControlCategory = (timeControl: string): string => {
        if (!timeControl || timeControl === '-') return 'unknown';
        
        const parts = timeControl.split('+');
        const baseValue = parseInt(parts[0], 10);
        if (isNaN(baseValue)) return 'unknown';
        
        // Convert to minutes if needed
        const minutes = baseValue >= 60 ? Math.floor(baseValue / 60) : baseValue;
        const increment = parts[1] ? parseInt(parts[1], 10) : 0;
        const totalTime = minutes + (increment * 40 / 60); // Estimate total game time
        
        if (totalTime < 3) return 'bullet';
        if (totalTime < 10) return 'blitz';
        if (totalTime < 30) return 'rapid';
        return 'classical';
    };

    const fetchGames = useCallback(async (page: number, limit: number) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', limit.toString());
            if (filters.platform !== 'all') {
                params.set('platform', filters.platform);
            }
            const response = await apiClient.get<GamesResponse>(`/games?${params.toString()}`);
            setGames(response.data);
            setPagination(response.pagination);
        } catch (err) {
            setError('Failed to load games');
            console.error('Error fetching games:', err);
        } finally {
            setLoading(false);
        }
    }, [filters.platform]);

    useEffect(() => {
        fetchGames(1, pagination.limit); // Reset to page 1 when platform filter changes
    }, [fetchGames, pagination.limit]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchGames(newPage, pagination.limit);
        }
    };

    const handlePageSizeChange = (newLimit: number) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
        fetchGames(1, newLimit);
    };

    // Apply client-side filters
    const filteredGames = useMemo(() => {
        return games.filter(game => {
            // Result filter
            if (filters.result !== 'all') {
                const result = getUserResult(game);
                if (result !== filters.result) return false;
            }
            
            // Time control filter
            if (filters.timeControl !== 'all') {
                const category = getTimeControlCategory(game.timeControl);
                if (category !== filters.timeControl) return false;
            }
            
            // Status filter
            if (filters.status !== 'all') {
                if (game.analysisStatus !== filters.status) return false;
            }
            
            return true;
        });
    }, [games, filters, getUserResult]);

    const updateFilter = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            platform: 'all',
            result: 'all',
            timeControl: 'all',
            status: 'all',
        });
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

    const handleSync = async () => {
        try {
            setSyncing(true);
            await apiClient.post('/games/sync', { platform: 'chess.com' });
            // Refresh games after sync
            await fetchGames(pagination.page, pagination.limit);
        } catch (err) {
            setError('Failed to sync games');
            console.error('Error syncing games:', err);
        } finally {
            setSyncing(false);
        }
    };

    const handleAnalyze = async (game: Game) => {
        // Add to analyzing set
        setAnalyzingGames(prev => new Set(prev).add(game.id));
        setError('');

        try {
            // Step 1: Save game to database
            const saveResponse = await apiClient.post<{ id: string; alreadyExists: boolean }>('/games', {
                platform: game.platform,
                externalId: game.id,
                pgn: game.pgn || '',
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                result: game.result,
                timeControl: game.timeControl,
                playedAt: game.playedAt,
                openingName: game.openingName,
            });

            const gameId = saveResponse.id;

            // Step 2: Trigger analysis
            await apiClient.post(`/analysis/game/${gameId}`, {
                pgn: game.pgn || '',
                depth: 20,
                includeBookMoves: true,
            });

            // Update local game state to show completed
            setGames(prev => prev.map(g => 
                g.id === game.id 
                    ? { ...g, analysisStatus: 'completed', id: gameId }
                    : g
            ));

            // Navigate to analysis viewer
            navigate(`/analysis/${gameId}`);

        } catch (err) {
            console.error('Error analyzing game:', err);
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to analyze game. Please try again.');
            
            // Update local state to show failed
            setGames(prev => prev.map(g => 
                g.id === game.id 
                    ? { ...g, analysisStatus: 'failed' }
                    : g
            ));
        } finally {
            // Remove from analyzing set
            setAnalyzingGames(prev => {
                const next = new Set(prev);
                next.delete(game.id);
                return next;
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClass = "px-2.5 py-1 rounded text-xs font-medium";
        switch (status) {
            case 'completed': return <span className={cn(baseClass, "bg-emerald-500/20 text-emerald-400")}>Completed</span>;
            case 'processing': return <span className={cn(baseClass, "bg-amber-500/20 text-amber-400")}>Processing</span>;
            case 'pending': return <span className={cn(baseClass, "bg-zinc-500/20 text-zinc-400")}>Pending</span>;
            case 'failed': return <span className={cn(baseClass, "bg-red-500/20 text-red-400")}>Failed</span>;
            default: return <span className={cn(baseClass, "bg-zinc-500/20 text-zinc-400")}>{status}</span>;
        }
    };

    const getResultBadge = (game: Game) => {
        const result = getUserResult(game);
        const baseClass = "px-3 py-1 rounded text-xs font-bold uppercase tracking-wide";
        switch (result) {
            case 'win': return <span className={cn(baseClass, "bg-emerald-500/20 text-emerald-400")}>Win</span>;
            case 'loss': return <span className={cn(baseClass, "bg-red-500/20 text-red-400")}>Loss</span>;
            default: return <span className={cn(baseClass, "bg-zinc-500/20 text-zinc-400")}>Draw</span>;
        }
    };

    const getPlatformBadge = (platform: string) => {
        const baseClass = "px-2.5 py-1 rounded text-xs font-medium";
        if (platform === 'chess.com') {
            return <span className={cn(baseClass, "bg-emerald-500/20 text-emerald-400")}>chess.com</span>;
        }
        return <span className={cn(baseClass, "bg-violet-500/20 text-violet-400")}>lichess</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Games</h1>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 btn-glow"
                >
                    {syncing ? <RotateCw className="animate-spin h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
                    {syncing ? 'Syncing...' : 'Sync Games'}
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                </div>
            )}

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

                    {/* Result Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Result</label>
                        <select
                            value={filters.result}
                            onChange={(e) => updateFilter('result', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="win">Wins</option>
                            <option value="loss">Losses</option>
                            <option value="draw">Draws</option>
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

                    {/* Status Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => updateFilter('status', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Results count */}
                <div className="text-xs text-muted-foreground pt-1">
                    {hasActiveFilters && filters.platform === 'all'
                        ? `Showing ${filteredGames.length} of ${games.length} games (filtered from page)`
                        : `Total: ${pagination.total} games`
                    }
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Platform</th>
                                <th className="px-6 py-4">Players</th>
                                <th className="px-6 py-4">Result</th>
                                <th className="px-6 py-4">Control</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Accuracy</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <RotateCw className="animate-spin h-8 w-8 text-primary" />
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredGames.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                        {games.length === 0 
                                            ? 'No games found. Click "Sync Games" to import.'
                                            : 'No games match your filters.'
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredGames.map((game, i) => (
                                    <tr
                                        key={game.id}
                                        className="hover:bg-muted/50 transition-colors animate-fade-in"
                                        style={{ animationDelay: `${i * 0.05}s` }}
                                    >
                                        <td className="px-6 py-4">
                                            {getPlatformBadge(game.platform)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">⚪ {game.whitePlayer}</span>
                                                <span className="text-muted-foreground">⚫ {game.blackPlayer}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getResultBadge(game)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono">
                                            {formatTimeControl(game.timeControl)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                            {new Date(game.playedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {game.accuracy ? (
                                                <div className="flex flex-col text-xs">
                                                    <span>W: {game.accuracy.white}%</span>
                                                    <span>B: {game.accuracy.black}%</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(game.analysisStatus)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {game.analysisStatus === 'completed' ? (
                                                    <button
                                                        onClick={() => navigate(`/analysis/${game.id}`)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                                                        title="View Analysis"
                                                    >
                                                        <Eye size={16} />
                                                        View
                                                    </button>
                                                ) : analyzingGames.has(game.id) || game.analysisStatus === 'processing' ? (
                                                    <button
                                                        disabled
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/10 rounded-md cursor-not-allowed"
                                                    >
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Analyzing...
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAnalyze(game)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                                                        title="Analyze Game"
                                                    >
                                                        <Play size={16} />
                                                        Analyze
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t bg-muted/30">
                        {/* Page Size Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Show</span>
                            <select
                                value={pagination.limit}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                            <span className="text-sm text-muted-foreground">per page</span>
                        </div>

                        {/* Page Info & Navigation */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={pagination.page === 1}
                                    className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground text-sm font-medium"
                                    title="First page"
                                >
                                    «
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground text-sm font-medium"
                                    title="Previous page"
                                >
                                    ‹
                                </button>
                                
                                {/* Page Numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (pagination.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (pagination.page <= 3) {
                                            pageNum = i + 1;
                                        } else if (pagination.page >= pagination.totalPages - 2) {
                                            pageNum = pagination.totalPages - 4 + i;
                                        } else {
                                            pageNum = pagination.page - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={cn(
                                                    "w-8 h-8 rounded-md text-sm font-medium transition-colors",
                                                    pagination.page === pageNum
                                                        ? "bg-primary text-primary-foreground"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                )}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground text-sm font-medium"
                                    title="Next page"
                                >
                                    ›
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground text-sm font-medium"
                                    title="Last page"
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamesList;
