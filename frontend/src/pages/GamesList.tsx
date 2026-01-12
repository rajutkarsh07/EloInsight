import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RotateCw, Filter } from 'lucide-react';
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
    const { user } = useAuth();
    const [platform, setPlatform] = useState('all');
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');

    // Get all possible usernames for the current user
    const getUsernames = () => {
        const usernames: string[] = [];
        if (user?.username) usernames.push(user.username.toLowerCase());
        if (user?.chessComUsername) usernames.push(user.chessComUsername.toLowerCase());
        if (user?.lichessUsername) usernames.push(user.lichessUsername.toLowerCase());
        return usernames;
    };

    // Format time control from seconds to standard chess notation (e.g., "180+2" -> "3+2")
    const formatTimeControl = (timeControl: string): string => {
        // Handle formats like "180+2", "600", "300+0"
        const parts = timeControl.split('+');
        const baseSeconds = parseInt(parts[0], 10);
        const increment = parts[1] ? parseInt(parts[1], 10) : 0;
        
        if (isNaN(baseSeconds)) return timeControl;
        
        const minutes = Math.floor(baseSeconds / 60);
        return `${minutes}+${increment}`;
    };

    // Determine if the user won, lost, or drew
    const getUserResult = (game: Game): 'win' | 'loss' | 'draw' => {
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
    };

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

            <div className="flex items-center gap-2 p-4 bg-card border rounded-lg shadow-sm">
                <Filter size={16} className="text-muted-foreground ml-1" />
                <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <option value="all">All Platforms</option>
                    <option value="chess.com">Chess.com</option>
                    <option value="lichess">Lichess</option>
                </select>
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
                            ) : games.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                        No games found. Click "Sync Games" to import.
                                    </td>
                                </tr>
                            ) : (
                                games.map((game, i) => (
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
                                            <button
                                                onClick={() => navigate(`/games/${game.id}/analysis`)}
                                                disabled={game.analysisStatus !== 'completed'}
                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                                                title="View Analysis"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GamesList;
