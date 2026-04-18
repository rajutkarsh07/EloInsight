import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UserRole } from '../auth/auth.types';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  // ==================== DASHBOARD ====================

  @AdminOnly()
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @AdminOnly()
  @Get('dashboard/activity')
  getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  // ==================== AUTH ====================

  @Post('auth/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.authenticateAdmin(body.email, body.password);
  }

  @AdminOnly()
  @Get('auth/verify')
  async verifyAdmin(@Req() req: Request) {
    const user = req.user as {
      id: string;
      email: string;
      username: string;
      role: UserRole;
    };

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  // ==================== USERS ====================

  @AdminOnly()
  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @AdminOnly()
  @Get('users/:id')
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @AdminOnly()
  @Post('users')
  createUser(
    @Body() body: { username: string; email: string; password: string; emailVerified?: boolean },
  ) {
    return this.adminService.createUser(body);
  }

  @AdminOnly()
  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ username: string; email: string; emailVerified: boolean; isActive: boolean }>,
  ) {
    return this.adminService.updateUser(id, body);
  }

  @AdminOnly()
  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  @AdminOnly()
  @Patch('users/:id/soft-delete')
  softDeleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.softDeleteUser(id);
  }

  @AdminOnly()
  @Patch('users/:id/restore')
  restoreUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.restoreUser(id);
  }

  // ==================== GAMES ====================

  @AdminOnly()
  @Get('games')
  getGames(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('platform') platform?: string,
    @Query('analysisStatus') analysisStatus?: string,
  ) {
    return this.adminService.getGames({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      platform,
      analysisStatus,
    });
  }

  @AdminOnly()
  @Get('games/:id')
  getGameById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getGameById(id);
  }

  @AdminOnly()
  @Patch('games/:id')
  updateGame(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ openingEco: string; openingName: string; analysisStatus: string }>,
  ) {
    return this.adminService.updateGame(id, body);
  }

  @AdminOnly()
  @Delete('games/:id')
  deleteGame(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteGame(id);
  }

  @AdminOnly()
  @Post('games/:id/requeue-analysis')
  requeueGameAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.requeueGameAnalysis(id);
  }

  @AdminOnly()
  @Post('games/fix-lichess')
  fixLichessGames() {
    return this.adminService.fixLichessGames();
  }

  // ==================== ANALYSIS ====================

  @AdminOnly()
  @Get('analysis')
  getAnalyses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('gameId') gameId?: string,
  ) {
    return this.adminService.getAnalyses({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      gameId,
    });
  }

  @AdminOnly()
  @Get('analysis/:id')
  getAnalysisById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAnalysisById(id);
  }

  @AdminOnly()
  @Delete('analysis/:id')
  deleteAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteAnalysis(id);
  }

  // ==================== LINKED ACCOUNTS ====================

  @AdminOnly()
  @Get('linked-accounts')
  getLinkedAccounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('platform') platform?: string,
  ) {
    return this.adminService.getLinkedAccounts({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      platform,
    });
  }

  @AdminOnly()
  @Patch('linked-accounts/:id')
  updateLinkedAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { syncEnabled?: boolean },
  ) {
    return this.adminService.updateLinkedAccount(id, body);
  }

  @AdminOnly()
  @Delete('linked-accounts/:id')
  deleteLinkedAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteLinkedAccount(id);
  }

  // ==================== SYNC JOBS ====================

  @AdminOnly()
  @Get('sync-jobs')
  getSyncJobs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getSyncJobs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      status,
    });
  }

  @AdminOnly()
  @Get('sync-jobs/:id')
  getSyncJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getSyncJobById(id);
  }

  @AdminOnly()
  @Post('sync-jobs/:id/cancel')
  cancelSyncJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.cancelSyncJob(id);
  }

  @AdminOnly()
  @Post('sync-jobs/:id/retry')
  retrySyncJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.retrySyncJob(id);
  }

  // ==================== ANALYSIS JOBS ====================

  @AdminOnly()
  @Get('analysis-jobs')
  getAnalysisJobs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAnalysisJobs({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      status,
    });
  }

  @AdminOnly()
  @Get('analysis-jobs/:id')
  getAnalysisJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAnalysisJobById(id);
  }

  @AdminOnly()
  @Post('analysis-jobs/:id/cancel')
  cancelAnalysisJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.cancelAnalysisJob(id);
  }

  @AdminOnly()
  @Post('analysis-jobs/:id/retry')
  retryAnalysisJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.retryAnalysisJob(id);
  }

  @AdminOnly()
  @Patch('analysis-jobs/:id')
  updateAnalysisJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { priority?: number },
  ) {
    if (body.priority !== undefined) {
      return this.adminService.updateAnalysisJobPriority(id, body.priority);
    }
    return { success: false, message: 'No valid updates provided' };
  }

  // ==================== STATISTICS ====================

  @AdminOnly()
  @Get('statistics/users/:userId')
  getUserStatistics(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getUserStatistics(userId);
  }

  @AdminOnly()
  @Get('statistics/openings/:userId')
  getOpeningStatistics(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getOpeningStatistics(userId);
  }

  @AdminOnly()
  @Post('statistics/recalculate/:userId')
  recalculateStatistics(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.recalculateStatistics(userId);
  }
}
