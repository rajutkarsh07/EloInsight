import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RotateCw, Filter } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';

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
    const [platform, setPlatform] = useState('all');
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');

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
        const baseClass = "px-2 py-0.5 rounded-full text-xs font-medium";
        switch (status) {
            case 'completed': return <span className={cn(baseClass, "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>Completed</span>;
            case 'processing': return <span className={cn(baseClass, "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400")}>Processing</span>;
            case 'pending': return <span className={cn(baseClass, "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400")}>Pending</span>;
            case 'failed': return <span className={cn(baseClass, "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>Failed</span>;
            default: return <span className={cn(baseClass, "bg-gray-100 text-gray-700")}>{status}</span>;
        }
    };

    const getResultBadge = (result: string) => {
        const baseClass = "px-2 py-0.5 rounded-full text-xs font-medium border";
        switch (result) {
            case '1-0': return <span className={cn(baseClass, "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400")}>1-0</span>;
            case '0-1': return <span className={cn(baseClass, "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400")}>0-1</span>;
            default: return <span className={cn(baseClass, "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400")}>½-½</span>;
        }
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
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-xs font-medium border",
                                                game.platform === 'chess.com'
                                                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-800"
                                                    : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                            )}>
                                                {game.platform}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">⚪ {game.whitePlayer}</span>
                                                <span className="text-muted-foreground">⚫ {game.blackPlayer}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getResultBadge(game.result)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {game.timeControl}
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
