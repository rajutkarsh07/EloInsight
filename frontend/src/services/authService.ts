import { apiClient } from './apiClient';
import type { User } from '../types/api';

export const authService = {
    async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
        return apiClient.get<{ message: string; verified: boolean }>(`/auth/verify-email?token=${token}`);
    },

    async resendVerification(email: string): Promise<{ message: string }> {
        return apiClient.post<{ message: string }>('/auth/resend-verification', { email });
    },

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
