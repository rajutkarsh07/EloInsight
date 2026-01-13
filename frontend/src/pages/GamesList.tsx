import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RotateCw, Filter, X, Play, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useGames } from '../contexts/GamesContext';

interface Game {
    id: string;
    dbId?: string; // Database UUID (separate from external ID)
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
    whiteElo?: number;
    blackElo?: number;
    termination?: string;
}

// Parse PGN headers to extract Elo ratings and termination reason
const parsePgnHeaders = (pgn: string | undefined): { whiteElo?: number; blackElo?: number; termination?: string } => {
    if (!pgn) return {};

    const whiteEloMatch = pgn.match(/\[WhiteElo\s+"(\d+)"\]/);
    const blackEloMatch = pgn.match(/\[BlackElo\s+"(\d+)"\]/);
    const terminationMatch = pgn.match(/\[Termination\s+"([^"]+)"\]/);

    return {
        whiteElo: whiteEloMatch ? parseInt(whiteEloMatch[1], 10) : undefined,
        blackElo: blackEloMatch ? parseInt(blackEloMatch[1], 10) : undefined,
        termination: terminationMatch ? terminationMatch[1] : undefined,
    };
};

// Extract the termination reason (e.g., "resignation", "checkmate", "timeout")
const getTerminationReason = (termination: string | undefined): string => {
    if (!termination) return '-';

    const lower = termination.toLowerCase();

    if (lower.includes('checkmate')) return 'Checkmate';
    if (lower.includes('resignation') || lower.includes('resigned')) return 'Resignation';
    if (lower.includes('timeout') || lower.includes('time')) return 'Timeout';
    if (lower.includes('abandoned')) return 'Abandoned';
    if (lower.includes('stalemate')) return 'Stalemate';
    if (lower.includes('repetition')) return 'Repetition';
    if (lower.includes('insufficient')) return 'Insufficient';
    if (lower.includes('agreement') || lower.includes('agreed')) return 'Agreement';
    if (lower.includes('50') || lower.includes('fifty')) return '50-move rule';

    // Try to extract the key word after "won by" or "drawn by"
    const wonByMatch = lower.match(/won by (\w+)/);
    if (wonByMatch) {
        return wonByMatch[1].charAt(0).toUpperCase() + wonByMatch[1].slice(1);
    }

    return termination.length > 20 ? termination.slice(0, 20) + '...' : termination;
};

interface Filters {
    platform: string;
    result: string;
    timeControl: string;
    wonBy: string;
    analyzed: string;
    dateRange: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Helper to get termination category for filtering
const getTerminationCategory = (termination: string | undefined): string => {
    if (!termination) return 'unknown';
    const lower = termination.toLowerCase();

    if (lower.includes('checkmate')) return 'checkmate';
    if (lower.includes('resignation') || lower.includes('resigned')) return 'resignation';
    if (lower.includes('timeout') || lower.includes('time')) return 'timeout';
    if (lower.includes('abandoned')) return 'abandoned';
    if (lower.includes('stalemate')) return 'stalemate';
    if (lower.includes('repetition')) return 'repetition';
    if (lower.includes('insufficient')) return 'insufficient';
    if (lower.includes('agreement') || lower.includes('agreed')) return 'agreement';

    return 'other';
};

// Helper to check if date is within range
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

const GamesList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        games,
        pagination,
        loading,
        error: contextError,
        syncing,
        hasFetched,
        fetchGames,
        syncGames,
        updateGame
    } = useGames();

    const [filters, setFilters] = useState<Filters>({
        platform: 'all',
        result: 'all',
        timeControl: 'all',
        wonBy: 'all',
        analyzed: 'all',
        dateRange: 'all',
    });
    const [localError, setLocalError] = useState('');
    const [analyzingGames, setAnalyzingGames] = useState<Set<string>>(new Set());

    const MAX_CONCURRENT_ANALYSES = 3;

    const error = localError || contextError;

    // Count currently processing games (from both local state and game status)
    const getProcessingCount = useCallback(() => {
        const processingFromGames = games.filter(g => g.analysisStatus?.toLowerCase() === 'processing').length;
        const processingFromLocal = analyzingGames.size;
        // Avoid double-counting by using the max
        return Math.max(processingFromGames, processingFromLocal);
    }, [games, analyzingGames]);

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

    // Fetch games only if not already fetched (cache check)
    useEffect(() => {
        if (!hasFetched) {
            const platform = filters.platform !== 'all' ? filters.platform : undefined;
            fetchGames(1, pagination.limit, platform);
        }
    }, [hasFetched, fetchGames, filters.platform, pagination.limit]);

    // Handle platform filter change - this needs to refetch from server
    const handlePlatformChange = (platform: string) => {
        setFilters(prev => ({ ...prev, platform }));
        const platformValue = platform !== 'all' ? platform : undefined;
        fetchGames(1, pagination.limit, platformValue, true); // Force refresh for platform change
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            const platform = filters.platform !== 'all' ? filters.platform : undefined;
            fetchGames(newPage, pagination.limit, platform);
        }
    };

    const handlePageSizeChange = (newLimit: number) => {
        const platform = filters.platform !== 'all' ? filters.platform : undefined;
        fetchGames(1, newLimit, platform, true);
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

            // Won By filter
            if (filters.wonBy !== 'all') {
                const pgnData = parsePgnHeaders(game.pgn);
                const termination = game.termination || pgnData.termination;
                const category = getTerminationCategory(termination);
                if (category !== filters.wonBy) return false;
            }

            // Analyzed filter
            if (filters.analyzed !== 'all') {
                const isAnalyzed = game.analysisStatus?.toLowerCase() === 'completed';
                if (filters.analyzed === 'yes' && !isAnalyzed) return false;
                if (filters.analyzed === 'no' && isAnalyzed) return false;
            }

            // Date range filter
            if (filters.dateRange !== 'all') {
                if (!isWithinDateRange(game.playedAt, filters.dateRange)) return false;
            }

            return true;
        });
    }, [games, filters, getUserResult]);

    const updateFilter = (key: keyof Filters, value: string) => {
        if (key === 'platform') {
            handlePlatformChange(value);
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const clearFilters = () => {
        setFilters({
            platform: 'all',
            result: 'all',
            timeControl: 'all',
            wonBy: 'all',
            analyzed: 'all',
            dateRange: 'all',
        });
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== 'all');

    const handleSync = async () => {
        setLocalError('');
        await syncGames();
    };

    const handleAnalyze = async (game: Game) => {
        // If analysis already exists, navigate directly to the analysis page
        if (game.analysisStatus?.toLowerCase() === 'completed') {
            navigate(`/analysis/${game.dbId || game.id}`);
            return;
        }

        // Log the PGN for debugging
        console.log('=== ANALYZING GAME ===');
        console.log('Game ID:', game.id);
        console.log('Players:', game.whitePlayer, 'vs', game.blackPlayer);
        console.log('PGN:', game.pgn);
        console.log('======================');

        // Check concurrent analysis limit
        const currentProcessing = getProcessingCount();
        if (currentProcessing >= MAX_CONCURRENT_ANALYSES) {
            toast.warning(
                `⏳ Analysis limit reached`,
                {
                    description: `Please wait for one of the ${MAX_CONCURRENT_ANALYSES} ongoing analyses to complete before starting another.`,
                    duration: 5000,
                }
            );
            return;
        }

        // Add to analyzing set
        setAnalyzingGames(prev => new Set(prev).add(game.id));
        setLocalError('');

        try {
            // Step 1: Save game to database
            const saveResponse = await apiClient.post<{ id: string; analysisStatus?: string }>('/games', {
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

            // If analysis already exists for this game, navigate directly
            if (saveResponse.analysisStatus === 'COMPLETED' || saveResponse.analysisStatus === 'completed') {
                navigate(`/analysis/${gameId}`);
                return;
            }

            // Step 2: Trigger analysis as "fire and forget" - don't await
            // Use fetch directly to avoid axios cancelation on component unmount
            const externalId = game.id; // Store original ID for callback

            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/analysis/game/${gameId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({
                    pgn: game.pgn || '',
                    depth: 20,
                    includeBookMoves: true,
                }),
            }).then(async (response) => {
                if (response.ok) {
                    console.log(`Analysis completed for game ${gameId}`);
                    // Update game status when done (store dbId, don't overwrite external id)
                    updateGame(externalId, { analysisStatus: 'completed', dbId: gameId } as any);
                    toast.success('✅ Analysis complete!', {
                        description: `${game.whitePlayer} vs ${game.blackPlayer}`,
                        duration: 4000,
                    });
                } else {
                    console.error('Analysis failed with status:', response.status);
                    updateGame(externalId, { analysisStatus: 'failed' });
                    toast.error('❌ Analysis failed', {
                        description: 'Please try again later.',
                        duration: 4000,
                    });
                }
            }).catch(err => {
                console.error('Analysis error:', err);
                updateGame(externalId, { analysisStatus: 'failed' });
                toast.error('❌ Analysis failed', {
                    description: err.message || 'An error occurred.',
                    duration: 4000,
                });
            });

            // Update game in context cache to show processing (don't overwrite ID!)
            updateGame(game.id, { analysisStatus: 'processing', dbId: gameId } as any);

            // Show toast that analysis started
            toast.info('🔄 Analysis started', {
                description: `${game.whitePlayer} vs ${game.blackPlayer} - You can navigate away.`,
                duration: 3000,
            });

            // Remove from local analyzing set (the status will show from game.analysisStatus)
            setAnalyzingGames(prev => {
                const next = new Set(prev);
                next.delete(game.id);
                return next;
            });

            // Show feedback to user
            setLocalError(''); // Clear any previous errors

        } catch (err) {
            console.error('Error saving game:', err);
            const error = err as { response?: { data?: { message?: string } } };
            setLocalError(error.response?.data?.message || 'Failed to start analysis. Please try again.');

            // Remove from analyzing set
            setAnalyzingGames(prev => {
                const next = new Set(prev);
                next.delete(game.id);
                return next;
            });
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

                    {/* Won By Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Won By</label>
                        <select
                            value={filters.wonBy}
                            onChange={(e) => updateFilter('wonBy', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="checkmate">Checkmate</option>
                            <option value="resignation">Resignation</option>
                            <option value="timeout">Timeout</option>
                            <option value="abandoned">Abandoned</option>
                            <option value="stalemate">Stalemate</option>
                            <option value="repetition">Repetition</option>
                            <option value="agreement">Agreement</option>
                            <option value="insufficient">Insufficient</option>
                        </select>
                    </div>

                    {/* Analyzed Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Analyzed</label>
                        <select
                            value={filters.analyzed}
                            onChange={(e) => updateFilter('analyzed', e.target.value)}
                            className="h-9 w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="all">All</option>
                            <option value="yes">Analyzed</option>
                            <option value="no">Not Analyzed</option>
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
                                <th className="px-6 py-4">Won By</th>
                                <th className="px-6 py-4">Control</th>
                                <th className="px-6 py-4">Date</th>
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        {games.length === 0
                                            ? 'No games found. Click "Sync Games" to import.'
                                            : 'No games match your filters.'
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredGames.map((game, i) => {
                                    const isAnalyzed = game.analysisStatus?.toLowerCase() === 'completed';
                                    const pgnData = parsePgnHeaders(game.pgn);
                                    const whiteElo = game.whiteElo || pgnData.whiteElo;
                                    const blackElo = game.blackElo || pgnData.blackElo;
                                    const termination = game.termination || pgnData.termination;

                                    return (
                                        <tr
                                            key={game.id}
                                            className={cn(
                                                "transition-colors animate-fade-in",
                                                isAnalyzed
                                                    ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-2 border-l-emerald-500"
                                                    : "hover:bg-muted/50"
                                            )}
                                            style={{ animationDelay: `${i * 0.05}s` }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {isAnalyzed && (
                                                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                    )}
                                                    {getPlatformBadge(game.platform)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        ⚪ {game.whitePlayer}
                                                        {whiteElo && <span className="text-muted-foreground text-xs ml-1">({whiteElo})</span>}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        ⚫ {game.blackPlayer}
                                                        {blackElo && <span className="text-xs ml-1">({blackElo})</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getResultBadge(game)}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground text-sm">
                                                {getTerminationReason(termination)}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground font-mono">
                                                {formatTimeControl(game.timeControl)}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                                {new Date(game.playedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isAnalyzed ? (
                                                        <button
                                                            onClick={() => navigate(`/analysis/${game.dbId || game.id}`)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-md transition-colors border border-emerald-500/30"
                                                            title="View Analysis"
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </button>
                                                    ) : analyzingGames.has(game.id) || game.analysisStatus?.toLowerCase() === 'processing' ? (
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
                                    );
                                })
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
