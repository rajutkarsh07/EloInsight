import { apiClient } from './apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api';

export const authService = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

        // Store tokens
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);

        return response;
    },

    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/register', data);

        // Store tokens
        localStorage.setItem('accessToken', response.tokens.accessToken);
        localStorage.setItem('refreshToken', response.tokens.refreshToken);

        return response;
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
