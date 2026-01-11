import { apiClient } from './apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api';

interface RegisterResponse {
    message: string;
    user: {
        id: string;
        email: string;
        username: string;
        isVerified: boolean;
    };
}

export const authService = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

        // Store tokens
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);

        return response;
    },

    async register(data: RegisterRequest): Promise<RegisterResponse> {
        const response = await apiClient.post<RegisterResponse>('/auth/register', data);
        return response;
    },

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
