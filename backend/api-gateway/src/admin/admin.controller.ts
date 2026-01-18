import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// In production, you'd want an AdminGuard that checks for admin role
@Controller('admin')
// Remove JwtAuthGuard for now to allow admin login without token
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Post('auth/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    // In production, this would verify admin credentials
    // For now, it uses the same auth service
    return { accessToken: 'admin_token_placeholder' };
  }

  @Get('auth/verify')
  async verifyAdmin() {
    return { valid: true };
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
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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

  // ==================== ANALYSIS ====================

  @Get('analysis')
  getAnalyses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('gameId') gameId?: string,
  ) {
    return this.adminService.getAnalyses({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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

