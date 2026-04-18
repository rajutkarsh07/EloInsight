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
import { Throttle } from '@nestjs/throttler';
import { AuthService, AuthUser } from '../auth/auth.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminService } from './admin.service';

/**
 * All admin endpoints are gated by the class-level `@AdminOnly()`. New
 * handlers added to this controller are admin-only by default; if a route
 * must be publicly reachable (e.g. admin login), explicitly mark it with
 * `@Public()`.
 */
@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/activity')
  getRecentActivity() {
    return this.adminService.getRecentActivity();
  }

  // ==================== AUTH ====================

  // Tight rate limit on admin login to resist credential stuffing. Tuned to
  // allow a human retrying a typo while blocking automated brute force.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post('auth/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.authenticateAdmin(body.email, body.password);
  }

  @Get('auth/verify')
  async verifyAdmin(@Req() req: Request) {
    const user = req.user as AuthUser;

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

  @Get('users/:id')
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  createUser(
    @Body() body: { username: string; email: string; password: string; emailVerified?: boolean },
  ) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ username: string; email: string; emailVerified: boolean; isActive: boolean }>,
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/soft-delete')
  softDeleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.softDeleteUser(id);
  }

  @Patch('users/:id/restore')
  restoreUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.restoreUser(id);
  }

  // ==================== GAMES ====================

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

  @Get('games/:id')
  getGameById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getGameById(id);
  }

  @Patch('games/:id')
  updateGame(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ openingEco: string; openingName: string; analysisStatus: string }>,
  ) {
    return this.adminService.updateGame(id, body);
  }

  @Delete('games/:id')
  deleteGame(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteGame(id);
  }

  @Post('games/:id/requeue-analysis')
  requeueGameAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.requeueGameAnalysis(id);
  }

  @Post('games/fix-lichess')
  fixLichessGames() {
    return this.adminService.fixLichessGames();
  }

  // ==================== ANALYSIS ====================

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

  @Get('analysis/:id')
  getAnalysisById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAnalysisById(id);
  }

  @Delete('analysis/:id')
  deleteAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteAnalysis(id);
  }

  // ==================== LINKED ACCOUNTS ====================

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

  @Patch('linked-accounts/:id')
  updateLinkedAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { syncEnabled?: boolean },
  ) {
    return this.adminService.updateLinkedAccount(id, body);
  }

  @Delete('linked-accounts/:id')
  deleteLinkedAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteLinkedAccount(id);
  }

  // ==================== SYNC JOBS ====================

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

  @Get('sync-jobs/:id')
  getSyncJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getSyncJobById(id);
  }

  @Post('sync-jobs/:id/cancel')
  cancelSyncJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.cancelSyncJob(id);
  }

  @Post('sync-jobs/:id/retry')
  retrySyncJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.retrySyncJob(id);
  }

  // ==================== ANALYSIS JOBS ====================

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

  @Get('analysis-jobs/:id')
  getAnalysisJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAnalysisJobById(id);
  }

  @Post('analysis-jobs/:id/cancel')
  cancelAnalysisJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.cancelAnalysisJob(id);
  }

  @Post('analysis-jobs/:id/retry')
  retryAnalysisJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.retryAnalysisJob(id);
  }

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

  @Get('statistics/users/:userId')
  getUserStatistics(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getUserStatistics(userId);
  }

  @Get('statistics/openings/:userId')
  getOpeningStatistics(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getOpeningStatistics(userId);
  }

  @Post('statistics/recalculate/:userId')
  recalculateStatistics(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.recalculateStatistics(userId);
  }
}
