import { apiClient } from './apiClient';
import type { Game, GameListResponse, Analysis } from '../types/api';

export const gamesService = {
    async getGames(params?: {
        page?: number;
        limit?: number;
        platform?: string;
        sortBy?: string;
        order?: 'asc' | 'desc';
    }): Promise<GameListResponse> {
        return apiClient.get<GameListResponse>('/games', { params });
    },

    async getGame(id: string): Promise<Game> {
        return apiClient.get<Game>(`/games/${id}`);
    },

    async syncGames(platform: 'chess.com' | 'lichess'): Promise<{ jobId: string; status: string }> {
        return apiClient.post('/games/sync', { platform });
    },

    async requestAnalysis(gameId: string, depth = 20): Promise<{ jobId: string; status: string }> {
        return apiClient.post(`/games/${gameId}/analyze`, { depth, priority: 'normal' });
    },

    async getAnalysis(gameId: string): Promise<Analysis> {
        return apiClient.get<Analysis>(`/analysis/${gameId}`);
    },
};
