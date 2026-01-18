import axios from 'axios';
import type {
  User,
  Game,
  Analysis,
  SyncJob,
  AnalysisJob,
  LinkedAccount,
  UserStatistics,
  OpeningStatistics,
  PaginatedResponse,
  DashboardStats,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/admin/auth/login', { email, password });
    return data;
  },
  verify: async () => {
    const { data } = await api.get('/admin/auth/verify');
    return data;
  },
};

// Dashboard
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/admin/dashboard/stats');
    return data;
  },
  getRecentActivity: async () => {
    const { data } = await api.get('/admin/dashboard/activity');
    return data;
  },
};

// Users
export const usersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<User>> => {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },
  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
  },
  create: async (userData: Partial<User>): Promise<User> => {
    const { data } = await api.post('/admin/users', userData);
    return data;
  },
  update: async (id: string, userData: Partial<User>): Promise<User> => {
    const { data } = await api.patch(`/admin/users/${id}`, userData);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
  softDelete: async (id: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/soft-delete`);
  },
  restore: async (id: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/restore`);
  },
};

// Games
export const gamesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    platform?: string;
    analysisStatus?: string;
  }): Promise<PaginatedResponse<Game>> => {
    const { data } = await api.get('/admin/games', { params });
    return data;
  },
  getById: async (id: string): Promise<Game> => {
    const { data } = await api.get(`/admin/games/${id}`);
    return data;
  },
  update: async (id: string, gameData: Partial<Game>): Promise<Game> => {
    const { data } = await api.patch(`/admin/games/${id}`, gameData);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/games/${id}`);
  },
  requeueAnalysis: async (id: string): Promise<void> => {
    await api.post(`/admin/games/${id}/requeue-analysis`);
  },
};

// Analysis
export const analysisApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    gameId?: string;
  }): Promise<PaginatedResponse<Analysis>> => {
    const { data } = await api.get('/admin/analysis', { params });
    return data;
  },
  getById: async (id: string): Promise<Analysis> => {
    const { data } = await api.get(`/admin/analysis/${id}`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/analysis/${id}`);
  },
};

// Linked Accounts
export const linkedAccountsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    platform?: string;
  }): Promise<PaginatedResponse<LinkedAccount>> => {
    const { data } = await api.get('/admin/linked-accounts', { params });
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/linked-accounts/${id}`);
  },
  toggleSync: async (id: string, enabled: boolean): Promise<void> => {
    await api.patch(`/admin/linked-accounts/${id}`, { syncEnabled: enabled });
  },
};

// Sync Jobs
export const syncJobsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: string;
  }): Promise<PaginatedResponse<SyncJob>> => {
    const { data } = await api.get('/admin/sync-jobs', { params });
    return data;
  },
  getById: async (id: string): Promise<SyncJob> => {
    const { data } = await api.get(`/admin/sync-jobs/${id}`);
    return data;
  },
  cancel: async (id: string): Promise<void> => {
    await api.post(`/admin/sync-jobs/${id}/cancel`);
  },
  retry: async (id: string): Promise<void> => {
    await api.post(`/admin/sync-jobs/${id}/retry`);
  },
};

// Analysis Jobs
export const analysisJobsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: string;
  }): Promise<PaginatedResponse<AnalysisJob>> => {
    const { data } = await api.get('/admin/analysis-jobs', { params });
    return data;
  },
  getById: async (id: string): Promise<AnalysisJob> => {
    const { data } = await api.get(`/admin/analysis-jobs/${id}`);
    return data;
  },
  cancel: async (id: string): Promise<void> => {
    await api.post(`/admin/analysis-jobs/${id}/cancel`);
  },
  retry: async (id: string): Promise<void> => {
    await api.post(`/admin/analysis-jobs/${id}/retry`);
  },
  updatePriority: async (id: string, priority: number): Promise<void> => {
    await api.patch(`/admin/analysis-jobs/${id}`, { priority });
  },
};

// Statistics
export const statisticsApi = {
  getUserStats: async (userId: string): Promise<UserStatistics[]> => {
    const { data } = await api.get(`/admin/statistics/users/${userId}`);
    return data;
  },
  getOpeningStats: async (userId: string): Promise<OpeningStatistics[]> => {
    const { data } = await api.get(`/admin/statistics/openings/${userId}`);
    return data;
  },
  recalculate: async (userId: string): Promise<void> => {
    await api.post(`/admin/statistics/recalculate/${userId}`);
  },
};

