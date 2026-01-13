import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

interface Game {
    id: string;
    dbId?: string; // Database UUID (separate from external ID)
    externalId?: string; // Original external ID (URL) - preserved for API calls
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

interface GamesResponse {
    data: Game[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface GamesCache {
    [key: string]: {
        games: Game[];
        pagination: Pagination;
        timestamp: number;
    };
}

interface GamesContextType {
    games: Game[];
    pagination: Pagination;
    loading: boolean;
    error: string;
    syncing: boolean;
    hasFetched: boolean;
    fetchGames: (page: number, limit: number, platform?: string, forceRefresh?: boolean, analyzed?: string) => Promise<void>;
    syncGames: () => Promise<void>;
    updateGame: (gameId: string, updates: Partial<Game>) => void;
    clearCache: () => void;
}

const defaultPagination: Pagination = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
};

const GamesContext = createContext<GamesContextType | undefined>(undefined);

export const GamesProvider = ({ children }: { children: ReactNode }) => {
    const [cache, setCache] = useState<GamesCache>({});
    const [currentGames, setCurrentGames] = useState<Game[]>([]);
    const [pagination, setPagination] = useState<Pagination>(defaultPagination);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    // Generate cache key based on query params
    const getCacheKey = (page: number, limit: number, platform?: string, analyzed?: string) => {
        return `${page}-${limit}-${platform || 'all'}-${analyzed || 'all'}`;
    };

    const fetchGames = useCallback(async (
        page: number,
        limit: number,
        platform?: string,
        forceRefresh = false,
        analyzed?: string
    ) => {
        const cacheKey = getCacheKey(page, limit, platform, analyzed);

        // Return cached data if available and not forcing refresh
        if (!forceRefresh && cache[cacheKey] && hasFetched) {
            setCurrentGames(cache[cacheKey].games);
            setPagination(cache[cacheKey].pagination);
            return;
        }

        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', limit.toString());
            if (platform && platform !== 'all') {
                params.set('platform', platform);
            }

            // Use different endpoint for analyzed games filter
            let endpoint = '/games';
            if (analyzed === 'yes') {
                endpoint = '/games/analyzed';
            } else if (analyzed === 'no') {
                params.set('analyzed', 'no');
            }

            const response = await apiClient.get<GamesResponse>(`${endpoint}?${params.toString()}`);

            // Update cache
            setCache(prev => ({
                ...prev,
                [cacheKey]: {
                    games: response.data,
                    pagination: response.pagination,
                    timestamp: Date.now(),
                },
            }));

            setCurrentGames(response.data);
            setPagination(response.pagination);
            setHasFetched(true);
        } catch (err) {
            setError('Failed to load games');
            console.error('Error fetching games:', err);
        } finally {
            setLoading(false);
        }
    }, [cache, hasFetched]);

    const syncGames = useCallback(async () => {
        try {
            setSyncing(true);
            setError('');
            await apiClient.post('/games/sync', { platform: 'chess.com' });

            // Clear cache and refetch
            setCache({});
            setHasFetched(false);

            // Refetch current page with force refresh
            const params = new URLSearchParams();
            params.set('page', pagination.page.toString());
            params.set('limit', pagination.limit.toString());

            const response = await apiClient.get<GamesResponse>(`/games?${params.toString()}`);

            const cacheKey = getCacheKey(pagination.page, pagination.limit);
            setCache({
                [cacheKey]: {
                    games: response.data,
                    pagination: response.pagination,
                    timestamp: Date.now(),
                },
            });

            setCurrentGames(response.data);
            setPagination(response.pagination);
            setHasFetched(true);
        } catch (err) {
            setError('Failed to sync games');
            console.error('Error syncing games:', err);
        } finally {
            setSyncing(false);
        }
    }, [pagination.page, pagination.limit]);

    const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
        setCurrentGames(prev =>
            prev.map(g => g.id === gameId ? { ...g, ...updates } : g)
        );

        // Also update cache
        setCache(prev => {
            const newCache = { ...prev };
            Object.keys(newCache).forEach(key => {
                newCache[key] = {
                    ...newCache[key],
                    games: newCache[key].games.map(g =>
                        g.id === gameId ? { ...g, ...updates } : g
                    ),
                };
            });
            return newCache;
        });
    }, []);

    const clearCache = useCallback(() => {
        setCache({});
        setHasFetched(false);
    }, []);

    return (
        <GamesContext.Provider
            value={{
                games: currentGames,
                pagination,
                loading,
                error,
                syncing,
                hasFetched,
                fetchGames,
                syncGames,
                updateGame,
                clearCache,
            }}
        >
            {children}
        </GamesContext.Provider>
    );
};

export const useGames = () => {
    const context = useContext(GamesContext);
    if (context === undefined) {
        throw new Error('useGames must be used within a GamesProvider');
    }
    return context;
};

