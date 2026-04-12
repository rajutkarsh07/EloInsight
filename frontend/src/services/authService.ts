import { apiClient } from './apiClient';
import type { User } from '../types/api';

export const authService = {
    async logout(): Promise<void> {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    async updateProfile(data: { chessComUsername?: string; lichessUsername?: string }): Promise<User> {
        const response = await apiClient.patch<User>('/users/profile', data);
        return response;
    },

    async getCurrentUser(): Promise<User> {
        return apiClient.get<User>('/users/me');
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem('accessToken');
    },

    getAccessToken(): string | null {
        return localStorage.getItem('accessToken');
    },
};
