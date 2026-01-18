import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==================== DASHBOARD ====================

  async getDashboardStats() {
    const [
      totalUsers,
      totalGames,
      totalAnalyses,
      pendingJobs,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.game.count(),
      this.prisma.analysis.count(),
      this.prisma.analysisJob.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          isActive: true,
          games: { some: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        },
      }),
    ]);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [gamesThisWeek, analysesThisWeek] = await Promise.all([
      this.prisma.game.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.analysis.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

    return {
      totalUsers,
      totalGames,
      totalAnalyses,
      pendingJobs,
      activeUsers,
      gamesThisWeek,
      analysesThisWeek,
    };
  }

  async getRecentActivity() {
    const [recentUsers, recentGames, recentAnalyses] = await Promise.all([
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, createdAt: true },
      }),
      this.prisma.game.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, whitePlayer: true, blackPlayer: true, createdAt: true },
      }),
      this.prisma.analysis.findMany({
        take: 5,
        orderBy: { analyzedAt: 'desc' },
        select: { id: true, gameId: true, analyzedAt: true },
      }),
    ]);

    const activity = [
      ...recentUsers.map((u) => ({
        type: 'user',
        message: `New user: ${u.username}`,
        timestamp: u.createdAt,
      })),
      ...recentGames.map((g) => ({
        type: 'game',
        message: `Game: ${g.whitePlayer} vs ${g.blackPlayer}`,
        timestamp: g.createdAt,
      })),
      ...recentAnalyses.map((a) => ({
        type: 'analysis',
        message: `Analysis completed for game ${a.gameId.slice(0, 8)}...`,
        timestamp: a.analyzedAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activity.slice(0, 10);
  }

  // ==================== USERS ====================

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 10, search, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          settings: true,
          _count: {
            select: {
              games: true,
              linkedAccounts: true,
              analysisJobs: true,
              syncJobs: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        settings: true,
        linkedAccounts: true,
        _count: {
          select: {
            games: true,
            linkedAccounts: true,
            analysisJobs: true,
            syncJobs: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    emailVerified?: boolean;
  }) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or username already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        emailVerified: data.emailVerified || false,
        settings: {
          create: {},
        },
        profile: {
          create: {},
        },
      },
      include: {
        profile: true,
        settings: true,
      },
    });
  }

  async updateUser(id: string, data: Partial<{
    username: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
  }>) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        profile: true,
        settings: true,
        _count: {
          select: {
            games: true,
            linkedAccounts: true,
          },
        },
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async softDeleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async restoreUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });
  }

  // ==================== GAMES ====================

  async getGames(params: {
    page?: number;
    limit?: number;
    userId?: string;
    platform?: string;
    analysisStatus?: string;
  }) {
    const { page = 1, limit = 10, userId, platform, analysisStatus } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (platform) where.platform = platform;
    if (analysisStatus) where.analysisStatus = analysisStatus;

    const [data, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        skip,
        take: limit,
        orderBy: { playedAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          analysis: true,
          _count: {
            select: { moves: true, analysisJobs: true },
          },
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGameById(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        analysis: true,
        moves: {
          orderBy: { halfMove: 'asc' },
          include: { evaluation: true },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async updateGame(id: string, data: Partial<{
    openingEco: string;
    openingName: string;
    analysisStatus: string;
  }>) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.prisma.game.update({
      where: { id },
      data: data as any,
    });
  }

  async deleteGame(id: string) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    await this.prisma.game.delete({ where: { id } });
    return { success: true };
  }

  async requeueGameAnalysis(id: string) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    await this.prisma.$transaction([
      this.prisma.analysis.deleteMany({ where: { gameId: id } }),
      this.prisma.game.update({
        where: { id },
        data: { analysisStatus: 'PENDING', analysisRequestedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  // ==================== ANALYSIS ====================

  async getAnalyses(params: {
    page?: number;
    limit?: number;
    gameId?: string;
  }) {
    const { page = 1, limit = 10, gameId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (gameId) where.gameId = gameId;

    const [data, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where,
        skip,
        take: limit,
        orderBy: { analyzedAt: 'desc' },
        include: {
          game: {
            select: {
              id: true,
              whitePlayer: true,
              blackPlayer: true,
              result: true,
            },
          },
        },
      }),
      this.prisma.analysis.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnalysisById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: {
        game: true,
        positionAnalyses: {
          orderBy: { halfMove: 'asc' },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return analysis;
  }

  async deleteAnalysis(id: string) {
    const analysis = await this.prisma.analysis.findUnique({ where: { id } });
    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    await this.prisma.$transaction([
      this.prisma.analysis.delete({ where: { id } }),
      this.prisma.game.update({
        where: { id: analysis.gameId },
        data: { analysisStatus: 'PENDING' },
      }),
    ]);

    return { success: true };
  }

  // ==================== LINKED ACCOUNTS ====================

  async getLinkedAccounts(params: {
    page?: number;
    limit?: number;
    userId?: string;
    platform?: string;
  }) {
    const { page = 1, limit = 10, userId, platform } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (platform) where.platform = platform;

    const [data, total] = await Promise.all([
      this.prisma.linkedAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { linkedAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      }),
      this.prisma.linkedAccount.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateLinkedAccount(id: string, data: { syncEnabled?: boolean }) {
    const account = await this.prisma.linkedAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Linked account not found');
    }

    return this.prisma.linkedAccount.update({
      where: { id },
      data,
    });
  }

  async deleteLinkedAccount(id: string) {
    const account = await this.prisma.linkedAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Linked account not found');
    }

    await this.prisma.linkedAccount.delete({ where: { id } });
    return { success: true };
  }

  // ==================== SYNC JOBS ====================

  async getSyncJobs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, userId, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.syncJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          linkedAccount: {
            select: { id: true, platform: true, platformUsername: true },
          },
        },
      }),
      this.prisma.syncJob.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSyncJobById(id: string) {
    const job = await this.prisma.syncJob.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        linkedAccount: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Sync job not found');
    }

    return job;
  }

  async cancelSyncJob(id: string) {
    const job = await this.prisma.syncJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Sync job not found');
    }

    if (!['QUEUED', 'RUNNING'].includes(job.status)) {
      throw new BadRequestException('Can only cancel queued or running jobs');
    }

    return this.prisma.syncJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async retrySyncJob(id: string) {
    const job = await this.prisma.syncJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Sync job not found');
    }

    if (job.status !== 'FAILED') {
      throw new BadRequestException('Can only retry failed jobs');
    }

    return this.prisma.syncJob.update({
      where: { id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });
  }

  // ==================== ANALYSIS JOBS ====================

  async getAnalysisJobs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, userId, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.analysisJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          game: {
            select: { id: true, whitePlayer: true, blackPlayer: true },
          },
        },
      }),
      this.prisma.analysisJob.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnalysisJobById(id: string) {
    const job = await this.prisma.analysisJob.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        game: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    return job;
  }

  async cancelAnalysisJob(id: string) {
    const job = await this.prisma.analysisJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    if (!['QUEUED', 'RUNNING'].includes(job.status)) {
      throw new BadRequestException('Can only cancel queued or running jobs');
    }

    return this.prisma.analysisJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async retryAnalysisJob(id: string) {
    const job = await this.prisma.analysisJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    if (job.status !== 'FAILED') {
      throw new BadRequestException('Can only retry failed jobs');
    }

    return this.prisma.analysisJob.update({
      where: { id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        retryCount: { increment: 1 },
        analyzedPositions: 0,
        currentMove: null,
      },
    });
  }

  async updateAnalysisJobPriority(id: string, priority: number) {
    const job = await this.prisma.analysisJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    if (priority < 1 || priority > 10) {
      throw new BadRequestException('Priority must be between 1 and 10');
    }

    return this.prisma.analysisJob.update({
      where: { id },
      data: { priority },
    });
  }

  // ==================== STATISTICS ====================

  async getUserStatistics(userId: string) {
    return this.prisma.userStatistics.findMany({
      where: { userId },
      orderBy: [{ periodType: 'asc' }, { periodStart: 'desc' }],
    });
  }

  async getOpeningStatistics(userId: string) {
    return this.prisma.openingStatistics.findMany({
      where: { userId },
      orderBy: { totalGames: 'desc' },
      take: 50,
    });
  }

  async recalculateStatistics(userId: string) {
    // This would trigger a background job to recalculate statistics
    // For now, just return success
    return { success: true, message: 'Statistics recalculation queued' };
  }
}

